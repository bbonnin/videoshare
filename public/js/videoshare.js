//***********************************************
// Video list management functions
//***********************************************

function showVideo(id) {
    window.location = "play_video.html?" + id;
}
    
function refreshVideos() {
    $('#refreshBtn').attr('disabled', 'disabled');
    $("#refreshBtn").html("Refreshing videos...");
    var scope = angular.element(document.body).scope();
    scope.loadVideos();
    $('#refreshBtn').removeAttr('disabled');
    $("#refreshBtn").html("Refresh videos");       
}
    
function searchVideos() {
    var kw = $("#keyword").val();
    if (kw.length > 0) {
        var scope = angular.element(document.body).scope();
        scope.searchVideos(kw);
    }
    else {
        refreshVideos();
    }
}

function deleteVideo(id, onSuccessCallback) {        
    $.ajax({
        url : "/videos/" + id, 
        type : "DELETE",
        error : function(jqXHR, textStatus, errorThrown) {
            alert("Erreur : " + textStatus);
        },
        success : function(data, textStatus, jqXHR) {
            if (onSuccessCallback) {
                eval(onSuccessCallback);
            }
        }
    });
}

//***********************************************
// "Add video" functions
//***********************************************
function uploadVideo(event) {
    if (document.getElementById('files').files.length > 0 
        && $('#title').val().length > 0
        && $('#username').val().length > 0) {
        
        $('#addVideo').attr('disabled', 'disabled');
            
        var xhr = new XMLHttpRequest();
        var fd = new FormData();
            
        var metadata = { title : $('#title').val(), 
            userId : $('#username').val(),
            duration : $('#videoDuration').text() };
        fd.append("metadata", JSON.stringify(metadata));
            
        fd.append("video", document.getElementById('files').files[0]);
        var snapshot = getSnapshot();
        if (snapshot != null) {
            fd.append("snapshot", snapshot);
        }
        
        xhr.upload.addEventListener("progress", uploadProgress, false);
        xhr.addEventListener("load", uploadComplete, false);
        xhr.addEventListener("error", uploadFailed, false);
        xhr.addEventListener("abort", uploadCanceled, false);
            
        xhr.open("POST", "videos");
        xhr.send(fd);
    }
    else {
        showUploadResult("Error : you have to select a video and enter your name and a title");
    }
    
    return false;
}

function getSnapshot() {
    var video = $("#preview")[0];
    var canvas = $("#snapshot")[0];
        
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
        
    var ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0,0, canvas.width, canvas.height);
    try {
        var img = canvas.toDataURL("image/png");
        return img.split(',')[1];
    }
    catch (e) {
        return null;
    }
}
    
function uploadProgress(evt) {
    if (evt.lengthComputable) {
        var percentComplete = Math.round(evt.loaded * 100 / evt.total);
        $('#addVideo').html('On going... ' + percentComplete.toString() + '%');
    }
    else {
        console.log('Cannot compute the length for upload progress');
    }
}
    
function showUploadResult(text) {
    $('#result').html(text);
    $('#modalResult').modal('show');
    $('#resetVideo').click();
    $('#addVideo').removeAttr('disabled');
    $('#addVideo').html('Upload');
}

function uploadComplete(evt) {
    var resText = "Success !! The video has been uploaded.";
    if (evt.target.status != 200) {
        resText = "Error : " + evt.target.statusText;
    }
    showUploadResult(resText);
}

function uploadFailed(evt) {
    showUploadResult("Upload has failed");
}

function uploadCanceled(evt) {
    showUploadResult("Upload has been cancelled");
}  

function loadFiles(files) {
    for (var i=0; i<files.length; i++) {
        var file = files[i];
        var fileSize = 0;
        if (file.size > 1024 * 1024) {
            fileSize = (Math.round(file.size * 100 / (1024 * 1024)) / 100).toString() + 'MB';
        }
        else {
            fileSize = (Math.round(file.size * 100 / 1024) / 100).toString() + 'KB';
        }
       
        $('#fileName').text(file.name);
        $('#fileSize').text(fileSize);
        $('#fileType').text(file.type);
        
        var reader = new FileReader();
        reader.onload = function(event) {
            $("#dropzone").hide();
            var dataUri = event.target.result;
            var video = document.getElementById("preview");
            video.src = dataUri;
            video.style.display = "block";
            video.style.width = "100%";
            $('#msg').text('');
            video.play();
            video.muted = true;
            video.volume = 0;
        };
        reader.onloadend = function(event) {
            setTimeout(function() {
                $('#videoDuration').text(formatSeconds($('#preview').get(0).duration));
            }, 3000);
        };
        reader.onerror = function(event) {
            $('#result').html("Error while playing video : " + event.target.error);
            $('#modalResult').modal('show');
        };
        $('#msg').text('Downloading...');
        reader.readAsDataURL(file);    
    }
}

//***********************************************
// "Play video" functions
//***********************************************
function updateVideo() {
    var scope = angular.element(document.body).scope();
    scope.getVideoInfos();
}

function getVideoId() {
    var scope = angular.element(document.body).scope();
    var videoId = scope.video._id;
    return videoId;
}

var connection;

function createWebSocket() {
    window.WebSocket = window.WebSocket || window.MozWebSocket;

    connection = new WebSocket('ws://' + window.location.host, 'comment-protocol');

    connection.onopen = function () {
        connection.send(JSON.stringify({ action:"hello", videoId:getVideoId() }));
        connection.send(JSON.stringify({ action:"list", videoId:getVideoId() }));
    };

    connection.onerror = function (error) {
        console.log("websocket error : " + error);
    };

    connection.onmessage = function (message) {
        try {
            var msg = JSON.parse(message.data);
            var scope = angular.element(document.getElementById("comments")).scope();
            scope.$apply(function(scope) { scope.comments = msg });
        }
        catch (e) {
            console.log('Problem with message : msg=' + message.data + ', error=', e);
        }
    };
}

function postComment() {
    var userId = $("#username").val();
    if (userId.length == 0) {
        userId = "Anonymous";
    }
    
    var comment = $("#comment").val();
    if (comment.length > 0) { 
        connection.send(JSON.stringify({ action:"post", userId:userId, text:comment, videoId:getVideoId() }));
        $("#comment").val('');
    }
}

//***********************************************
// "Statistics" functions
//***********************************************

function refreshStats() {
    getStats(1, "1day");
    getStats(7, "7days");
    getStats(30, "30days");
}

function getStats(ndays, divId) {
    $.ajax({
        url : "/videos/statistics/" + ndays, 
        type : "GET",
        error : function(jqXHR, textStatus, errorThrown) {
            alert("Erreur : " + textStatus);
        },
        success : function(data, textStatus, jqXHR) {
            var stats = JSON.parse(data).value;
            var avgSize = 0;
            if (stats.count != 0) {
                avgSize = stats.size / stats.count;
            }
            $("#" + divId).text("# of videos : " + stats.count + ", average size : " + avgSize);
        }
    });
}

//***********************************************
// "Utils" functions
//***********************************************

function formatSeconds(seconds) {
    var date = new Date(1970, 0, 1);
    date.setSeconds(seconds);
    return date.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
}
