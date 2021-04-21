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
    link: function (scope, element, attributes) { }
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
      .on('dp.change', function(value){
        ngModel.$setViewValue(moment(value.date).format('YYYY-MM-DD'));
        scope.$apply()
      });
    }
  };
}