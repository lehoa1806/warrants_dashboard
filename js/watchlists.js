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
    delete Object.assign(GlobalService.cache.watchlists, { [$scope.watchlistNewName]: GlobalService.cache.watchlists[$scope.watchlistName] })[$scope.watchlistName];
    GlobalService.cache.watchlists[$scope.watchlistNewName].warrant = $scope.watchlistNewName;
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
  $scope.vm.dtInstances = {};
  $scope.vm.dtOptions = DTOptionsBuilder.newOptions()
    .withOption('order', [0, 'asc'])
    .withOption('destroy', true)
    .withOption('responsive', true)
    .withOption('deferRender', true)
    .withOption('processing', true)
    .withDisplayLength(100);
  $scope.watchlists = [];
  $scope.portfolio = [];

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
        loadWatchlists($scope, GlobalService);
        loadPortfolio($scope, GlobalService);
      })
      .catch(function (error) { DEBUG.log(error); GlobalService.debug.error(error); })
      .finally(function () {
        if ($scope.refresh) $scope.intervalSeconds = $scope.refresh * 60;
        reloading = false;
        $scope.$apply();
        $scope.activeIndex = $scope.currActive;
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
  = Estimated price editors                                                                                            =
  ======================================================================================================================
  */
  $scope.updateEstimatedPrices = function () {
    GlobalService.apis.updateEstimatedPrices()
      .catch(function (error) { DEBUG.log(error); GlobalService.debug.error(error); })
  }

  function resetEditor(warrant) {
    warrant.editor.estimatedPrice = {
      editMode: false,
      newSharePrice: null,
      newShareProfit: null,
      newWarrantPrice: null,
      newWarrantProfit: null,
    };
  }
  $scope.openEstimatedPriceEditor = function (warrant) {
    DEBUG.log('openEstimatedPriceEditor');
    warrant.editor.estimatedPrice.editMode = true;
  };
  $scope.cancelEstimatedPriceEditor = function (warrant) {
    DEBUG.log('closeEstimatedPriceEditor');
    resetEditor(warrant);
  };
  $scope.editEstimatedPrice = function (warrant) {
    DEBUG.log('editEstimatedPrice');
    warrant.editor.estimatedPrice.newWarrantPrice = (parseFloat(warrant.editor.estimatedPrice.newSharePrice) - warrant.exercisePrice) / warrant.ratio;
    warrant.editor.estimatedPrice.newWarrantProfit = (warrant.editor.estimatedPrice.newWarrantPrice / warrant.price - 1) * 100;
    warrant.editor.estimatedPrice.newShareProfit = (warrant.editor.estimatedPrice.newSharePrice / warrant.sharePrice - 1) * 100;
  };
  $scope.saveEstimatedPrice = function (warrant) {
    DEBUG.log('saveEstimatedPrice');
    if (warrant.editor.estimatedPrice.newSharePrice) {
      let newSharePrice = parseFloat(warrant.editor.estimatedPrice.newSharePrice);
      if (warrant.shareEstimatedPrice != newSharePrice) {
        GlobalService.cache.cachedEstimatedPrices[warrant.warrant] = newSharePrice;
        warrant.shareEstimatedPrice = newSharePrice;
        warrant.shareEstimatedProfit = (newSharePrice / warrant.sharePrice - 1) * 100;
        warrant.estimatedPrice = warrant.editor.estimatedPrice.newWarrantPrice;
        warrant.estimatedProfit = warrant.editor.estimatedPrice.newWarrantProfit;
        GlobalService.cache.warrants[warrant.warrant].shareEstimatedPrice = warrant.shareEstimatedPrice;
        GlobalService.cache.warrants[warrant.warrant].shareEstimatedProfit = warrant.shareEstimatedProfit;
        GlobalService.cache.warrants[warrant.warrant].estimatedPrice = warrant.estimatedPrice;
        GlobalService.cache.warrants[warrant.warrant].estimatedProfit = warrant.estimatedProfit;
        GlobalService.estimatedPriceToPost();
      }
    }
    resetEditor(warrant);
  };

  /*
  ======================================================================================================================
  = Warrant Info Popup                                                                                                 =
  ======================================================================================================================
  */
  $scope.warrantInfo = function (warrant, id, event) {
    DEBUG.log("warrantInfo here!!!");
    var scope = $scope.$new(true);
    scope.warrant = warrant;
    scope.watchlist = id == 0 ? { watchlist: 'holding' } : $scope.watchlists[id - 1];
    var link = angular.element(event.currentTarget), table = $scope.vm.dtInstances[id].DataTable;
    scope.icon = link.find('.glyphicon');
    scope.tr = link.parent().parent();
    scope.row = table.row(scope.tr);
    if (scope.row.child.isShown()) {
      scope.icon.removeClass('glyphicon-minus-sign').addClass('glyphicon-plus-sign');
      scope.row.child.hide();
      scope.tr.removeClass('shown');
    }
    else {
      scope.icon.removeClass('glyphicon-plus-sign').addClass('glyphicon-minus-sign');
      scope.row.child($compile('<div show-warrant-info></div>')(scope)).show();
      scope.tr.addClass('shown');
    }
  };

  function resetPopupEditor(warrant) {
    warrant.editor.popUpEstimatedPrice = {
      editMode: false,
      newSharePrice: null,
      newShareProfit: null,
      newWarrantPrice: null,
      newWarrantProfit: null,
    };
  }
  $scope.openPopUpEstimatedPriceEditor = function (warrant) {
    DEBUG.log('openPopUpEstimatedPriceEditor');
    warrant.editor.popUpEstimatedPrice.editMode = true;
  };
  $scope.cancelPopUpEstimatedPriceEditor = function (warrant) {
    DEBUG.log('cancelPopUpEstimatedPriceEditor');
    resetPopupEditor(warrant);
  };
  $scope.editPopUpEstimatedPrice = function (warrant) {
    DEBUG.log('editPopUpEstimatedPrice');
    warrant.editor.popUpEstimatedPrice.newWarrantPrice = (parseFloat(warrant.editor.popUpEstimatedPrice.newSharePrice) - warrant.exercisePrice) / warrant.ratio;
    warrant.editor.popUpEstimatedPrice.newWarrantProfit = (warrant.editor.popUpEstimatedPrice.newWarrantPrice / warrant.price - 1) * 100;
    warrant.editor.popUpEstimatedPrice.newShareProfit = (warrant.editor.popUpEstimatedPrice.newSharePrice / warrant.sharePrice - 1) * 100;
  };
  $scope.savePopUpEstimatedPrice = function (warrant) {
    DEBUG.log('savePopUpEstimatedPrice');
    if (warrant.editor.popUpEstimatedPrice.newSharePrice) {
      let newSharePrice = parseFloat(warrant.editor.popUpEstimatedPrice.newSharePrice);
      if (warrant.shareEstimatedPrice != newSharePrice) {
        GlobalService.cache.cachedEstimatedPrices[warrant.warrant] = newSharePrice;
        warrant.shareEstimatedPrice = newSharePrice;
        warrant.shareEstimatedProfit = (newSharePrice / warrant.sharePrice - 1) * 100;
        warrant.estimatedPrice = warrant.editor.popUpEstimatedPrice.newWarrantPrice;
        warrant.estimatedProfit = warrant.editor.popUpEstimatedPrice.newWarrantProfit;
        GlobalService.cache.warrants[warrant.warrant].shareEstimatedPrice = warrant.shareEstimatedPrice;
        GlobalService.cache.warrants[warrant.warrant].shareEstimatedProfit = warrant.shareEstimatedProfit;
        GlobalService.cache.warrants[warrant.warrant].estimatedPrice = warrant.estimatedPrice;
        GlobalService.cache.warrants[warrant.warrant].estimatedProfit = warrant.estimatedProfit;
        GlobalService.estimatedPriceToPost();
      }
    }
    resetPopupEditor(warrant);
  };

  $scope.editPopUpBuyingPrice = function (warrant) {
    DEBUG.log('editPopUpBuyingPrice');
    var shareEstimatedPrice = warrant.editor.popUpEstimatedPrice.newWarrantPrice || warrant.estimatedPrice;
    var buyingPrice = warrant.editor.popUpEstimatedPrice.buyingPrice.price || warrant.price;
    warrant.editor.popUpEstimatedPrice.buyingPrice.profit = (shareEstimatedPrice / buyingPrice - 1) * 100;
  };

  $scope.removeWarrantFromWatchlist = function (warrant) {
    let warrants = getProperty($scope.GlobalService.cache.watchlists, $scope.watchlist, []);
    warrants.pop(warrant.warrant);
    let tWatchlist = {
      name: $scope.watchlist,
      warrants: warrants,
    }
    GlobalService.apis.updateUserInfo(null, [tWatchlist]);
    let message = '"' + warrant.warrant + '" is added "' + $scope.watchlist + '"';
    GlobalService.debug.info(message);
  };

  /*
  ======================================================================================================================
  = Watchlists manage                                                                                                  =
  ======================================================================================================================
  */
  // Multiple Databases
  $scope.setDtInstances = function () {
    $scope.vm.dtInstances[0] = {};
    for (let i = 1; i <= $scope.watchlists.length; i++) {
      $scope.vm.dtInstances[i] = {};
    }
  }

  // Set/store the current active tab
  $scope.currActive = 0;
  $scope.activeIndex = $scope.currActive;
  $scope.setActiveIndex = function (id) {
    $scope.currActive = parseInt(id);
  };

  // Manage Watchlists
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
        for (let iWatchlist of $scope.watchlists) {
          if (iWatchlist.watchlist == watchlist.name) {
            iWatchlist.watchlist = watchlist.newName;
          }
        }
      })
      .catch(function (error) { DEBUG.log(error); GlobalService.debug.error(error); })
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
  let userInfoPromise = (function () {
    if (!GlobalService.cache.portfolio || Object.keys(GlobalService.cache.portfolio).length == 0 || !GlobalService.cache.watchlists || Object.keys(GlobalService.cache.watchlists).length == 0)
      return GlobalService.apis.loadUserInfo();
    else return Promise.resolve();
  })();

  Promise.all([userInfoPromise, warrantInfoPromise])
    .then(function () {
      $scope.history = GlobalService.cache.history;
      loadWatchlists($scope, GlobalService);
      loadPortfolio($scope, GlobalService);
      $scope.setDtInstances();
    })
    .then(function () {
      $scope.refresh = 1;
      $scope.startAutoRefresh();
    })
    .catch(function (error) { DEBUG.log(error); GlobalService.debug.error(error); })
    .finally(function () {
      $scope.$apply();
    });
});