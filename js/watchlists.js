var app = angular.module('Dashboard');

app.controller('WatchlistRenameController', function ($scope, $timeout, $uibModalInstance, watchlistName, GlobalService) {
  $scope.watchlistName = watchlistName;
  $scope.watchlistNewName = null;
  $scope.ok = function () {
    if (!$scope.watchlistNewName || GlobalService.cache.watchlists.hasOwnProperty($scope.watchlistNewName)) {
      DEBUG.log('Invalid Name or already exists! Please choose another name!');
      return;
    }
    let watchlist = {
      name: $scope.watchlistName,
      warrants: GlobalService.cache.watchlists[$scope.watchlistName] || [],
      newName: $scope.watchlistNewName,
    }
    GlobalService.apis.updateUserInfo(null, [watchlist]);
    GlobalService.cache.watchlists[$scope.watchlistName].watchlist = $scope.watchlistNewName;
    $uibModalInstance.close(watchlist);
  };
  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
});


/*
========================================================================================================================
========================================================================================================================
==                                            WatchlistsController                                                    ==
========================================================================================================================
========================================================================================================================
*/
app.controller('WatchlistsController', function ($scope, $state, $compile, $interval, $timeout, $uibModal, GlobalService, DTOptionsBuilder) {
  DEBUG.log("WatchlistsControlle here!!!");
  $scope.$state = $state;
  $scope.GlobalService = GlobalService;
  $scope.vm = {};
  $scope.vm.dtInstance = {};
  $scope.vm.dtOptions = DTOptionsBuilder.newOptions()
    .withOption('order', [0, 'asc'])
    .withOption('destroy', true)
    .withOption('responsive', true)
    .withOption('deferRender', true)
    .withOption('processing', true)
    .withDisplayLength(100);
  $scope.watchlists = [];
  $scope.portfolio = [];
  $scope.history = [];

  /*
  ======================================================================================================================
  = Refresh data                                                                                                       =
  ======================================================================================================================
  */
  $scope.refresh = false;
  $scope.intervalSeconds = false;
  var intervalPromise;
  var reloading = false;

  $scope.reloadWarrantInfo = function () {
    GlobalService.apis.pullRealtimeWarrantInfo()
      .then(function () {
        $scope.warrantList = Object.keys(GlobalService.cache.warrants).map(key => { return GlobalService.cache.warrants[key]; });
      })
      .catch(function (error) { DEBUG.log(error); })
      .finally(function () {
        if ($scope.refresh) $scope.intervalSeconds = $scope.refresh * 60;
        reloading = false;
        $scope.$apply();
      });
  };

  function reloadWarrantInfoWithCountdown() {
    if (reloading) return;
    else if ($scope.intervalSeconds == 0) {
      reloading = true;
      $scope.reloadWarrantInfo();
    } else $scope.intervalSeconds--;
  }
  $scope.startAutoRefresh = function () {
    $scope.stopAutoRefresh();
    if (!$scope.refresh) return;
    $scope.intervalSeconds = $scope.refresh * 60;
    intervalPromise = $interval(reloadWarrantInfoWithCountdown, 1000);
  };
  $scope.stopAutoRefresh = function () {
    $interval.cancel(intervalPromise);
  };
  $scope.$on('$destroy', function () {
    $scope.stopAutoRefresh();
  });

  /*
  ======================================================================================================================
  = Util functions                                                                                                     =
  ======================================================================================================================
  */
  $scope.watchlists = [];
  function loadWatchlists(cache) {
    $scope.watchlists = [];
    DEBUG.log(cache.warrants);
    for (let watchlist in cache.watchlists) {
      if (cache.watchlists.hasOwnProperty(watchlist)) {
        let warrants = [];
        DEBUG.log(cache.watchlists[watchlist]);
        for (let warrant of cache.watchlists[watchlist]) {
          DEBUG.log(warrant);
          DEBUG.log(cache.warrants[warrant]);
          if (cache.warrants.hasOwnProperty(warrant)) {
            warrants.push(cache.warrants[warrant]);
          }
        }
        $scope.watchlists.push({
          watchlist: watchlist,
          warrants: warrants,
        });
        DEBUG.log($scope.watchlists);
      }
    }
  }

  /*
========================================================================================================================
= Watchlists manage                                                                                                    =
========================================================================================================================
*/
  $scope.createNewWatchlist = function () {
    DEBUG.log('Create a new Watchlist');
    var newWatchlist = {
      watchlist: 'New tab ' + ($scope.watchlists.length + 1),
      warrants: [],
    };
    $timeout(function () {
      GlobalService.apis.updateUserInfo(
        null,
        [{
          name: newWatchlist.watchlist,
          warrants: newWatchlist.warrants,
          newName: newWatchlist.watchlist,
        }]);
      $scope.watchlists.push(newWatchlist);
      GlobalService.cache.watchlists[newWatchlist.watchlist] = newWatchlist.warrants;
    });
  };

  $scope.changeWatchlistName = function (watchlistName) {
    var modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'renameWatchlist.html',
      controller: 'WatchlistRenameController',
      resolve: {
        watchlistName: function () {
          return watchlistName;
        }
      }
    });
    modalInstance.result
      .then(function (watchlist) {
        for(let iWatchlist of $scope.watchlists) {
          if (iWatchlist.watchlist == watchlist.name) {
            iWatchlist.watchlist = watchlist.newName;
          }
        }
      })
      .catch(function (error) { DEBUG.log(error); })
  };




  /*
  ======================================================================================================================
  = Load initial data for Watchlists                                                                                   =
  ======================================================================================================================
  */
  let warrantInfoPromise = (function () {
    if (!GlobalService.cache.warrants || Object.keys(GlobalService.cache.warrants).length == 0)
      return GlobalService.apis.loadWarrantInfo();
    else return Promise.resolve();
  })();
  let watchlistsPromise = (function () {
    if (!GlobalService.cache.watchlists || Object.keys(GlobalService.cache.watchlists).length == 0)
      return GlobalService.apis.loadUserInfo();
    else return Promise.resolve();
  })();

  Promise.all([watchlistsPromise, warrantInfoPromise])
    .then(function () {
      $scope.history = GlobalService.cache.history;
      loadWatchlists(GlobalService.cache);
    })
    .catch(function (error) { DEBUG.log(error); })
    .finally(function () {
      $scope.$apply();
    });

});