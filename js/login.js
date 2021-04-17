app = angular.module('Dashboard');

/*
========================================================================================================================
= LogInController                                                                                                      =
========================================================================================================================
*/
app.controller('LogInController', function ($scope, $state, GlobalService) {
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
    AWS.config.update(GlobalService.awsCredentials.getAwsCredentials());
    var sts = new AWS.STS();
    sts.getCallerIdentity().promise()
      .catch(function (error) {
        $scope.errorMessage = error.message || JSON.stringify(error);
      })
      .then((data) => {
        if (!data) {
          GlobalService.awsCredentials.resetData();
          $scope.errorMessage = "Your credentials are not correct or were expired. Please contact your administrator to get new credentials";
        } else {
          $state.go('root.home');
        }
      })
      .finally(function () {
        $scope.loadSpinner = false;
        $scope.$apply();
      });
  };
});