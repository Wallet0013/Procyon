const co          = require('co');
const moment      = require('moment');
const MongoClient = require("mongodb").MongoClient;
const mongo_host  = process.argv[2];
const url = "mongodb://200.200.0.3:27017/procyon";

let db;

function funcPing(dest,timeout,packetsize,ttl){
  return new Promise(function (resolve,reject){
    const options = {
        // networkProtocol: ping.NetworkProtocol.IPv4,
        packetSize: parseInt(packetsize),
        retries: 0,
        timeout: parseInt(timeout),
        ttl: parseInt(ttl)
    };
    // console.log(options);
    const session = net_ping.createSession (options);

    session.pingHost (dest, function (error, target,sent, rcvd) {
      const ms = rcvd - sent;
      let alive;
      const value = {
        source : souceInt,
        target:target,
          timestamp:microtime.nowStruct(sent),
          microsec:ms,
          alive : error ? false : true,
          error: error ? error.toString() : null
      };
        if (error)
            console.log (target + ": " + error.toString ());
        else
            // console.log (target + ": Alive");
          console.log(value);
          resolve(value);
    });

  });
}

function startPing(db,body) {
  co(function* (){
    // run ping
    const ping_result = yield funcPing(body.destnation,body.timeout,body.packetsize,body.ttl);

    const value =  {
      "source" : souceInt,
      "destnation" : ping_result.target,
      "microsec" : ping_result.microsec,
      "alive" : ping_result.alive,
      "packetsize" : body.packetsize,
      "timestamp" : ping_result.timestamp,
      "error" : ping_result.error
    }

    // insert ping result to mongodb
    yield db.collection("ping").insertOne(value);

    process.send(value);
    // process.send("value");

  }).catch(function(err){
    process.on('unhandledRejection', console.log(err));
  });

}

process.on("message", function (body) {
  co(function* (){
      console.log("get message");
      db = yield MongoClient.connect(url);
      // if(body.sighup){
      //   yield db.close();
      //   console.log("--- end ping");
      //   process.exit();
      // }
      // console.log("--- start ping");
      // db = yield MongoClient.connect(url);
      // setInterval(function() {
      //   startPing(db,body);
      // }, body.interval);

  }).catch(function(err){
    process.on('unhandledRejection', console.log(err));
  });
});

process.on("close", function () {
    console.log("--- end ping");
});


console.log(" boot mongo watcher");

