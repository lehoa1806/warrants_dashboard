var app = angular.module('Dashboard');

/*
========================================================================================================================
========================================================================================================================
==                                            WatchlistsController                                                    ==
========================================================================================================================
========================================================================================================================
*/
app.controller('WatchlistsController', function ($scope, $state, GlobalService, DTOptionsBuilder, $interval) {
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
  function loadWatchlists(cache) {
    $scope.watchlists = [];
    for (let watchlist in cache.watchlists) {
      if (cache.watchlists.hasOwnProperty(watchlist)) {
        let iWatchlist = cache.watchlists[watchlist];
        let eachWatchlist = [];
        for (let warrant in iWatchlist.warrants) {
          eachWatchlist.push(GlobalService.cache.warrants[warrant]);
        }
        $scope.watchlists.push(eachWatchlist);
      }
    }
  }
  
  /*
  ======================================================================================================================
  = Load initial data for Watchlists                                                                                   =
  ======================================================================================================================
  */
  let historyPromise = (function () {
    if (!GlobalService.cache.history || GlobalService.cache.history.length == 0)
      return GlobalService.apis.loadTradingHistory();
    else return Promise.resolve();
  })();
  let warrantInfoPromise = (function () {
    if (!GlobalService.cache.warrants || Object.keys(GlobalService.cache.warrants).length == 0)
      return GlobalService.apis.loadWarrantInfo();
    else return Promise.resolve();
  })();
  let portfolioPromise = (function () {
    if (!GlobalService.cache.portfolio || Object.keys(GlobalService.cache.portfolio).length == 0)
      return GlobalService.apis.loadUserInfo();
    else return Promise.resolve();
  })();

  Promise.all([historyPromise, portfolioPromise, warrantInfoPromise])
    .then(function () {
      $scope.history = GlobalService.cache.history;
      loadPortfolio(GlobalService.cache);
      loadStats();
    })
    .catch(function (error) { DEBUG.log(error); })
    .finally(function () {
      $scope.$apply();
    });
});