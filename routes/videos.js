var mongo = require("mongodb");
var qs = require("querystring");
var fs = require('fs');

var BSON = mongo.BSONPure;
var GridStore = mongo.GridStore;
var Server = mongo.Server;
var Db = mongo.Db;

var VideoServices = function VideoServices(config) {
    var server = new Server(config.dbhost, config.dbport, 
                    { auto_reconnect : true });
    
    this.db = new Db("videoshare", server, { safe:true });

    this.db.open(function(err, db) {
        if (!err) {
            console.log("Connected to MongoDB");
        }
        else {
            console.warn("Unable to connect to MongoDB (" + config.dbhost + "/" + config.dbport + ") : " + err.message);
        }
    });
}

VideoServices.prototype.find = function(req, resp) {
    var options = {};
    var query = {};
    if (req.query.search) {
        var keyword = req.query.search;
        query = { $or : [ { filename : { $regex : keyword, $options : 'i' }},
                      { "metadata.title" : { $regex : keyword, $options : 'i' }}
                    ] };
        options = { sort : [['uploadDate', 'desc']], limit : 10 };
    }
    if (req.query.last) {
        options = { sort : [['uploadDate', 'desc']], limit : req.query.last };
    }
    var self = this;
    this.db.collection("videosfs.files", function(err, collection) {
        collection.find(query, { "metadata.snapshot" : 0 }, options)
            .toArray(function(err, items) {
                for (var i=0; i<items.length; i++) {
                    items[i].uploadDate = self.toReadableDate(items[i].uploadDate);
                }
                resp.send(items);
            });
    });
}

VideoServices.prototype.getVideoSnapshot = function(req, resp) {
    var id = req.params.id;
    this.db.collection("videosfs.files", function(err, collection) {
        collection.findOne({'_id' : new BSON.ObjectID(id)},
            function(err, item) {
                if (item != null && item.metadata.snapshot != null) {
                    var data = item.metadata.snapshot;
                    var decodedImage = new Buffer(data, "base64");
                    resp.setHeader("Content-Type", "image/png");
                    resp.send(decodedImage);
                }
                else {
                    //resp.send(404, { error : "Unknown video or no snapshot" });
                    resp.setHeader("Location", "/img/no_snapshot.png");
                    resp.send(302);
                }
            });
    });
}

VideoServices.prototype.findById = function(req, resp) {
    var id = req.params.id;
    try {
        var bId = new BSON.ObjectID(id);
        this.db.collection("videosfs.files", function(err, collection) {
            collection.findOne({'_id' : bId}, {"metadata.snapshot":0},
                function(err, item) {
                    if (item != null) {
                        resp.send(item);
                    }
                    else {
                        resp.send(404, { error : "Unknown video" });
                    }
                });
        });
    }
    catch (e) {
        resp.send(400, { error : "Bad id" });
    }
}

VideoServices.prototype.getVideoContent = function(req, resp) {
    var id = req.params.id;
    var oid = new BSON.ObjectID(id);
    var self = this;
    
    GridStore.exist(self.db, oid, "videosfs", function(err, exist) {
        if (exist) {
            var gs = new GridStore(self.db, oid, "r", { "root" : "videosfs" });
    
            gs.open(function(err, gs) {
                gs.seek(0, function(err, gs) {
                    gs.read(function(err, data) {
                        if (err) {
                            console.warn(err);
                            resp.send(500, { error : "Internal Server Error" });
                        }
                        else {
                            resp.setHeader("Content-Type", "video/webm");
                            resp.send(data);
                        }
                    });
                });
            });
            
            self.db.collection("videosfs.files", function(err, collection) {
                collection.update({'_id' : oid}, { '$inc' : { 'metadata.views' : 1 } }, function(err, obj) {
                    if (err) {
                        console.warn(err.message);
                    }
                })
            });
        }
        else {
            resp.send(404, { error : "Unknown video" });
        }
    });
}

VideoServices.prototype.addVideo = function(req, resp) {
    var tmp_path = req.files.video.path;
    var video_name = req.files.video.name;
    var metadata = JSON.parse(req.body.metadata);
    metadata.views = 0;
    
    if (req.body.snapshot) {
        metadata.snapshot = req.body.snapshot;
    }
    
    var gs = new GridStore(this.db, video_name, "w", {
            "root" : "videosfs",
            "content_type" : req.files.video.type,
            "metadata" : metadata,
            "chunk_size" : 5*1024
    });
    
    gs.open(function(err, gs) {
        gs.writeFile(tmp_path, function(err, doc) {
            if (err) throw err;
            fs.unlink(tmp_path, function(err) {
                if (err) {
                    console.warn(err);
                    resp.send(500, { error : "Internal Server Error" });
                }
                else {
                    resp.send(doc._id);
                }
            });
        });
    });
}

VideoServices.prototype.toReadableDate = function(date) {
    var day = date.getDate();
    var month = date.getMonth()+1;
    var year = date.getFullYear();
    var d = (month <= 9 ? '0' + month : month) + '/' + (day <= 9 ? '0' + day : day) + '/' + year;

    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();
    var h = (hour <= 9 ? '0' + hour : hour) + ':' + (min <= 9 ? '0' + min : min) + ':' + (sec <= 9 ? '0' + sec : sec);

    return d + ' ' + h;
}

VideoServices.prototype.deleteVideo = function(req, resp) {
    var id = req.params.id;
    this.db.collection("videosfs.files", function(err, collection) {
        collection.remove({'_id' : new BSON.ObjectID(id)},
            function(err, result) {
                if (err) {
                    console.warn(err);
                    resp.send(500, { error : "Internal Server Error" });
                }
                else {
                    resp.send(204);
                }
            });
    });
}

VideoServices.prototype.addComment = function(comment, connections) {
    var now = this.toReadableDate(new Date());
    var self = this;
    this.db.collection("videocomments", function(err, collection) {
        collection.update(
            { '_id' : new BSON.ObjectID(comment.videoId) }, 
            { '$push' : { 'comments' : { 'userId': comment.userId, 'text':comment.text, 'ts':now } } }, 
            { 'upsert' : true, 'multi' : false },
            function(err, result) {
                if (err) {
                    console.warn('ADD comment error : ' + err);
                }
                else {
                    connections[comment.videoId].forEach(function(destination) {
                        self.getComments(comment.videoId, destination);
                    });
                }
            });
    });
}

VideoServices.prototype.getComments = function(videoId, connection) {
    this.db.collection("videocomments", function(err, collection) {
        collection.findOne(
            { '_id' : new BSON.ObjectID(videoId) },
            function(err, result) {
                if (err != null || result == null) {
                    connection.sendUTF('[]');
                }
                else {
                    connection.sendUTF(JSON.stringify(result.comments.reverse()));
                }
            });
    });
}

exports.VideoServices = VideoServices;
