const co          = require('co');
const moment      = require('moment');
const MongoClient = require("mongodb").MongoClient;
const _           = require("lodash");
const url         = "mongodb://200.200.0.3:27017/procyon";

const mongo       = require("../util/mongo");

let db;
let limit;
function getPingCollectionfromDB(db,limit,QueryParam,TimeStamp) {
    return new Promise(function (resolve,reject){
      co(function* () {
        try{
          let pinglog;
          if (QueryParam == undefined){
            QueryParam = {};
          }
          if (TimeStamp == undefined){
            TimeStamp = {};
          }
          let logs =  db.collection("ping").aggregate([
            {$match:{ $and : [QueryParam,TimeStamp]}},
            {$sort:{timestamp: -1}},
            {$lookup: // join
                {
                    from:"resolve",
                    localField:"source",
                    foreignField:"ip",
                    as:"source_resolve"
                }
            },
            {$unwind:
              {
                      path:"$source_resolve",
                      preserveNullAndEmptyArrays: true
                  }
                },
            {$lookup: //join
                {
                    from:"resolve",
                    localField:"destnation",
                    foreignField:"ip",
                    as:"destnation_resolve"
                }
            },
            {$unwind:
              {
                      path:"$destnation_resolve",
                      preserveNullAndEmptyArrays: true
                  }
                },
            {$limit: limit}
          ],{ allowDiskUse: true },function(err, result) {
            if (err){
              // db.close();
              reject(err);
              console.log(err);
            }
            // db.close();
            resolve(result);
            // console.log("result",result);
          });
          // db.close();
          // resolve(pinglog);
        }catch(e){
          console.log("error : " + e);
          reject(127);
        }

      }).catch(function(err){
        process.on('unhandledRejection', console.log(err));
      });

    });
}


function parsequery(db,limit,time,source,destnation,alive) {
  co(function* (){
    try{
      let souceQuery      = null;
      let destnationQuery = null;
      let aliveQuery      = null;

      if(source){
        souceQuery = JSON.stringify({source :{ $regex: ".*" + source + ".*"}});
      }
      if(destnation){
        destnationQuery = JSON.stringify({destnation :{ $regex: ".*" + destnation + ".*"}});
      }
      if(alive){
        aliveQuery = JSON.stringify({alive :{ $regex: ".*" + alive + ".*"}});
      }
      const QueryParam = JSON.parse(souceQuery,destnationQuery,aliveQuery);

      let timestampQuery = JSON.stringify({timestamp:{$gt:Number(moment().subtract(time,'minutes').format('x'))}});
      const TimeStamp = JSON.parse(timestampQuery);

      let pinglog = yield getPingCollectionfromDB(db,limit,QueryParam,TimeStamp);

      // // get last of timestamp
      process.send(pinglog);
    }catch(e){
      console.log(e);
      db.close();
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
      db = yield MongoClient.connect(url);
      setInterval(parsequery,body.interval,db,limit,body.time,body.source,body.destnation,body.alive);

  }).catch(function(err){
    process.on('unhandledRejection', console.log(err));
  });
});



console.log("--- boot mongo ping watcher");

