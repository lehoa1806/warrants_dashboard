var app = angular.module('Dashboard');

/*
========================================================================================================================
= NavbarController                                                                                                     =
========================================================================================================================
*/
app.controller('ViewController', function ($scope, $state, GlobalService) {
  DEBUG.log('ViewController init');
  $scope.GlobalService = GlobalService;
  $scope.$state = $state;
});
