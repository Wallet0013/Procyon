const co          = require('co');
const moment      = require('moment');
const MongoClient = require("mongodb").MongoClient;
const url = "mongodb://200.200.0.3:27017/procyon";

let db;
let limit;

function getPingCollection(source,destnation,alive) {
  co(function* (){
    try{
      let souceQuery = null;
      let destnationQuery = null
      let aliveQuery = null;
      if(source){
        souceQuery = JSON.stringify({source :{ $regex: ".*" + source + ".*"}});
      }
      if(destnation){
        destnationQuery = JSON.stringify({destnation :{ $regex: ".*" + destnation + ".*"}});
      }
      if(alive){
        aliveQuery = JSON.stringify({alive :{ $regex: ".*" + alive + ".*"}});
      }
      // console.log( souceQuery + destnationQuery + aliveQuery );
      const QueryParam = JSON.parse(souceQuery,destnationQuery,aliveQuery);
      // console.log(QueryParam);
      db = yield MongoClient.connect(url);
      let pinglog = yield db.collection("ping").find(QueryParam).sort({_id: -1}).limit(limit).toArray()
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
      setInterval(getPingCollection,body.interval,body.source,body.destnation,body.alive);

  }).catch(function(err){
    process.on('unhandledRejection', console.log(err));
  });
});



console.log("--- boot mongo ping watcher");

