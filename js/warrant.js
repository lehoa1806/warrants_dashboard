var app = angular.module('Dashboard');
/*
========================================================================================================================
========================================================================================================================
==                                            WarrantEditorController                                                 ==
========================================================================================================================
========================================================================================================================
*/
app.controller('WarrantEditorController', function ($scope, $state, GlobalService) {
  DEBUG.log("WarrantEditorController here!!!");
  $scope.$state = $state;
  $scope.GlobalService = GlobalService;
  $scope.isRemoveCollapsed = false;

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
    GlobalService.apis.updateUserInfo(null, [tWatchlist]);
    message = '"' + warrant.warrant + '" is added "' + $scope.watchlist + '"';
    GlobalService.debug.info(message);
  };

  $scope.removeWarrantFromWatchlist = function (warrant) {
    let message = '';
    if (!$scope.watchlist.watchlist) {
      message = 'Empty Watchlist ID!!!';
      GlobalService.debug.error(message);
      return;
    }
    let warrants = getProperty($scope.GlobalService.cache.watchlists, $scope.watchlist, []);
    warrants.pop(warrant.warrant);
    $scope.watchlist.warrants.pop(warrant.warrant);
    let tWatchlist = {
      name: $scope.watchlist.watchlist,
      warrants: warrants,
    }
    GlobalService.apis.updateUserInfo(null, [tWatchlist]);
    message = '"' + warrant.warrant + '" is removed from "' + $scope.watchlist.watchlist + '"';
    GlobalService.debug.info(message);
    $scope.icon.removeClass('glyphicon-minus-sign').addClass('glyphicon-plus-sign');
    $scope.row.child.hide();
    $scope.tr.removeClass('shown');
  };
});