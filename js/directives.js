/*
========================================================================================================================
= Warrant Info PopUp                                                                                                   =
========================================================================================================================
*/
function showWarrantInfo($compile) {
  DEBUG.log("showWarrantInfo init");
  return {
    restrict: 'A',
    templateUrl: 'partials/warrant.html',
    transclude: true,
    link: function (scope, element, attributes) {

    }
  };
}

/*
========================================================================================================================
= Loading animation                                                                                                    =
========================================================================================================================
*/
function spinnerLoader() {
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
}

/*
========================================================================================================================
= Loading animation                                                                                                    =
========================================================================================================================
*/
function datetimePicker() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function (scope, element, attributes, ngModel) {
      element.datetimepicker({ format: 'YYYY-MM-DD' })
        .on('dp.change', function (value) {
          ngModel.$setViewValue(moment(value.date).format('YYYY-MM-DD'));
          scope.$apply()
        });
    }
  };
}

/*
========================================================================================================================
= Dynamic tab control                                                                                                   =
========================================================================================================================
*/
function uibTabControl() {
  return {
    restrict: 'EA',
    scope: {
      handler: '&',
      text: '@'
    },
    template: '<li class="uib-tab nav-item"><a href="javascript:;" ng-click="handler()" class="nav-link"><i class="glyphicon glyphicon-plus-sign"></i></a></li>',
    replace: true
  }
}
