const co          = require('co');
const moment      = require('moment');
const MongoClient = require("mongodb").MongoClient;
const url = "mongodb://200.200.0.3:27017/procyon";

let db;
let limit;

function startPing(db,body) {
  co(function* (){
    process.send(value);
  }).catch(function(err){
    process.on('unhandledRejection', console.log(err));
  });
}

function getPingCollection() {
  co(function* (){

    try{
      db = yield MongoClient.connect(url);
      let pinglog = yield db.collection("ping").find().sort({_id: -1}).limit(limit).toArray()
      db.close();
      process.send(pinglog);
    }catch(e){
      console.log(e);
      process.exit();
    }

  }).catch(function(err){
    process.on('unhandledRejection', console.log(err));
  });
}


process.on("message", function (body) {
  co(function* (){
      console.log("--- get message");
      limit = Number(body.limit);
      // getPingCollection;
      setInterval(getPingCollection,body.interval);

  }).catch(function(err){
    process.on('unhandledRejection', console.log(err));
  });
});



console.log("--- boot mongo watcher");

