/*
========================================================================================================================
= AWS Credentials                                                                                                      =
========================================================================================================================
*/
function initAwsCredentials() {
  var _credentials = { region: 'ap-southeast-1', accessKeyId: null, secretAccessKey: null };
  return {
    getAwsCredentials: function () {
      return _credentials;
    },
    setCredentials: function (credentials) {
      _credentials.accessKeyId = credentials.accessKeyId;
      _credentials.secretAccessKey = credentials.secretAccessKey;
    },
    resetData: function () {
      _credentials.accessKeyId = null;
      _credentials.secretAccessKey = null;
      AWS.config.update(_credentials);
    },
    isAuthenticated: function () {
      if (_credentials.accessKeyId) {
        return true;
      }
      return false;
    },
  };
}

/*
========================================================================================================================
= Alert                                                                                                                =
========================================================================================================================
*/
function initDebug() {
  var alerts = [];
  return {
    alerts: alerts,
    close: function (index) { alerts.splice(index, 1); },
    error: function (message) { alerts.push({ type: 'danger', msg: message }); },
    info: function (message) { alerts.push({ type: 'success', msg: message }); },
    warning: function (message) { alerts.push({ type: 'warning', msg: message }); },
  };
}

/*
========================================================================================================================
= Cache                                                                                                                =
========================================================================================================================
*/
function initGlobalCache() {
  var estimatedPrices = null;
  var cachedEstimatedPrices = null;
  var warrants = null;
  var userName = null;
  var watchlists = null;
  var portfolio = null;
  var history = null;
  return {
    cachedEstimatedPrices: cachedEstimatedPrices,
    estimatedPrices: estimatedPrices,
    history: history,
    portfolio: portfolio,
    userName: userName,
    warrants: warrants,
    watchlists: watchlists,
  };
}

