app = angular.module('Dashboard');

//
// WarrantsController
//
app.controller('WarrantsController', function ($scope, SharedService, DTOptionsBuilder, DTColumnBuilder, $compile, $timeout) {
    DEBUG.log("WarrantsController here!!!");

    var awsSetting = SharedService.getAwsSetting();
    var apigClient = apigClientFactory.newClient({
        accessKey: awsSetting.accessKeyId,
        secretKey: awsSetting.secretAccessKey,
        region: awsSetting.region,
    });
    $scope.warrantList = [];
    $scope.vm = {};
    $scope.vm.dtInstance = {};
    $scope.vm.dtOptions = DTOptionsBuilder.newOptions().withOption('order', [0, 'asc']);
    $scope.estimatedPrices = null;
    $scope.cachedEstimatedPrices = {};

    apigClient.estimatedPriceGet({}, {}, {})
        .catch(function (error) {
            DEBUG.log(error.message || JSON.stringify(error));
        })
        .then(function (response) {
            if (!response || !response.data) {
                DEBUG.log('estimatedPricesGet returned empty response !!!');
            } else {
                DEBUG.log('estimatedPricesGet returned date !!!');
                DEBUG.log(response);
                $scope.estimatedPrices = response.data.prices;
                $scope.cachedEstimatedPrices = response.data.prices;
            }
        })
        .finally(function () {
            DEBUG.log('estimatedPricesGet done !!!');
            apigClient.infoGet({}, {}, {})
                .catch(function (error) {
                    DEBUG.log(error.message || JSON.stringify(error));
                })
                .then(function (response) {
                    if (!response || !response.data) {
                        DEBUG.log('infoGet returned empty response !!!');
                    } else {
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
                                "estimatedEditor": false,
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
                    DEBUG.log('infoGet done !!!');
                    $scope.$apply();
                });
        });
    
    $scope.getTemporaryProfit = function(newEstimatedPrice, index){
        let warrantTemporaryPrice = (newEstimatedPrice - $scope.warrantList[index].exercisePrice) / $scope.warrantList[index].ratio;
        return (warrantTemporaryPrice / $scope.warrantList[index].price - 1) * 100;
    }
    $scope.openEstimatedPriceEditor = function (index) {
        $scope.warrantList[index].estimatedEditor = true;
    };
    $scope.closeEstimatedPriceEditor = function (index) {
        $scope.warrantList[index].estimatedEditor = false;
    };
    $scope.editEstimatedPrice = function (newEstimatedPrice, index) {
        let warrantName = $scope.warrantList[index].name;
        $scope.cachedEstimatedPrices[warrantName] = newEstimatedPrice;
    };
    $scope.saveEstimatedPrice = function (newEstimatedPrice, index) {
        let warrantName = $scope.warrantList[index].name;
        $scope.cachedEstimatedPrices[warrantName] = newEstimatedPrice;
    };

    $scope.estimatedPricePost = function () {
        let dataToPost = {};
        for (let iWarrantName in $scope.cachedEstimatedPrices) {
            if ($scope.cachedEstimatedPrices.hasOwnProperty(iWarrantName)) {
                if ($scope.estimatedPrices.hasOwnProperty(iWarrantName)) {
                    if ($scope.estimatedPrices[iWarrantName] != $scope.cachedEstimatedPrices[iWarrantName]) {
                        dataToPost[iWarrantName] = $scope.cachedEstimatedPrices[iWarrantName];
                    }
                } else {
                    dataToPost[iWarrantName] = $scope.cachedEstimatedPrices[iWarrantName];
                } 
            }
        }

        apigClient.estimatedPricePost({}, dataToPost, {})
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
            DEBUG.log('estimatedPricesPost done !!!');
        });
    };

    $scope.reloadWarrantInfo = function () {
        apigClient.infoGet({}, {}, {})
        .catch(function (error) {
            DEBUG.log(error.message || JSON.stringify(error));
        })
        .then(function (response) {
            if (!response || !response.data) {
                DEBUG.log('infoGet returned empty response !!!');
            } else {
                var warrants = response.data.warrants;
                for (let i = 0; i < warrants.length; i++) {
                    let iWarrant = {
                        "name": warrants[i].warrant,
                        "expirationDate": warrants[i].expired_date,
                        "exercisePrice": warrants[i].exercise_price,
                        "ratio": warrants[i].exercise_ratio,
                        "provider": warrants[i].provider,
                        "sharePrice": warrants[i].share_price,
                        "volume": warrants[i].volume,
                        "foreignBuy": warrants[i].foreign_buy,
                        "price": warrants[i].price,
                        "estimatedEditor": false,
                    };
                    iWarrant.breakEvenPrice = iWarrant.price * iWarrant.ratio + iWarrant.exercisePrice;
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
            DEBUG.log('infoGet done !!!');
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