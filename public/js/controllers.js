'use strict';

function CommentController($scope) {
    $scope.comments = [];
}

function VideoController($scope, $http) {

    $scope.http = $http;
    
    $scope.loadVideos = function() {
        
        $scope.http.get('/videos?last=10')
            .success(function(data) {
                $scope.videos = data;
            })
            .error(function(err) {
                alert("ERROR:" + err);
            });
    };
    
    $scope.searchVideos = function(key) {
        
        $scope.http.get('/videos?search=' + key)
            .success(function(data) {
                $scope.videos = data;                
            })
            .error(function(err) {
                alert("ERROR:" + err);
            });
    };

}

function VideoPlayController($scope, $http) {
    
    var query = window.location.search;
    $scope.idVideo = query.substring(1);
    $scope.http = $http;
    
    $scope.getVideoInfos = function() {
        $scope.http.get('/videos/' + $scope.idVideo)
            .success(function(data) {
                $scope.video = data;
                if ($scope.video.length > 1024 * 1024) {
                    $scope.video.size = (Math.round($scope.video.length * 100 / (1024 * 1024)) / 100).toString() + 'MB';
                }
                else {
                    $scope.video.size = (Math.round($scope.video.length * 100 / 1024) / 100).toString() + 'KB';
                }
            })
            .error(function(err) {
                alert("ERROR:" + err);
            });
    };
}