/*
========================================================================================================================
= APIs                                                                                                                 =
========================================================================================================================
*/
function initApis(cache, awsCredentials) {
  var estimatedReadyToPost = false;
  var warrantLoading = false;
  var userInfoLoading = false;
  var historyApiLoading = false;

  function getCredentials() {
    return {
      accessKey: awsCredentials.getAwsCredentials().accessKeyId,
      secretKey: awsCredentials.getAwsCredentials().secretAccessKey,
      region: awsCredentials.getAwsCredentials().region,
    };
  }
  function getWarrantInfo(warrant) {
    let iWarrant = {
      warrant: warrant.warrant,
      expirationDate: warrant.expirationDate,
      exercisePrice: warrant.exercisePrice,
      ratio: parseFloat(warrant.exerciseRatio),
      provider: warrant.provider,
      sharePrice: warrant.sharePrice,
      volume: warrant.volume,
      foreignBuy: warrant.foreignBuy,
      referencePrice: warrant.referencePrice,
      price: warrant.price,
      upDown: null,
      breakEvenPrice: null,
      currentProfit: null,
      estimatedPrice: null,
      estimatedProfit: null,
      shareEstimatedPrice: warrant.estimatedSharePrice,
      shareEstimatedProfit: null,
      priceSteps: {
        p5: { sharePrice: null, warrantPrice: null, warrantProfit: null },
        p10: { sharePrice: null, warrantPrice: null, warrantProfit: null },
        p15: { sharePrice: null, warrantPrice: null, warrantProfit: null },
        p20: { sharePrice: null, warrantPrice: null, warrantProfit: null },
      },
      editor: {
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
    iWarrant.priceSteps.p5.sharePrice = iWarrant.sharePrice * 1.05;
    iWarrant.priceSteps.p5.warrantPrice = (iWarrant.priceSteps.p5.sharePrice - iWarrant.exercisePrice) / iWarrant.ratio;
    iWarrant.priceSteps.p5.warrantProfit = (iWarrant.priceSteps.p5.warrantPrice / iWarrant.price - 1) * 100;
    iWarrant.priceSteps.p10.sharePrice = iWarrant.sharePrice * 1.1;
    iWarrant.priceSteps.p10.warrantPrice = (iWarrant.priceSteps.p10.sharePrice - iWarrant.exercisePrice) / iWarrant.ratio;
    iWarrant.priceSteps.p10.warrantProfit = (iWarrant.priceSteps.p10.warrantPrice / iWarrant.price - 1) * 100;
    iWarrant.priceSteps.p15.sharePrice = iWarrant.sharePrice * 1.15;
    iWarrant.priceSteps.p15.warrantPrice = (iWarrant.priceSteps.p15.sharePrice - iWarrant.exercisePrice) / iWarrant.ratio;
    iWarrant.priceSteps.p15.warrantProfit = (iWarrant.priceSteps.p15.warrantPrice / iWarrant.price - 1) * 100;
    iWarrant.priceSteps.p20.sharePrice = iWarrant.sharePrice * 1.2;
    iWarrant.priceSteps.p20.warrantPrice = (iWarrant.priceSteps.p20.sharePrice - iWarrant.exercisePrice) / iWarrant.ratio;
    iWarrant.priceSteps.p20.warrantProfit = (iWarrant.priceSteps.p20.warrantPrice / iWarrant.price - 1) * 100;
    iWarrant.upDown = (iWarrant.price / iWarrant.referencePrice - 1) * 100;
    iWarrant.breakEvenPrice = iWarrant.price * iWarrant.ratio + iWarrant.exercisePrice;
    iWarrant.currentProfit = (1 - iWarrant.breakEvenPrice / iWarrant.sharePrice) * 100;
    let iShareEstimatedPrice = getProperty(cache.cachedEstimatedPrices, iWarrant.warrant) || iWarrant.shareEstimatedPrice;
    if (iShareEstimatedPrice) { iWarrant.shareEstimatedPrice = iShareEstimatedPrice; }
    if (iWarrant.shareEstimatedPrice) {
      iWarrant.shareEstimatedProfit = (iWarrant.shareEstimatedPrice / iWarrant.sharePrice - 1) * 100;
      iWarrant.estimatedPrice = (iWarrant.shareEstimatedPrice - iWarrant.exercisePrice) / iWarrant.ratio;
      iWarrant.estimatedProfit = (iWarrant.estimatedPrice / iWarrant.price - 1) * 100;
    }
    return iWarrant;
  }
  return {
    /* Login: Initial portfolio and watchlists
       Home: Initial portfolio
       Watchlists: Initial watchlists
     */
    loadUserInfo: function () {
      return new Promise(function (resolve, reject) {
        if (userInfoLoading) {
          reject('loadUserInfo: Another request is being processed !!!');
        }
        userInfoLoading = true;
        apigClientFactory.newClient(getCredentials()).userInfoGet({}, {}, {})
          .catch(function (error) {
            let message = error.message || JSON.stringify(error);
            DEBUG.log(message);
            reject(message);
          }).then(function (response) {
            if (!response || !response.data) {
              let message = 'loadUserInfo: Empty response !!!';
              DEBUG.log(message);
              reject(message);
            } else {
              DEBUG.log('loadUserInfo: Data returned !!!');
              let userInfo = response.data.user;
              // {
              //    name: tester,
              //    portfolio: {WARRANT0: {warrant: 'WARRANT0',
              //                            quantity: 100,
              //                            acquisitionPrice: 9999}},
              //    watchlists: {WATCHLIST1: ['WARRANT1', 'WARRANT2']},
              // }
              cache.userName = userInfo.name;
              cache.watchlists = userInfo.watchlists;
              cache.portfolio = userInfo.portfolio;
              resolve(response);
            }
          })
          .finally(function () {
            userInfoLoading = false;
            DEBUG.log('loadUserInfo: done !!!');
          });
      });
    },

    /* Home: Update portfolio
       Watchlists: Update watchlists
     */
    updateUserInfo: function (portfolio, watchlists) {
      // [{
      //    warrant: 'WARRANT0',
      //    quantity: 100,
      //    acquisitionPrice: 9999,
      // }]
      //
      // [{
      //    name: WATCHLIST1,
      //    warrants: ['WARRANT1', 'WARRANT2'],
      //    newName: WATCHLIST2,
      // }]
      return new Promise(function (resolve, reject) {
        let userInfo = {}
        if (portfolio && Object.keys(portfolio).length > 0) userInfo.portfolio = portfolio;
        if (watchlists && Object.keys(watchlists).length > 0) userInfo.watchlists = watchlists;
        if (Object.keys(userInfo).length == 0) {
          let message = 'updateUserInfo: Nothing to update !!!'
          DEBUG.log(message);
          reject(message);
        }
        apigClientFactory.newClient(getCredentials()).userInfoPost({}, userInfo, {})
          .catch(function (error) {
            let message = error.message || JSON.stringify(error);
            DEBUG.log(message);
            reject(message);
          }).then(function (response) {
            if (!response || !response.data) {
              let message = 'updateUserInfo: Empty response !!!';
              DEBUG.log(message);
              reject(message);
            } else {
              DEBUG.log('updateUserInfo: Data returned !!!');
              resolve(response);
            }
          })
          .finally(function () {
            DEBUG.log('updateUserInfo: Done !!!');
          });
      });
    },

    /* Home: Initial history */
    loadTradingHistory: function () {
      return new Promise(function (resolve, reject) {
        if (historyApiLoading) {
          let message = 'loadTradingHistory: Another request is being processed !!!'
          DEBUG.log(message);
          reject(message);
        }
        historyApiLoading = true;
        apigClientFactory.newClient(getCredentials()).historyGet({}, {}, {})
          .catch(function (error) {
            let message = error.message || JSON.stringify(error);
            DEBUG.log(message);
            reject(message);
          }).then(function (response) {
            if (!response || !response.data) {
              let message = 'loadTradingHistory: Empty response !!!';
              DEBUG.log(message);
              reject(message);
            } else {
              DEBUG.log('loadTradingHistory: Data returned !!!');
              cache.history = response.data.records;
              resolve(response);
            }
          })
          .finally(function () {
            historyApiLoading = false;
            DEBUG.log('loadTradingHistory: Done !!!');
          });
      });
    },

    /* Home: Update history */
    updateTradingHistory: function (records) {
      // {
      //    action: 'insert',
      //    record: {date: '2021-06-18',
      //             recordId: 'XYZ123CBA',
      //             warrant: 'WARRANTID1',
      //             action: 'sell',
      //             quantity: 100,
      //             price: 9999,
      //             acquisitionPrice: 8888,
      //             realizedLossProfit: 111100},
      // }
      return new Promise(function (resolve, reject) {
        if (!records || !records.action || !records.record) {
          let message = 'updateTradingHistory: Invalid request !!!'
          DEBUG.log(message);
          reject(message);
        }
        apigClientFactory.newClient(getCredentials()).historyPost({}, { records: records }, {})
          .catch(function (error) {
            let message = error.message || JSON.stringify(error);
            DEBUG.log(message);
            reject(message);
          })
          .then(function (response) {
            if (!response || !response.data) {
              let message = 'updateTradingHistory: Empty response !!!';
              DEBUG.log(message);
              reject(message);
            } else {
              DEBUG.log('updateTradingHistory: Data returned !!!');
              resolve(response);
            }
          })
          .finally(function () {
            DEBUG.log('updateTradingHistory: Done !!!');
          });
      });
    },

    /* Home: Initial warrant data
       WarrantScreener: Initial warrant data
     */
    loadWarrantInfo: function () {
      return new Promise(function (resolve, reject) {
        if (warrantLoading) {
          let message = 'loadWarrantInfo: Another request is being processed !!!'
          DEBUG.log(message);
          reject(message);
        }
        warrantLoading = true;
        apigClientFactory.newClient(getCredentials()).dashboardGet({}, {}, {})
          .catch(function (error) {
            let message = error.message || JSON.stringify(error);
            DEBUG.log(message);
            reject(message);
          }).then(function (response) {
            if (!response || !response.data) {
              let message = 'loadWarrantInfo: Empty response !!!';
              DEBUG.log(message);
              reject(message);
            } else {
              DEBUG.log('loadWarrantInfo: Data returned !!!');
              cache.estimatedPrices = {};
              cache.cachedEstimatedPrices = {};
              let warrants = response.data.warrants;
              cache.warrants = {};
              for (let key in warrants) {
                if (warrants.hasOwnProperty(key)) {
                  let iWarrant = getWarrantInfo(warrants[key]);
                  if (iWarrant.shareEstimatedPrice) {
                    cache.estimatedPrices[iWarrant.warrant] = iWarrant.shareEstimatedPrice;
                    cache.cachedEstimatedPrices[iWarrant.warrant] = iWarrant.shareEstimatedPrice;
                  }
                  cache.warrants[key] = iWarrant;
                }
              }
              resolve(response);
            }
          })
          .finally(function () {
            warrantLoading = false;
            DEBUG.log('loadWarrantInfo: Done !!!');
          });
      });
    },

    /* Home: Renew warrant info
       WarrantScreener: Renew warrant info
     */
    pullRealtimeWarrantInfo: function () {
      return new Promise(function (resolve, reject) {
        if (warrantLoading) {
          let message = 'pullRealtimeWarrantInfo: Another request is being processed !!!'
          DEBUG.log(message);
          reject(message);
        }
        warrantLoading = true;
        apigClientFactory.newClient(getCredentials()).infoGet({}, {}, {})
          .catch(function (error) {
            let message = error.message || JSON.stringify(error);
            DEBUG.log(message);
            reject(message);
          })
          .then(function (response) {
            if (!response || !response.data) {
              let message = 'pullRealtimeWarrantInfo: Empty response !!!';
              DEBUG.log(message);
              reject(message);
            } else {
              DEBUG.log('pullRealtimeWarrantInfo: Data returned !!!');
              let warrants = response.data.warrants;
              cache.warrants = {};
              for (let key in warrants) {
                if (warrants.hasOwnProperty(key)) {
                  cache.warrants[key] = getWarrantInfo(warrants[key]);
                }
              }
              resolve();
            }
          })
          .finally(function () {
            warrantLoading = false;
            DEBUG.log('pullRealtimeWarrantInfo: Done !!!');
          });
      });
    },

    /* WarrantScreener: Update estimated prices */
    estimatedReadyToPost: estimatedReadyToPost,
    updateEstimatedPrices: function () {
      return new Promise(function (resolve, reject) {
        if (!estimatedReadyToPost) {
          let message = 'updateEstimatedPrices: No new data !!!'
          DEBUG.log(message);
          reject(message);
        }
        let dataToPost = {};
        for (let iWarrantName in cache.cachedEstimatedPrices) {
          if (cache.cachedEstimatedPrices.hasOwnProperty(iWarrantName)) {
            if (cache.estimatedPrices.hasOwnProperty(iWarrantName)) {
              if (cache.estimatedPrices[iWarrantName] != cache.cachedEstimatedPrices[iWarrantName]) {
                dataToPost[iWarrantName] = cache.cachedEstimatedPrices[iWarrantName];
              }
            } else {
              dataToPost[iWarrantName] = cache.cachedEstimatedPrices[iWarrantName];
            }
          }
        }
        if (Object.keys(dataToPost).length == 0) {
          let message = 'updateEstimatedPrices: Data has no change !!!'
          DEBUG.log(message);
          reject(message);
          return;
        }
        apigClientFactory.newClient(getCredentials()).estimatedPricePost({}, { prices: dataToPost }, {})
          .catch(function (error) {
            let message = error.message || JSON.stringify(error);
            DEBUG.log(message);
            reject(message);
          })
          .then(function (response) {
            if (!response || !response.data) {
              let message = 'updateEstimatedPrices: Empty response !!!';
              DEBUG.log(message);
              reject(message);
            } else {
              cache.estimatedPrices = cache.cachedEstimatedPrices;
              resolve();
            }
          })
          .finally(function () {
            estimatedReadyToPost = false;
            DEBUG.log('updateEstimatedPrices: Done !!!');
          });
      });
    },
  }
}
/*
========================================================================================================================
= Global Service                                                                                                        =
========================================================================================================================
*/
var initGlobalService = function () {
  var awsCredentials = initAwsCredentials();
  var cache = initGlobalCache();
  var apis = initApis(cache, awsCredentials);
  var debug = initDebug();
  return {
    apis: apis,
    awsCredentials: awsCredentials,
    cache: cache,
    debug: debug,
    estimatedPriceToPost: function () {
      apis.estimatedReadyToPost = true;
      var element = angular.element(document.querySelector('#EstimatedPriceToPost'));
      if (element.hasClass('btn-success')) element.removeClass('btn-success').addClass('btn-warning');
    },
    estimatedPricePostDone: function () {
      apis.estimatedReadyToPost = false;
      var element = angular.element(document.querySelector('#EstimatedPriceToPost'));
      if (element.hasClass('btn-warning')) element.removeClass('btn-warning').addClass('btn-success');
    },
  };
};
