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
    link: function (scope, element, attrs) { }
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