var app = angular.module('Dashboard', ['datatables', 'ui.router', 'ngAnimate', 'ngSanitize', 'ui.bootstrap']);

/*
========================================================================================================================
= Directives                                                                                                           =
========================================================================================================================
*/
app.directive('spinnerLoader', spinnerLoader)
  .directive('showWarrantInfo', showWarrantInfo)
  .directive('datetimePicker', datetimePicker)
  .directive('uibTabControl', uibTabControl);

/*
========================================================================================================================
= Factories                                                                                                            =
========================================================================================================================
*/
app.factory('GlobalService', initGlobalService);

/*
========================================================================================================================
= Route                                                                                                                =
========================================================================================================================
*/
app.config(function ($stateProvider, $urlRouterProvider, $locationProvider) {
  $locationProvider.hashPrefix('');
  $urlRouterProvider.otherwise('/');
  $stateProvider
    .state('root', {
      url: '',
      abstract: true,
      views: {
        'navbar': { templateUrl: 'partials/navbar.html' },
        'view': { templateUrl: 'partials/view.html' }
      },
    })
    .state('root.home', {
      url: '/',
      views: {
        // 'sidebar': { templateUrl: 'partials/sidebar.html' },
        'container': { templateUrl: 'partials/home.html' }
      },
    })
    .state('root.watchlists', {
      url: '/watchlists',
      views: {
        // 'sidebar': { templateUrl: 'partials/sidebar.html' },
        'container': { templateUrl: 'partials/watchlists.html' }
      },
    })
    .state('root.warrants', {
      url: '/warrants',
      views: {
        // 'sidebar': { templateUrl: 'partials/sidebar.html' },
        'container': { templateUrl: 'partials/warrants.html' }
      },
    })
    .state('root.login', {
      url: '/login',
      views: {
        'view@': { templateUrl: 'partials/login.html' },
      },
    })
    ;
});

/*
========================================================================================================================
= Filters                                                                                                              =
========================================================================================================================
*/
app.filter('secondsToDateTime', function () {
  return function (seconds) {
    var datetime = new Date(0, 0, 0, 0, 0, 0, 0);
    datetime.setSeconds(seconds);
    return datetime;
  };
});

app.filter('warrantFilters', function () {
  return function (warrants, warrantFilter) {
    let now = new Date().toISOString().substring(0, 10);
    DEBUG.log('Filter is called ' + now);
    let filtered_warrants = []
    for (let i = 0; i < warrants.length; i++) {
      if (warrants[i].expirationDate < now) continue;
      else if ((warrantFilter.startDate) && (warrants[i].expirationDate < warrantFilter.startDate)) continue;
      else if ((warrantFilter.endDate) && (warrants[i].expirationDate > warrantFilter.endDate)) continue;
      else if ((warrantFilter.profitLow) && (warrants[i].currentProfit < warrantFilter.profitLow)) continue;
      else if ((warrantFilter.profitHigh) && (warrants[i].currentProfit > warrantFilter.profitHigh)) continue;
      else filtered_warrants.push(warrants[i]);
    }
    return filtered_warrants.sort((a, b) => (a.warrant > b.warrant) - (b.warrant > a.warrant));
  };
});

/*
========================================================================================================================
= Start app                                                                                                            =
========================================================================================================================
*/
app.run(function ($state, $transitions, GlobalService) {
  moment().format();
  $transitions.onStart({}, function ($transition) {
    // Redirect to login
    if (!GlobalService.awsCredentials.isAuthenticated() && $transition.to().name !== 'root.login') {
      $transition.abort();
      $state.go('root.login');
    }
  });
});
