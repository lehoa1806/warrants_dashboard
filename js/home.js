var app = angular.module('Dashboard');

/*
========================================================================================================================
========================================================================================================================
==                                            HomeController                                                          ==
========================================================================================================================
========================================================================================================================
*/
app.controller('HomeController', function ($scope, $state, $interval, GlobalService, DTOptionsBuilder) {
  DEBUG.log("HomeController here!!!");
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
        loadPortfolio(GlobalService.cache);
        loadStats();
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
  = Add new trading record                                                                                                 =
  ======================================================================================================================
  */
  $scope.tradingRecord = {
    action: null,
    warrant: null,
    date: null,
    price: null,
    quantity: null,
    recordId: getASimpleRandomString(),
    acquisitionPrice: null,
  };
  $scope.addNewTradingRecord = function () {
    if (!$scope.tradingRecord.warrant || !$scope.tradingRecord.action || !$scope.tradingRecord.date || !$scope.tradingRecord.price || !$scope.tradingRecord.quantity) return;
    let iWarrant = getProperty(GlobalService.cache.portfolio, $scope.tradingRecord.warrant, null);
    if (!iWarrant) {
      if ($scope.tradingRecord.action == 'sell') {
        let message = 'Error!!! Selling nonexisting warrant.';
        DEBUG.log(message);
        GlobalService.debug.error(message);
        return;
      }
      iWarrant = {
        warrant: $scope.tradingRecord.warrant,
        quantity: $scope.tradingRecord.quantity,
        acquisitionPrice: $scope.tradingRecord.price,
      };
      $scope.tradingRecord.acquisitionPrice = $scope.tradingRecord.price;
      GlobalService.cache.portfolio[$scope.tradingRecord.warrant] = iWarrant;
    } else {
      if ($scope.tradingRecord.action == 'sell') {
        if (iWarrant.quantity < $scope.tradingRecord.quantity) {
          let message = 'Error!!! You don\'t have enough shares to sell.';
          DEBUG.log(message);
          GlobalService.debug.error(message);
          return;
        }
        iWarrant.quantity -= $scope.tradingRecord.quantity;
        $scope.tradingRecord.realizedLossProfit = $scope.tradingRecord.quantity * ($scope.tradingRecord.price - iWarrant.acquisitionPrice);
        $scope.tradingRecord.acquisitionPrice = iWarrant.acquisitionPrice;
      } else {
        let priorQuantity = iWarrant.quantity;
        let priorPrice = iWarrant.acquisitionPrice;
        iWarrant.quantity = priorQuantity + $scope.tradingRecord.quantity;
        iWarrant.acquisitionPrice = (priorQuantity * priorPrice + $scope.tradingRecord.quantity * $scope.tradingRecord.price) / (priorQuantity + $scope.tradingRecord.quantity);
        $scope.tradingRecord.acquisitionPrice = iWarrant.acquisitionPrice;
      }
    }
    // Update history and portfolio
    let historyPromise = GlobalService.apis.updateTradingHistory({ action: 'insert', record: $scope.tradingRecord });
    let portfolioPromise = GlobalService.apis.updateUserInfo([iWarrant], null);
    Promise.all([historyPromise, portfolioPromise])
      .then(function () {
        loadPortfolio($scope, GlobalService);
        loadStats($scope);
        GlobalService.cache.history.push($scope.tradingRecord);
        DEBUG.log('$scope.history');
        DEBUG.log($scope.history);
        GlobalService.debug.error($scope.history);
        DEBUG.log('$scope.history');
        $scope.tradingRecord = {
          action: null,
          warrant: null,
          date: null,
          price: null,
          quantity: null,
          recordId: getASimpleRandomString(),
          acquisitionPrice: null,
        };
      })
      .catch(function (error) { DEBUG.log(error); GlobalService.debug.error(error); })
      .finally(function () {
        $scope.$apply();
      });
  };

  /*
======================================================================================================================
= Edit history                                                                                                       =
======================================================================================================================
*/
  $scope.historyEditor = false;
  $scope.tempHistory = {};
  $scope.editHistory = function (record) {
    $scope.tempHistory = angular.copy(record);
  };
  $scope.resetHistory = function (record) {
    record.date = $scope.tempHistory.date;
    record.recordId = $scope.tempHistory.recordId;
    record.warrant = $scope.tempHistory.warrant;
    record.action = $scope.tempHistory.action;
    record.quantity = $scope.tempHistory.quantity;
    record.price = $scope.tempHistory.price;
    record.acquisitionPrice = $scope.tempHistory.acquisitionPrice;
    record.realizedLossProfit = $scope.tempHistory.realizedLossProfit;
    $scope.tempHistory = {};
  };
  $scope.saveHistory = function (record) {
    DEBUG.log("editHistory here!!!");
    if (!record.warrant || !record.action || !record.date || !record.price || !record.quantity) {
      $scope.resetHistory(record);
      return;
    }
    let iWarrant = angular.copy(GlobalService.cache.portfolio[$scope.tempHistory.warrant]);
    if ($scope.tempHistory.action == 'sell') {
      iWarrant.quantity += $scope.tempHistory.quantity;
    } else if ($scope.tempHistory.action == 'buy') {
      let currentMarketVolume = iWarrant.quantity * iWarrant.acquisitionPrice;
      iWarrant.quantity -= $scope.tempHistory.quantity;
      iWarrant.acquisitionPrice = (currentMarketVolume + $scope.tempHistory.quantity * $scope.tempHistory.acquisitionPrice) / iWarrant.acquisitionPrice;
    }
    let nWarrant = getProperty(GlobalService.cache.portfolio, record.warrant, null);
    if (!nWarrant) {
      if (record.action == 'sell') {
        let message = 'Error!!! Selling nonexisting warrant.';
        DEBUG.log(message);
        GlobalService.debug.error(message);
        $scope.resetHistory(record);
        return;
      }
      nWarrant = {
        warrant: record.warrant,
        quantity: record.quantity,
        acquisitionPrice: record.price,
      };
      GlobalService.cache.portfolio[$scope.tempHistory.warrant] = iWarrant;
      record.acquisitionPrice = record.price;
      GlobalService.cache.portfolio[record.warrant] = nWarrant;
    } else {
      if (record.warrant == $scope.tempHistory.warrant) {
        if (record.action == 'sell') {
          if (iWarrant.quantity < record.quantity) {
            let message = 'Error!!! You don\'t have enough shares to sell.';
            DEBUG.log(message);
            GlobalService.debug.error(message);
            $scope.resetHistory(record);
            return;
          }
          GlobalService.cache.portfolio[$scope.tempHistory.warrant] = iWarrant;
          iWarrant.quantity -= record.quantity;
          record.realizedLossProfit = record.quantity * (record.price - iWarrant.acquisitionPrice);
          record.acquisitionPrice = iWarrant.acquisitionPrice;
        } else {
          GlobalService.cache.portfolio[$scope.tempHistory.warrant] = iWarrant;
          let priorQuantity = iWarrant.quantity;
          let priorPrice = iWarrant.acquisitionPrice;
          iWarrant.quantity = priorQuantity + record.quantity;
          iWarrant.acquisitionPrice = (priorQuantity * priorPrice + record.quantity * record.price) / (priorQuantity + record.quantity);
          record.acquisitionPrice = iWarrant.acquisitionPrice;
        }
      } else {
        if (record.action == 'sell') {
          if (iWarrant.quantity < record.quantity) {
            let message = 'Error!!! You don\'t have enough shares to sell.';
            DEBUG.log(message);
            GlobalService.debug.error(message);
            $scope.resetHistory(record);
            return;
          }
          GlobalService.cache.portfolio[$scope.tempHistory.warrant] = iWarrant;
          nWarrant.quantity -= record.quantity;
          record.realizedLossProfit = record.quantity * (record.price - nWarrant.acquisitionPrice);
          record.acquisitionPrice = nWarrant.acquisitionPrice;
        } else {
          GlobalService.cache.portfolio[$scope.tempHistory.warrant] = iWarrant;
          let priorQuantity = nWarrant.quantity;
          let priorPrice = nWarrant.acquisitionPrice;
          nWarrant.quantity = priorQuantity + record.quantity;
          iWarrant.acquisitionPrice = (priorQuantity * priorPrice + record.quantity * record.price) / (priorQuantity + record.quantity);
          record.acquisitionPrice = nWarrant.acquisitionPrice;
        }
      }
      // Update history and portfolio
      let historyPromise = GlobalService.apis.updateTradingHistory({ action: 'insert', record: record });
      let portfolioPromise = GlobalService.apis.updateUserInfo([record], null);
      Promise.all([historyPromise, portfolioPromise])
        .then(function () {
          loadPortfolio($scope, GlobalService);
          loadStats($scope);
          $scope.tempHistory = {};
        })
        .catch(function (error) { DEBUG.log(error); GlobalService.debug.error(error); })
        .finally(function () {
          $scope.$apply();
        });
    }
  };

  /*
  ======================================================================================================================
  = Load initial data for Home                                                                                         =
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
      loadWatchlists($scope, GlobalService);
      loadPortfolio($scope, GlobalService);
      loadStats($scope);
    })
    .then(function () {
      $scope.refresh = 5;
      $scope.startAutoRefresh();
    })
    .catch(function (error) { DEBUG.log(error); GlobalService.debug.error(error); })
    .finally(function () {
      $scope.$apply();
    });
});