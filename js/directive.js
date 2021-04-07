app = angular.module('Dashboard');

(function (window, angular, undefined) {
  'use strict';

  app.directive('showWarrantInfo', showWarrantInfo);

  function showWarrantInfo($compile) {
    DEBUG.log("showWarrantInfo init");
    var directive = {};
    directive.restrict = 'A';
    directive.templateUrl = 'partials/warrant.html';
    directive.transclude = true;
    directive.link = function (scope, element, attrs) {

    }
    return directive;
  }

})(window, window.angular);
