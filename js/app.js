'use strict';

var app = angular.module('Dashboard', ['datatables', 'ui.router']);

// Write debug to console.log
var DEBUG = (function () {
    var timestamp = function () { };
    timestamp.toString = function () {
        return "[DEBUG " + moment().format() + "]";
    };
    return {
        log: console.log.bind(console, '%s', timestamp)
    };
})();

//
// Common Directives
//
app.directive('spinnerLoader', function () {
    return {
        restrict: 'A',
        scope: {
            loadSpinner: '@',
        },
        template:
            '<div class="loading"></div>',
        link: function (scope, element, attributes) {
            attributes.$observe('loadSpinner', function (value) {
                element.css('visibility', value === 'true' ? 'visible' : 'hidden');
            });
        }
    };
});


//
// Shared service that all controllers can use
//
app.factory('SharedService', function ($rootScope) {
    DEBUG.log("SharedService init");

    var awsSetting = { region: 'ap-southeast-1', accessKeyId: null, secretAccessKey: null };

    return {
        getAwsSetting: function () {
            return awsSetting;
        },

        setCredentials: function (credentials) {
            awsSetting.accessKeyId = credentials.accessKeyId;
            awsSetting.secretAccessKey = credentials.secretAccessKey;
        },

        resetData: function () {
            awsSetting.accessKeyId = null;
            awsSetting.secretAccessKey = null;
            AWS.config.update(awsSetting);
        },

        isAuthenticated: function () {
            if (awsSetting.accessKeyId) {
                return true;
            }
            return false;
        },

    };
});

app.config(function ($stateProvider, $urlRouterProvider) {
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
                // 'container': { templateUrl: 'partials/home.html' }
                'view@': { templateUrl: 'partials/home.html' }
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

app.run(function ($state, $transitions, SharedService) {
    moment().format();

    $transitions.onStart({}, function ($transition) {
        // Redirect to login
        if (!SharedService.isAuthenticated() && $transition.to().name !== 'root.login') {
            $transition.abort();
            $state.go('root.login');
        }
    });
});
