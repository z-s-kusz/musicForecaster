var mainApp = angular.module('mainApp', ['ngRoute']);

mainApp.config(['$routeProvider', function($routeProvider) {

  $routeProvider
    .when('/', {
      templateUrl: '/landingPage/landingPage.html',
      controller: "LandingPageController"
    })
  //  .otherwise({
  //     redirectTo: '/home',
  //     templateUrl: '/landingPage/landingPage.html',
  //     controller: "LandingPageController"
  //   })

}]);
