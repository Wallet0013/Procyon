const MongoClient 	= require("mongodb").MongoClient;
const dbAddr 		= "200.200.0.3";
const url 			= "mongodb://" + dbAddr + ":27017/procyon";
const co 			= require("co");
const os 			= require('os');



module.exports = {
	getDockernumber : function getDockernumber() {
		return new Promise(function (resolve,reject){
			co(function* () {
				const db = yield MongoClient.connect(url);

				// docker numberのラストを受け取る
				const result = yield db.collection("container").find().sort({'docker_id':-1}).limit(1).toArray();
				let newnumber;
				// console.log("length",result.length);
				if(result.length == 1){
					newnumber = "00000" + (+result[0].docker_id + 1);
					newnumber = newnumber.slice(-5);
				} else{
					newnumber = "00000"
				}

				yield db.close();
				resolve(newnumber);

			}).catch(function(err){
				process.on('unhandledRejection', console.log(err));
			});

		});
	},
	getNetworkID : function getNetworkID(value) {
		return new Promise(function (resolve,reject){
			co(function* () {
				const db = yield MongoClient.connect(url);

				// docker numberのラストを受け取る
				const result = yield db.collection("networks").find({ip:value}).toArray();
				yield db.close();
				// console.log(result.length);
				if(result.length == 1){
					resolve(result[0].network_id);
				} else{
					reject("error the network too many or not found");
				}


			}).catch(function(err){
				process.on('unhandledRejection', console.log(err));
			});

		});
	},
	/// get lastest + 1 network id
	getNetworknewnumber : function getNetworknewnumber() {
		return new Promise(function (resolve,reject){
			co(function* () {
				const db = yield MongoClient.connect(url);

				// docker numberのラストを受け取る
				const result = yield db.collection("networks").find().sort({'network_id':-1}).limit(1).toArray();
				let newnumber;
				// console.log("length",result.length);
				if(result.length == 1){
					newnumber = "00000" + (+result[0].network_id + 1);
					newnumber = newnumber.slice(-5);
				} else{
					newnumber = "00000"
				}

				yield db.close();
				resolve(newnumber);

			}).catch(function(err){
				process.on('unhandledRejection', console.log(err));
			});

		});
	},
	/// get network address from network name
	getNetworkAddress : function getNetworkAddress(name) {
		return new Promise(function (resolve,reject){
			co(function* () {
				const db = yield MongoClient.connect(url);
				console.log(name);
				const result = yield db.collection("networks").find({network_name:name}).toArray();

				yield db.close();
				resolve(result[0].ip);

			}).catch(function(err){
				process.on('unhandledRejection', console.log(err));
			});

		});
	},
	/// get network vlan from network name
	getNetworkVlan : function getNetworkVlan(name) {
		return new Promise(function (resolve,reject){
			co(function* () {
				const db = yield MongoClient.connect(url);
				console.log(name);
				const result = yield db.collection("networks").find({network_name:name}).toArray();

				yield db.close();
				resolve(result[0].vlan);

			}).catch(function(err){
				process.on('unhandledRejection', console.log(err));
			});

		});
	},
	// check the network is already exist
	existNetwork : function existNetwork(value) {
		return new Promise(function (resolve,reject){
			co(function* () {
				const db = yield MongoClient.connect(url);

				// find 処理
				const result = yield db.collection("networks").find({ip:value}).toArray();
				yield db.close();
				// console.log("length",result.length);
				if(result.length >= 1){
					// console.log("find NW");
					resolve(1)
				} else{
					// console.log("not found NW");
					resolve(0);
				}

			}).catch(function(err){
				process.on('unhandledRejection', console.log(err));
			});

		});
	},
	insertNetwork : function insertNetwork(value) {
		return new Promise(function (resolve,reject){
			co(function* () {
				const db = yield MongoClient.connect(url);
				db.collection("networks").insertOne(value);
				const sourceIF = os.networkInterfaces();

				console.log(value);

				yield db.close();
				resolve(0);

			}).catch(function(err){
				process.on('unhandledRejection', console.log(err));
			});

		});
	},
	insertDockerNW : function insertDockerNW(value) {
		return new Promise(function (resolve,reject){
			co(function* () {
				const db = yield MongoClient.connect(url);
				db.collection("container").insertOne(value);
				const sourceIF = os.networkInterfaces();

				console.log(value);

				yield db.close();
				resolve(0);

			}).catch(function(err){
				process.on('unhandledRejection', console.log(err));
			});

		});
	},
	deleteDockerNW : function deleteDockerNW(value) {
		return new Promise(function (resolve,reject){
			co(function* () {
				const db = yield MongoClient.connect(url);

				const result = yield db.collection("container").remove({docker_name:value.name});
				yield db.close();


				resolve(0);

			}).catch(function(err){
				process.on('unhandledRejection', console.log(err));
			});

		});
	},
	flushDcokerNW : function flushDcokerNW() {
		return new Promise(function (resolve,reject){
			co(function* () {
				const db = yield MongoClient.connect(url);

				const result = yield db.collection("container").remove();
				console.log("removed");
				yield db.close();


				resolve(0);

			}).catch(function(err){
				process.on('unhandledRejection', console.log(err));
			});

		});
	},
}
