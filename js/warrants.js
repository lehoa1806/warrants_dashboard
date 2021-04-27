var app = angular.module('Dashboard');


app.controller('AddWarrantToWatchlist', function ($scope, $uibModalInstance, warrant, GlobalService) {
  $scope.warrant = warrant;
  $scope.GlobalService = GlobalService;
  $scope.watchlist = null;
  let message = '';
  $scope.ok = function () {
    if (!$scope.watchlist) {
      message = 'Please select a Watchlist';
      DEBUG.log(message);
      GlobalService.debug.warning(message);
      return;
    }
    let warrants = getProperty($scope.GlobalService.cache.watchlists, $scope.watchlist, []);
    if (warrants.includes(warrant.warrant)) {
      message = '"' + warrant.warrant + '" is already in "' + $scope.watchlist + '"';
      DEBUG.log(message);
      GlobalService.debug.warning(message);
      return;
    }
    warrants.push(warrant.warrant);
    let tWatchlist = {
      name: $scope.watchlist,
      warrants: warrants,
    }
    GlobalService.apis.updateUserInfo(null, {action: 'insert', data: tWatchlist});
    message = '"' + warrant.warrant + '" is added "' + $scope.watchlist + '"';
    GlobalService.debug.info(message);
    $uibModalInstance.close();
  };

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
});

/*
========================================================================================================================
========================================================================================================================
==                                        WarrantsController                                                          ==
========================================================================================================================
========================================================================================================================
*/
app.controller('WarrantsController', function ($scope, $state, $timeout, $compile, $interval, $uibModal, GlobalService, DTOptionsBuilder) {
  DEBUG.log("WarrantsController here!!!");
  $scope.$state = $state;
  $scope.GlobalService = GlobalService;
  $scope.warrantList = [];
  $scope.vm = {};
  $scope.vm.dtInstance = {};
  $scope.vm.dtOptions = DTOptionsBuilder.newOptions()
    .withOption('order', [0, 'asc'])
    .withOption('destroy', true)
    .withOption('responsive', true)
    .withOption('deferRender', true)
    .withOption('processing', true)
    .withDisplayLength(100);

  /*
  ======================================================================================================================
  = Add Warrant to Watchlist                                                                                                   =
  ======================================================================================================================
  */
  $scope.addToWatchList = function (warrant) {
    DEBUG.log('addToWatchList');
    var modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'addWarrantToWatchList.html',
      controller: 'AddWarrantToWatchlist',
      resolve: {
        warrant: function () {
          return warrant;
        }
      }
    });
    modalInstance.result.then(function () {
    }, function () {
      DEBUG.log('Modal dismissed at: ' + new Date());
    });
  };

  /*
  ======================================================================================================================
  = Filter                                                                                                             =
  ======================================================================================================================
  */
  $scope.warrantFilter = { startDate: null, endDate: null, profitLow: null, profitHigh: null };
  var rendering = false;
  var renderCallback = function () {
    rendering = true;
  }
  var render = function () {
    if ($scope.vm.dtInstance.rerender && !rendering) {
      $scope.vm.dtInstance.rerender(renderCallback);
    }
  };
  $scope.applyFilter = function () {
    if ($scope.warrantFilter.startDate == '' || $scope.warrantFilter.startDate == 'Invalid date') {
      $scope.warrantFilter.startDate = null;
    }
    if ($scope.warrantFilter.endDate == '' || $scope.warrantFilter.endDate == 'Invalid date') {
      $scope.warrantFilter.endDate = null;
    }
    if ($scope.warrantFilter.profitLow == '') {
      $scope.warrantFilter.profitLow = null;
    }
    if ($scope.warrantFilter.profitHigh == '') {
      $scope.warrantFilter.profitHigh = null;
    }
    render();
  }
  $scope.resetFilter = function () {
    $scope.warrantFilter = { startDate: null, endDate: null, profitLow: null, profitHigh: null };
    render();
  }

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
  $scope.warrantInfo = function (warrant, event) {
    DEBUG.log("warrantInfo here!!!");
    var scope = $scope.$new(true);
    scope.warrant = warrant;
    var link = angular.element(event.currentTarget),
      icon = link.find('.glyphicon'),
      tr = link.parent().parent(),
      table = $scope.vm.dtInstance.DataTable,
      row = table.row(tr);
    if (row.child.isShown()) {
      icon.removeClass('glyphicon-minus-sign').addClass('glyphicon-plus-sign');
      row.child.hide();
      tr.removeClass('shown');
    }
    else {
      icon.removeClass('glyphicon-plus-sign').addClass('glyphicon-minus-sign');
      row.child($compile('<div show-warrant-info></div>')(scope)).show();
      tr.addClass('shown');
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

  $scope.addWarrantToWatchlist = function (warrant) {
    let message = '';
    if (!$scope.watchlist) {
      message = 'Please select a Watchlist';
      DEBUG.log(message);
      GlobalService.debug.warning(message);
      return;
    }
    let warrants = getProperty($scope.GlobalService.cache.watchlists, $scope.watchlist, []);
    if (warrants.includes(warrant.warrant)) {
      message = '"' + warrant.warrant + '" is already in "' + $scope.watchlist + '"';
      DEBUG.log(message);
      GlobalService.debug.warning(message);
      return;
    }
    warrants.push(warrant.warrant);
    let tWatchlist = {
      name: $scope.watchlist,
      warrants: warrants,
    }
    GlobalService.apis.updateUserInfo(null, {action: 'insert', data: tWatchlist});
    message = '"' + warrant.warrant + '" is added "' + $scope.watchlist + '"';
    GlobalService.debug.info(message);
  };

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
      .catch(function (error) { DEBUG.log(error); GlobalService.debug.error(error); })
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
  = Load initial data for Warrant dashboard                                                                                                 =
  ======================================================================================================================
  */
  (function () {
    if (!GlobalService.cache.warrants || Object.keys(GlobalService.cache.warrants).length == 0)
      return GlobalService.apis.loadWarrantInfo();
    else return Promise.resolve();
  })()
    .then(function () {
      $scope.warrantList = Object.keys(GlobalService.cache.warrants).map(key => { return GlobalService.cache.warrants[key]; });
    })
    .catch(function (error) { DEBUG.log(error); GlobalService.debug.error(error); })
    .finally(function () {
      $scope.$apply();
    });
});