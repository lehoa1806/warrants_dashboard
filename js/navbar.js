var app = angular.module('Dashboard');

/*
========================================================================================================================
= NavbarController                                                                                                     =
========================================================================================================================
*/
app.controller('NavbarController', function ($scope, $state, GlobalService) {
  DEBUG.log('NavbarController init');
  $scope.GlobalService = GlobalService;
  $scope.$state = $state;

  $scope.onLogoutClicked = function () {
    DEBUG.log('NavbarController: Logged out');
    GlobalService.resetData();
    $state.go('root.login');
    return;
  };
});