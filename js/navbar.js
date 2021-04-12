app = angular.module('Dashboard');

app.controller('NavbarController', function ($scope, $state, SharedService) {
    DEBUG.log('NavbarController init');
    $scope.SharedService = SharedService;
    $scope.$state = $state;

    $scope.onLogoutClicked = function () {
        DEBUG.log('NavbarController: Logged out');
        SharedService.resetData();
        $state.go('root.login');
        return;
    };
});