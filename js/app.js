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
