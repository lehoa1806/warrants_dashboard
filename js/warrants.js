app = angular.module('Dashboard');

/*
========================================================================================================================
========================================================================================================================
==                                        WarrantsController                                                          ==
========================================================================================================================
========================================================================================================================
*/
app.controller('WarrantsController', function ($scope, GlobalService, DTOptionsBuilder, $compile, $interval) {
  DEBUG.log("WarrantsController here!!!");
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
  = APIs                                                                                                               =
  ======================================================================================================================
  */
  $scope.estimatedPricePost = GlobalService.apis.saveEstimatedPrices;
  $scope.reloadWarrantInfo = function () {
    GlobalService.apis.loadWarrants().then(() => function () {
      $scope.warrantList = GlobalService.cache.warrants;
      if ($scope.refresh) $scope.intervalSeconds = $scope.refresh * 60;
      $scope.$apply();
    }()
    );
  };
  $scope.getDashboard = function () {
    GlobalService.apis.getDashboard().then(() => function () {
      $scope.warrantList = GlobalService.cache.warrants;
      if ($scope.refresh) $scope.intervalSeconds = $scope.refresh * 60;
      $scope.$apply();
    }()
    );
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

  /*
  ======================================================================================================================
  = Estimated price editors                                                                                            =
  ======================================================================================================================
  */
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
    warrant.editor.estimatedPrice.shareEstimatedProfit = (warrant.editor.estimatedPrice.newSharePrice / warrant.sharePrice - 1) * 100;
  };
  $scope.saveEstimatedPrice = function (warrant) {
    DEBUG.log('saveEstimatedPrice');
    if (warrant.editor.estimatedPrice.newSharePrice) {
      newSharePrice = parseFloat(warrant.editor.estimatedPrice.newSharePrice);
      if (warrant.shareEstimatedPrice != newSharePrice) {
        GlobalService.cache.cachedEstimatedPrices[warrant.name] = newSharePrice;
        warrant.shareEstimatedPrice = newSharePrice;
        warrant.shareEstimatedProfit = (newSharePrice / warrant.sharePrice - 1) * 100;
        warrant.estimatedPrice = warrant.editor.estimatedPrice.newWarrantPrice;
        warrant.estimatedProfit = warrant.editor.estimatedPrice.newWarrantProfit;
        GlobalService.estimatedPriceToPost();
      }
    }
    resetEditor(warrant);
  };

  /*
  ======================================================================================================================
  = PopUp Estimated price editors                                                                                      =
  ======================================================================================================================
  */
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
      newSharePrice = parseFloat(warrant.editor.popUpEstimatedPrice.newSharePrice);
      if (warrant.shareEstimatedPrice != newSharePrice) {
        GlobalService.cache.cachedEstimatedPrices[warrant.name] = newSharePrice;
        warrant.shareEstimatedPrice = newSharePrice;
        warrant.shareEstimatedProfit = (newSharePrice / warrant.sharePrice - 1) * 100;
        warrant.estimatedPrice = warrant.editor.popUpEstimatedPrice.newWarrantPrice;
        warrant.estimatedProfit = warrant.editor.popUpEstimatedPrice.newWarrantProfit;
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
  = Warrant chart - ChartJS init                                                                                       =
  ======================================================================================================================
  */

  /*
  ======================================================================================================================
  = Load the dashboard                                                                                                 =
  ======================================================================================================================
  */
  if ($scope.warrantList.length == 0) $scope.getDashboard();
});
