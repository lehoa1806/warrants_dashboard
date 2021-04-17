app = angular.module('Dashboard');

/*
========================================================================================================================
= HomeController                                                                                                       =
========================================================================================================================
*/
app.controller('HomeController', function ($scope, $state, GlobalService) {

  $scope.goToWarrants = () => {
    DEBUG.log("HomeController is under construction now, route to Warrants");
    DEBUG.log('routing to root.warrants');
    $state.go('root.warrants');
    return;
  };
  $scope.goToWarrants();
});