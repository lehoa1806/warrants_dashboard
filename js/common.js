/*
========================================================================================================================
= Common                                                                                                               =
========================================================================================================================
*/
var DEBUG = (function () {
  var timestamp = function () { };
  timestamp.toString = function () {
    return "[DEBUG " + moment().format() + "]";
  };
  return {
    log: console.log.bind(console, '%s', timestamp)
  };
})();

function getProperty(object, key, dfValue) {
  object = object || {};
  dfValue = dfValue || null;
  return object.hasOwnProperty(key) ? object[key] : dfValue;
}

function mergeTwoObject(firstObject, secondObject) {
  var object = {};
  for (var key in firstObject) {
    if (firstObject.hasOwnProperty(key)) {
      object[key] = firstObject[key];
    }
  }
  for (key in secondObject) {
    if (secondObject.hasOwnProperty(key)) {
      object[key] = secondObject[key];
    }
  }
  return object;
}

function getASimpleRandomString() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/*
========================================================================================================================
= Utils                                                                                                                =
========================================================================================================================
*/
function loadPortfolio(scope, GlobalService) {
  scope.portfolio = [];
  for (let warrant in GlobalService.cache.portfolio) {
    if (GlobalService.cache.portfolio.hasOwnProperty(warrant)) {
      let iWarrantInfo = GlobalService.cache.portfolio[warrant];
      if (Object.keys(GlobalService.cache.warrants) == 0 || !getProperty(GlobalService.cache.warrants, warrant, null)) {
        message = warrant + ' is missing from the Global Warrants';
        DEBUG.log(message);
        GlobalService.debug.warning(message);
        continue;
      }
      let realtimeData = GlobalService.cache.warrants[warrant];
      iWarrantInfo.investmentAmount = iWarrantInfo.quantity * iWarrantInfo.acquisitionPrice;
      iWarrantInfo.marketValue = iWarrantInfo.quantity * realtimeData.price;
      iWarrantInfo.totalUpDown = (realtimeData.price / iWarrantInfo.acquisitionPrice - 1) * 100;
      iWarrantInfo.unrealizedLossProfit = (realtimeData.price - iWarrantInfo.acquisitionPrice) * iWarrantInfo.quantity;
      scope.portfolio.push(mergeTwoObject(iWarrantInfo, realtimeData));
    }
  }
}

function loadWatchlists(scope, GlobalService) {
  scope.watchlists = [];
  for (let watchlist in GlobalService.cache.watchlists) {
    if (GlobalService.cache.watchlists.hasOwnProperty(watchlist)) {
      let warrants = [];
      for (let warrant of GlobalService.cache.watchlists[watchlist]) {
        if (GlobalService.cache.warrants.hasOwnProperty(warrant)) {
          warrants.push(GlobalService.cache.warrants[warrant]);
        }/*  */
      }
      scope.watchlists.push({
        watchlist: watchlist,
        warrants: warrants,
      });
    }
  }
}

function loadStats(scope) {
  scope.marketValue = 0;
  scope.unrealizedLossProfit = 0;
  scope.lossProfit = 0;
  scope.realizedLossProfit = 0;
  if (scope.portfolio && scope.portfolio.length > 0) {
    scope.totalMarketValue = scope.portfolio.map(warrant => warrant.marketValue).reduce((a, b) => (a || 0) + (b || 0));
    scope.unrealizedLossProfit = scope.portfolio.map(warrant => warrant.unrealizedLossProfit).reduce((a, b) => (a || 0) + (b || 0));
    scope.lossProfitPercent = scope.unrealizedLossProfit * 100 / (scope.totalMarketValue - scope.unrealizedLossProfit);
  }
  if (scope.history && scope.history.length > 0) {
    scope.realizedLossProfit = scope.history.map(warrant => warrant.realizedLossProfit).reduce((a, b) => (a || 0) + (b || 0));
  }
}