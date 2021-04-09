app = angular.module('Dashboard');

//
// WarrantsController
//
app.controller('WarrantsController', function ($scope, SharedService, DTOptionsBuilder, DTColumnBuilder, $compile, $timeout) {
  DEBUG.log("WarrantsController here!!!");

  var credentials = {
    accessKey: SharedService.getAwsCredentials().accessKeyId,
    secretKey: SharedService.getAwsCredentials().secretAccessKey,
    region: SharedService.getAwsCredentials().region,
  };
  $scope.warrantList = [];
  $scope.vm = {};
  $scope.vm.dtInstance = {};
  $scope.vm.dtOptions = DTOptionsBuilder.newOptions().withOption('order', [0, 'asc']);
  $scope.estimatedPrices = {};
  $scope.cachedEstimatedPrices = {};

  $scope.openEstimatedPriceEditor = function (warrant) {
    DEBUG.log('openEstimatedPriceEditor');
    warrant.editor.estimatedPrice.editMode = true;
  };

  $scope.cancelEstimatedPriceEditor = function (warrant) {
    DEBUG.log('closeEstimatedPriceEditor');
    warrant.editor.estimatedPrice.editMode = false;
    warrant.editor.estimatedPrice.newPrice = null;
    warrant.editor.estimatedPrice.newProfit = null;
  };

  $scope.editEstimatedPrice = function (warrant) {
    DEBUG.log('editEstimatedPrice');
    let warrantEstimatedPrice = (warrant.editor.estimatedPrice.newPrice - warrant.exercisePrice) / warrant.ratio;
    warrant.editor.estimatedPrice.newProfit = (warrantEstimatedPrice / warrant.price - 1) * 100;
  };

  $scope.saveEstimatedPrice = function (warrant) {
    DEBUG.log('saveEstimatedPrice');
    if (warrant.estimatedPrice != warrant.editor.estimatedPrice.newPrice) {
      $scope.cachedEstimatedPrices[warrant.name] = warrant.editor.estimatedPrice.newPrice;
      warrant.estimatedPrice = warrant.editor.estimatedPrice.newPrice;
      warrant.estimatedProfit = warrant.editor.estimatedPrice.newProfit;
      $scope.readToPost = true;
    }
    warrant.editor.estimatedPrice.editMode = false;
    warrant.editor.estimatedPrice.newPrice = null;
    warrant.editor.estimatedPrice.newProfit = null;
    DEBUG.log($scope.cachedEstimatedPrices);
  };

  apigClientFactory.newClient(credentials).dashboardGet({}, {}, {})
    .catch(function (error) {
      DEBUG.log(error.message || JSON.stringify(error));
    })
    .then(function (response) {
      if (!response || !response.data) {
        DEBUG.log('dashboardGet returned empty response !!!');
      } else {
        DEBUG.log('dashboardGet returned data !!!');
        DEBUG.log(response);
        var warrants = response.data.warrants;
        for (let i = 0; i < warrants.length; i++) {
          let iWarrant = {
            "name": warrants[i].warrant,
            "expirationDate": warrants[i].expirationDate,
            "exercisePrice": warrants[i].exercisePrice,
            "ratio": warrants[i].ratio,
            "provider": warrants[i].provider,
            "sharePrice": warrants[i].sharePrice,
            "volume": warrants[i].volume,
            "foreignBuy": warrants[i].foreignBuy,
            "price": warrants[i].price,
            "estimatedPrice": warrants[i].estimatedPrice,
            "editor": {
              estimatedPrice: {
                editMode: false,
                newPrice: null,
                newProfit: null,
              },
            },
          };
          iWarrant.breakEvenPrice = (iWarrant.price * iWarrant.ratio + iWarrant.exercisePrice).toFixed(2);
          if (iWarrant.estimatedPrice) {
            let iWarrantEstimatedPrice = (iWarrant.estimatedPrice - iWarrant.exercisePrice) / iWarrant.ratio;
            iWarrant.estimatedProfit = (iWarrantEstimatedPrice / iWarrant.price - 1) * 100;
          }
          $scope.warrantList.push(iWarrant);
          if (iWarrant.estimatedPrice) {
            $scope.estimatedPrices[iWarrant.name] = iWarrant.estimatedPrice;
            $scope.cachedEstimatedPrices[iWarrant.name] = iWarrant.estimatedPrice;
          }
        }
      }
    })
    .finally(function () {
      DEBUG.log('dashboardGet done !!!');
      $scope.$apply();
    });

  $scope.estimatedPricePost = function () {
    if (!$scope.readToPost) {
      DEBUG.log('estimatedPricePost: Nothing to Update!');
      return null;
    }
    let dataToPost = {};
    DEBUG.log($scope.cachedEstimatedPrices);
    DEBUG.log($scope.estimatedPrices);
    for (let iWarrantName in $scope.cachedEstimatedPrices) {
      DEBUG.log(iWarrantName);
      if ($scope.cachedEstimatedPrices.hasOwnProperty(iWarrantName)) {
        DEBUG.log('$scope.cachedEstimatedPrices.hasOwnProperty(iWarrantName)');
        if ($scope.estimatedPrices.hasOwnProperty(iWarrantName)) {
          DEBUG.log('$scope.estimatedPrices.hasOwnProperty(iWarrantName)');
          DEBUG.log($scope.estimatedPrices);
          DEBUG.log($scope.cachedEstimatedPrices);

          if ($scope.estimatedPrices[iWarrantName] != $scope.cachedEstimatedPrices[iWarrantName]) {
            dataToPost[iWarrantName] = $scope.cachedEstimatedPrices[iWarrantName];
          }
          DEBUG.log(dataToPost);
        } else {
          dataToPost[iWarrantName] = $scope.cachedEstimatedPrices[iWarrantName];
          DEBUG.log(dataToPost);
        }
      }
    }
    if (Object.keys(dataToPost).length == 0) {
      DEBUG.log('estimatedPricePost: Data has no change!');
      $scope.readToPost = false;
      return null;
    }
    apigClientFactory.newClient(credentials).estimatedPricePost({}, { prices: dataToPost }, {})
      .catch(function (error) {
        DEBUG.log(error.message || JSON.stringify(error));
      })
      .then(function (response) {
        if (!response || !response.data) {
          DEBUG.log('estimatedPricesPost returned empty response !!!');
        } else {
          $scope.estimatedPrices = $scope.cachedEstimatedPrices;
        }
      })
      .finally(function () {
        $scope.readToPost = false;
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
          var warrants = response.data.warrants;
          $scope.warrantList = [];
          for (let i = 0; i < warrants.length; i++) {
            let iWarrant = {
              "name": warrants[i].warrant,
              "expirationDate": warrants[i].expirationDate,
              "exercisePrice": warrants[i].exercisePrice,
              "ratio": warrants[i].ratio,
              "provider": warrants[i].provider,
              "sharePrice": warrants[i].sharePrice,
              "volume": warrants[i].volume,
              "foreignBuy": warrants[i].foreignBuy,
              "price": warrants[i].price,
              "estimatedEditor": false,
              "editor": {
                estimatedPrice: {
                  editMode: false,
                  newPrice: null,
                  newProfit: null,
                },
              },  
            };
            iWarrant.breakEvenPrice = (iWarrant.price * iWarrant.ratio + iWarrant.exercisePrice).toFixed(2);
            let iEstimatedPrice = getProperty($scope.cachedEstimatedPrices, iWarrant.name);
            if (iEstimatedPrice) {
              iWarrant.estimatedPrice = iEstimatedPrice;
              let iWarrantEstimatedPrice = (iEstimatedPrice - iWarrant.exercisePrice) / iWarrant.ratio;
              iWarrant.estimatedProfit = (iWarrantEstimatedPrice / iWarrant.price - 1) * 100;
            }
            $scope.warrantList.push(iWarrant);
          }
        }
      })
      .finally(function () {
        DEBUG.log('reloadWarrantInfo done !!!');
        $scope.$apply();
      });
  };

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





  // $scope.IntervalTime = 2000;
  // $scope.updatedData = 0;
  // function timeoutFn() {
  //     $timeout(function () {
  //         //Add your select data query here
  //         $scope.updatedData++;
  //         timeoutFn();
  //     }, $scope.IntervalTime);
  // }
  // timeoutFn();

});