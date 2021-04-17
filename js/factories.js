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
= Cache                                                                                                                =
========================================================================================================================
*/
function initGlobalCache() {
  var estimatedPrices = {};
  var cachedEstimatedPrices = {};
  var warrants = [];
  return {
    estimatedPrices: estimatedPrices,
    cachedEstimatedPrices: cachedEstimatedPrices,
    warrants: warrants,
  };
}

/*
========================================================================================================================
= APIs                                                                                                                 =
========================================================================================================================
*/
function initApis(cache, awsCredentials) {
  var estimatedReadyToPost = false;
  var infoLoading = false;

  function getCredentials() {
    return {
      accessKey: awsCredentials.getAwsCredentials().accessKeyId,
      secretKey: awsCredentials.getAwsCredentials().secretAccessKey,
      region: awsCredentials.getAwsCredentials().region,
    };
  }
  function getWarrantInfo(warrant) {
    let iWarrant = {
      "name": warrant.warrant,
      "expirationDate": warrant.expirationDate,
      "exercisePrice": warrant.exercisePrice,
      "ratio": parseFloat(warrant.exerciseRatio),
      "provider": warrant.provider,
      "sharePrice": warrant.sharePrice,
      "volume": warrant.volume,
      "foreignBuy": warrant.foreignBuy,
      "referencePrice": warrant.referencePrice,
      "price": warrant.price,
      'estimatedPrice': null,
      "shareEstimatedPrice": warrant.estimatedPrice,
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
    let iShareEstimatedPrice = getProperty(cache.cachedEstimatedPrices, iWarrant.name) || iWarrant.shareEstimatedPrice;
    if (iShareEstimatedPrice) { iWarrant.shareEstimatedPrice = iShareEstimatedPrice; }
    if (iWarrant.shareEstimatedPrice) {
      iWarrant.shareEstimatedProfit = (iWarrant.shareEstimatedPrice / iWarrant.sharePrice - 1) * 100;
      iWarrant.estimatedPrice = (iWarrant.shareEstimatedPrice - iWarrant.exercisePrice) / iWarrant.ratio;
      iWarrant.estimatedProfit = (iWarrant.estimatedPrice / iWarrant.price - 1) * 100;
    }
    return iWarrant;
  }
  return {
    estimatedReadyToPost: estimatedReadyToPost,
    saveEstimatedPrices: function () {
      if (!estimatedReadyToPost) {
        DEBUG.log('estimatedPricePost: Nothing to Update!');
        return;
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
        DEBUG.log('estimatedPricePost: Data has no change!');
        return;
      }
      apigClientFactory.newClient(getCredentials()).estimatedPricePost({}, { prices: dataToPost }, {})
        .catch(function (error) {
          DEBUG.log(error.message || JSON.stringify(error));
        })
        .then(function (response) {
          if (!response || !response.data) {
            DEBUG.log('estimatedPricesPost returned empty response !!!');
          } else {
            cache.estimatedPrices = cache.cachedEstimatedPrices;
          }
        })
        .finally(function () {
          estimatedReadyToPost = false;
          DEBUG.log('estimatedPricesPost: Done !!!');
        });
    },
    loadWarrants: function () {
      return new Promise(function (resolve, reject) {
        if (infoLoading) {
          reject('Another loadWarrants is being processed !!!');
        }
        infoLoading = true;
        apigClientFactory.newClient(getCredentials()).infoGet({}, {}, {})
          .catch(function (error) {
            let message = ror.message || JSON.stringify(error);
            DEBUG.log(message);
            reject(message);
          })
          .then(function (response) {
            if (!response || !response.data) {
              let message = 'infoGet returned empty response !!!';
              DEBUG.log(message);
              reject(message);
            } else {
              let warrants = response.data.warrants;
              cache.warrants = [];
              for (let i = 0; i < warrants.length; i++) {
                let iWarrant = getWarrantInfo(warrants[i]);
                cache.warrants.push(iWarrant);
              }
              resolve();
            }
          })
          .finally(function () {
            infoLoading = false;
            DEBUG.log('reloadWarrantInfo done !!!');
          });
      });
    },
    getDashboard: function () {
      return new Promise(function (resolve, reject) {
        if (infoLoading) {
          reject('Another getDashboard is being processed !!!');
        }
        infoLoading = true;
        apigClientFactory.newClient(getCredentials()).dashboardGet({}, {}, {})
          .catch(function (error) {
            let message = ror.message || JSON.stringify(error);
            DEBUG.log(message);
            reject(message);
          }).then(function (response) {
            if (!response || !response.data) {
              let message = 'dashboardGet returned empty response !!!';
              DEBUG.log(message);
              reject(message);
            } else {
              DEBUG.log('dashboardGet returned data !!!');
              var warrants = response.data.warrants;
              cache.warrants = [];
              for (let i = 0; i < warrants.length; i++) {
                let iWarrant = getWarrantInfo(warrants[i]);
                if (iWarrant.shareEstimatedPrice) {
                  cache.estimatedPrices[iWarrant.name] = iWarrant.shareEstimatedPrice;
                  cache.cachedEstimatedPrices[iWarrant.name] = iWarrant.shareEstimatedPrice;
                }
                cache.warrants.push(iWarrant);
              }
              resolve();
            }
          })
          .finally(function () {
            infoLoading = false;
            DEBUG.log('dashboardGet done !!!');
          });
      });
    },
  };
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
  return {
    apis: apis,
    awsCredentials: awsCredentials,
    cache: cache,
    estimatedPriceToPost: function () {
      apis.estimatedReadyToPost = true;
      var element = angular.element(document.querySelector('#EstimatedPriceToPost'));
      element.removeClass('btn-success').addClass('btn-warning');
    },
    estimatedPricePostDone: function () {
      apis.estimatedReadyToPost = false;
      var element = angular.element(document.querySelector('#EstimatedPriceToPost'));
      element.removeClass('btn-warning').addClass('btn-success');
    },
  };
};
