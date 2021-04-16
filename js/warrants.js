app = angular.module('Dashboard');

/*
========================================================================================================================
========================================================================================================================
==                                        WarrantsController                                                          ==
========================================================================================================================
========================================================================================================================
*/
app.controller('WarrantsController', function ($scope, SharedService, DTOptionsBuilder, DTColumnBuilder, $compile, $interval) {
  DEBUG.log("WarrantsController here!!!");
  var credentials = {
    accessKey: SharedService.getAwsCredentials().accessKeyId,
    secretKey: SharedService.getAwsCredentials().secretAccessKey,
    region: SharedService.getAwsCredentials().region,
  };
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
  $scope.estimatedPricePost = function () {
    if (!SharedService.estimatedReadyToPost) {
      DEBUG.log('estimatedPricePost: Nothing to Update!');
      return;
    }
    let dataToPost = {};
    for (let iWarrantName in SharedService.cachedEstimatedPrices) {
      if (SharedService.cachedEstimatedPrices.hasOwnProperty(iWarrantName)) {
        if (SharedService.estimatedPrices.hasOwnProperty(iWarrantName)) {
          if (SharedService.estimatedPrices[iWarrantName] != SharedService.cachedEstimatedPrices[iWarrantName]) {
            dataToPost[iWarrantName] = SharedService.cachedEstimatedPrices[iWarrantName];
          }
        } else {
          dataToPost[iWarrantName] = SharedService.cachedEstimatedPrices[iWarrantName];
        }
      }
    }
    if (Object.keys(dataToPost).length == 0) {
      DEBUG.log('estimatedPricePost: Data has no change!');
      return;
    }
    apigClientFactory.newClient(credentials).estimatedPricePost({}, { prices: dataToPost }, {})
      .catch(function (error) {
        DEBUG.log(error.message || JSON.stringify(error));
      })
      .then(function (response) {
        if (!response || !response.data) {
          DEBUG.log('estimatedPricesPost returned empty response !!!');
        } else {
          SharedService.estimatedPrices = SharedService.cachedEstimatedPrices;
        }
      })
      .finally(function () {
        SharedService.estimatedReadyToPost = false;
        DEBUG.log('estimatedPricesPost: Done !!!');
      });
  };

  $scope.reloadWarrantInfo = function () {
    apigClientFactory.newClient(credentials).infoGet({}, {}, {})
      .catch(function (error) {
        DEBUG.log(error.message || JSON.stringify(error));
      })
      .then(function (response) {
        if (!response || !response.data) {
          DEBUG.log('infoGet returned empty response !!!');
        } else {
          let warrants = response.data.warrants;
          $scope.warrantList = [];
          for (let i = 0; i < warrants.length; i++) {
            let iWarrant = {
              "name": warrants[i].warrant,
              "expirationDate": warrants[i].expirationDate,
              "exercisePrice": warrants[i].exercisePrice,
              "ratio": parseFloat(warrants[i].exerciseRatio),
              "provider": warrants[i].provider,
              "sharePrice": warrants[i].sharePrice,
              "volume": warrants[i].volume,
              "foreignBuy": warrants[i].foreignBuy,
              "referencePrice": warrants[i].referencePrice,
              "price": warrants[i].price,
              'estimatedPrice': null,
              "shareEstimatedPrice": warrants[i].estimatedPrice,
              "editor": {
                estimatedPrice: {
                  editMode: false,
                  newSharePrice: null,
                  newShareProfit: null,
                  newWarrantPrice: null,
                  newWarrantProfit: null,
                },
                popUpEstimatedPrice: {
                  editMode: false,
                  newSharePrice: null,
                  newShareProfit: null,
                  newWarrantPrice: null,
                  newWarrantProfit: null,
                },
                buyingPrice: {
                  price: null,
                  profit: null,
                },
              },
            };
            iWarrant.upDown = (iWarrant.price / iWarrant.referencePrice - 1) * 100;
            iWarrant.breakEvenPrice = iWarrant.price * iWarrant.ratio + iWarrant.exercisePrice;
            iWarrant.currentProfit = (1 - iWarrant.breakEvenPrice / iWarrant.sharePrice) * 100;
            let iShareEstimatedPrice = getProperty(SharedService.cachedEstimatedPrices, iWarrant.name);
            if (iShareEstimatedPrice) { iWarrant.shareEstimatedPrice = iShareEstimatedPrice; }
            if (iWarrant.shareEstimatedPrice) {
              iWarrant.shareEstimatedProfit = (iWarrant.shareEstimatedPrice / iWarrant.sharePrice - 1) * 100;
              iWarrant.estimatedPrice = (iWarrant.shareEstimatedPrice - iWarrant.exercisePrice) / iWarrant.ratio;
              iWarrant.estimatedProfit = (iWarrant.estimatedPrice / iWarrant.price - 1) * 100;
            }
            $scope.warrantList.push(iWarrant);
          }
        }
      })
      .finally(function () {
        DEBUG.log('reloadWarrantInfo done !!!');
        if ($scope.refresh) $scope.intervalSeconds = $scope.refresh * 60;
        reloading = false;
        $scope.$apply();
      });
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
        SharedService.cachedEstimatedPrices[warrant.name] = newSharePrice;
        warrant.shareEstimatedPrice = newSharePrice;
        warrant.shareEstimatedProfit = (newSharePrice / warrant.sharePrice - 1) * 100;
        warrant.estimatedPrice = warrant.editor.estimatedPrice.newWarrantPrice;
        warrant.estimatedProfit = warrant.editor.estimatedPrice.newWarrantProfit;
        SharedService.estimatedPriceToPost();
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
        SharedService.cachedEstimatedPrices[warrant.name] = newSharePrice;
        warrant.shareEstimatedPrice = newSharePrice;
        warrant.shareEstimatedProfit = (newSharePrice / warrant.sharePrice - 1) * 100;
        warrant.estimatedPrice = warrant.editor.popUpEstimatedPrice.newWarrantPrice;
        warrant.estimatedProfit = warrant.editor.popUpEstimatedPrice.newWarrantProfit;
        SharedService.estimatedPriceToPost();
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
  apigClientFactory.newClient(credentials).dashboardGet({}, {}, {})
    .catch(function (error) {
      DEBUG.log(error.message || JSON.stringify(error));
    })
    .then(function (response) {
      if (!response || !response.data) {
        DEBUG.log('dashboardGet returned empty response !!!');
      } else {
        DEBUG.log('dashboardGet returned data !!!');
        var warrants = response.data.warrants;
        for (let i = 0; i < warrants.length; i++) {
          let iWarrant = {
            "name": warrants[i].warrant,
            "expirationDate": warrants[i].expirationDate,
            "exercisePrice": warrants[i].exercisePrice,
            "ratio": parseFloat(warrants[i].exerciseRatio),
            "provider": warrants[i].provider,
            "sharePrice": warrants[i].sharePrice,
            "volume": warrants[i].volume,
            "foreignBuy": warrants[i].foreignBuy,
            "referencePrice": warrants[i].referencePrice,
            "price": warrants[i].price,
            'estimatedPrice': null,
            "shareEstimatedPrice": warrants[i].estimatedPrice, /* ---- change the function -- update it */
            "editor": {
              estimatedPrice: {
                editMode: false,
                newSharePrice: null,
                newShareProfit: null,
                newWarrantPrice: null,
                newWarrantProfit: null,
              },
              popUpEstimatedPrice: {
                editMode: false,
                newSharePrice: null,
                newShareProfit: null,
                newWarrantPrice: null,
                newWarrantProfit: null,
              },
              buyingPrice: {
                price: null,
                profit: null,
              },
            },
          };
          iWarrant.upDown = (iWarrant.price / iWarrant.referencePrice - 1) * 100;
          iWarrant.breakEvenPrice = iWarrant.price * iWarrant.ratio + iWarrant.exercisePrice;
          iWarrant.currentProfit = (1 - iWarrant.breakEvenPrice / iWarrant.sharePrice) * 100;
          if (iWarrant.shareEstimatedPrice) {
            iWarrant.shareEstimatedProfit = (iWarrant.shareEstimatedPrice / iWarrant.sharePrice - 1) * 100;
            iWarrant.estimatedPrice = (iWarrant.shareEstimatedPrice - iWarrant.exercisePrice) / iWarrant.ratio;
            iWarrant.estimatedProfit = (iWarrant.estimatedPrice / iWarrant.price - 1) * 100;
            SharedService.estimatedPrices[iWarrant.name] = iWarrant.shareEstimatedPrice;
            SharedService.cachedEstimatedPrices[iWarrant.name] = iWarrant.shareEstimatedPrice;
          }
          $scope.warrantList.push(iWarrant);
        }
      }
    })
    .finally(function () {
      DEBUG.log('dashboardGet done !!!');
      $scope.$apply();
    });
});
