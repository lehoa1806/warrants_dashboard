app = angular.module('Dashboard');

//
// LogInController.
//
app.controller('LogInController', function ($scope, $state, SharedService) {
    DEBUG.log("LogInController init");
    $scope.SharedService = SharedService;

    $scope.login = function (auth) {
        DEBUG.log("Logging in");
        $scope.errorMessage = "";
        $scope.loadSpinner = true;

        var cred = {}
        cred.accessKeyId = auth.userName;
        cred.secretAccessKey = auth.password;
        SharedService.setCredentials(cred);
        AWS.config.update(SharedService.getAwsSetting());
        var sts = new AWS.STS();
        sts.getCallerIdentity().promise()
            .catch(function (error) {
                $scope.errorMessage = error.message || JSON.stringify(error);
            })
            .then((data) => {
                if (!data) {
                    SharedService.resetData();
                    $scope.errorMessage = "Your credentials are not correct or expired. Please contact your administrator to get new credentials";
                } else {
                    console.log(data);
                    $state.go('root.home');
                }
            })
            .finally(function () {
                $scope.loadSpinner = false;
                $scope.$apply();
            });
    };
});