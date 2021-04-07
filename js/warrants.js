app = angular.module('Dashboard');

//
// WarrantsController
//
app.controller('WarrantsController', function ($scope, BackgroundService, DTOptionsBuilder, DTColumnBuilder, $compile) {
    DEBUG.log("WarrantsController here!!!");
    $scope.vm = {};
    $scope.vm.dtInstance = {};
    $scope.vm.dtOptions = DTOptionsBuilder.newOptions()
        .withOption('order', [0, 'asc']);

    $scope.warrantInfo = function (warrant, event) {
        DEBUG.log("warrantInfo here!!!");

        var scope = $scope.$new(true);
        scope.warrant = warrant;

        var link = angular.element(event.currentTarget),
            icon = link.find('.glyphicon'),
            tr = link.parent().parent(),
            table = $scope.vm.dtInstance.DataTable,
            row = table.row(tr);
        //
        if (row.child.isShown()) {
            DEBUG.log("row.child.isShown here!!!");

            icon.removeClass('glyphicon-minus-sign').addClass('glyphicon-plus-sign');
            row.child.hide();
            tr.removeClass('shown');
        }
        else {
            DEBUG.log("row.child.isShown not here!!!");

            icon.removeClass('glyphicon-plus-sign').addClass('glyphicon-minus-sign');
            row.child($compile('<div show-warrant-info></div>')(scope)).show();
            tr.addClass('shown');
        }
    }
    warrants = [{
        "name": "CFPT2016",
        "expirationDate": "2021/06/22",
        "exercisePrice": 50000,
        "ratio": 5,
        "provider": "SSI",
        "sharePrice": 79900,
        "volume": 100,
        "foreignBuy": 1000,
        "price": 6240,
    }, {
        "name": "CVHM2006",
        "expirationDate": "2021/06/22",
        "exercisePrice": 84888,
        "ratio": 20,
        "provider": "SSI",
        "sharePrice": 101000,
        "volume": 100,
        "foreignBuy": 1000,
        "price": 1,
    }]
    var warrantEstimatedPrices = BackgroundService.getWarrantEstimatedPrices();
    for (let i = 0; i < warrants.length; i++){
        let iWarrant = warrants[i];
        iWarrant.breakEvenPrice = iWarrant.price * iWarrant.ratio + iWarrant.exercisePrice;
        let iEstimatedPrice = getProperty(warrantEstimatedPrices, iWarrant.name);
        if (iEstimatedPrice) {
            iWarrant.estimatedPrice = iEstimatedPrice;
            let iWarrantEstimatedPrice = (iEstimatedPrice - iWarrant.exercisePrice) / iWarrant.ratio;
            iWarrant.estimatedProfit = (iWarrantEstimatedPrice / iWarrant.price - 1) * 100;
        }
    }
    $scope.warrantList = warrants;

});