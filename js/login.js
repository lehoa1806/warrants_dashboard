app = angular.module('Dashboard');

/*
========================================================================================================================
= LogInController                                                                                                      =
========================================================================================================================
*/
app.controller('LogInController', function ($scope, $state, $timeout, GlobalService) {
  DEBUG.log("LogInController init");
  $scope.GlobalService = GlobalService;

  $scope.login = function (auth) {
    DEBUG.log("Logging in");
    $scope.errorMessage = "";
    $scope.loadSpinner = true;

    var credentials = {};
    credentials.accessKeyId = auth.userName;
    credentials.secretAccessKey = auth.password;
    GlobalService.awsCredentials.setCredentials(credentials);

    $timeout(function () {
      GlobalService.apis.loadUserInfo()
        .catch(function (error) {
          $scope.errorMessage = error.message || JSON.stringify(error);
        })
        .then((response) => {
          if (!response || !response.data) {
            GlobalService.awsCredentials.resetData();
            $scope.errorMessage = "Your credentials are not correct or were expired. Please contact your administrator to get new credentials";
          } else {
            $state.go('root.home');
          }
        })
        .finally(function () {
          $scope.loadSpinner = false;
        });
    });
  };
});