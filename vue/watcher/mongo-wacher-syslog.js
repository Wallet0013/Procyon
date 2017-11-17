const co          = require('co');
const moment      = require('moment');
const MongoClient = require("mongodb").MongoClient;
const url         = "mongodb://200.200.0.3:27017/procyon";

const mongo       = require("../util/mongo");

let db;
let limit;

function getSyslogCollection() {
  co(function* (){
    try{
      db = yield MongoClient.connect(url);
      let syslog = yield db.collection("syslog").find().sort({_id: -1}).limit(limit).toArray()
      db.close();
      process.send(syslog);
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
      setInterval(getSyslogCollection,body.interval);

  }).catch(function(err){
    process.on('unhandledRejection', console.log(err));
  });
});

console.log("--- boot mongo syslog watcher");

