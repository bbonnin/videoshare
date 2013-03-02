var express = require("express");
var http = require("http");
var WebSocketServer = require("websocket").server;
var VideoServices = require("./routes/videos").VideoServices;

//***********************************************
// Express configuration
//***********************************************
var app = express();
var httpServer = http.createServer(app);

app.configure(function() {
    app.use(express.logger('dev'));
    app.use(express.limit('5mb'));
    app.use(express.bodyParser({ 
        uploadDir: __dirname + '/public/uploads',
        keepExtensions: true }));
    app.use(express.static(__dirname + '/public'));
});

var videos = new VideoServices({ dbhost : "localhost", dbport : 27017 });

app.get("/videos/snapshot/:id", videos.getVideoSnapshot.bind(videos));
app.get("/videos/content/:id", videos.getVideoContent.bind(videos));
app.get("/videos/:id", videos.findById.bind(videos));
app.get("/videos", videos.find.bind(videos));
app.post("/videos", videos.addVideo.bind(videos));
app.delete("/videos/:id", videos.deleteVideo.bind(videos));

httpServer.listen(8888);
console.log("Listening on port 8888...");

//***********************************************
// WebSockets Connections
//***********************************************
var wsConnections = {};

wsServer = new WebSocketServer({
    httpServer: httpServer
});

wsServer.on('request', function(request) {

    var connection = request.accept('comment-protocol', request.origin);
    
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            try {
                var command = JSON.parse(message.utf8Data);
                if (command.action === 'hello') {
                    if (!wsConnections[command.videoId]) {
                        wsConnections[command.videoId] = [];
                    }
                    wsCconnections[command.videoId].push(connection);
                }
                else if (command.action === 'list') {
                    videos.getComments(command.videoId, connection);
                }
                else if (command.action === 'post') {
                    videos.addComment(command, wsConnections);
                }
            }
            catch(e) {
            }
        }
    });
    
    connection.on('close', function(reasonCode, description) {
        for (var videoId in wsConnections) {
            for (var i in wsConnections[videoId]) {
                if (wsConnections[videoId][i] === connection) {
                    wsConnections[videoId].splice(i, 1);
                    break;
                }
            }
        }
    });
});
