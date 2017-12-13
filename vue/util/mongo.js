const MongoClient 	= require("mongodb").MongoClient;

const dbAddr 		= "200.200.0.3";
const url 			= "mongodb://" + dbAddr + ":27017/procyon";
const co 			= require("co");
const os 			= require('os');


module.exports = {
	getStatus : function getStatus() {
		return new Promise(function (resolve,reject){
			co(function* () {
				try{
					const db = yield MongoClient.connect(url);
					yield db.close();
					resolve(0);
				}catch(e){
					reject(127);
				}

			}).catch(function(err){
				process.on('unhandledRejection', console.log(err));
			});

		});
	},
	getSyslogCollection : function getSyslogCollection(limit,QueryParam) {
		return new Promise(function (resolve,reject){
			co(function* () {
				try{
					db = yield MongoClient.connect(url);
					let pinglog;
					if (QueryParam == undefined){
						QueryParam = {};
					}
					// console.log("QueryParam",QueryParam);
					let logs =  db.collection("syslog").aggregate([
						{$match:QueryParam},
						{$sort:{timestamp: -1}},
						{$lookup:
					    	{
					        	from:"resolve",
					        	localField:"address",
					        	foreignField:"ip",
					        	as:"address_resolve"
					    	}
						},
						{$unwind:"$address_resolve"},
						{$limit: limit}
					],{ allowDiskUse: true },function(err, result) {
						if (err){
							db.close();
							reject(err);
							console.log(err);
						}
						db.close();
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
	},

	getPingCollection : function getPingCollection(limit,QueryParam) {
		return new Promise(function (resolve,reject){
			co(function* () {
				try{
					db = yield MongoClient.connect(url);
					let pinglog;
					if (QueryParam == undefined){
						QueryParam = {};
					}
					let logs =  db.collection("ping").aggregate([
						{$match:QueryParam},
						{$sort:{timestamp: -1}},
						{$lookup:
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
						{$lookup:
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
							db.close();
							reject(err);
							console.log(err);
						}
						db.close();
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
	},
	getAllPingCollectionCnt : function getAllPingCollectionCnt() {
		return new Promise(function (resolve,reject){
			co(function* () {
				try{
					db = yield MongoClient.connect(url);
					resolve(yield db.collection("ping").find().count());
				}catch(e){
					console.log("error : " + e);
					reject(127);
				}

			}).catch(function(err){
				process.on('unhandledRejection', console.log(err));
			});

		});
	},
	getAllPingCollection : function getAllPingCollection() {
		return new Promise(function (resolve,reject){
			co(function* () {
				try{
					db = yield MongoClient.connect(url);
					db.collection("ping").find().toArray(function(err, result) {
						if (err){
							db.close();
							reject(err);
							console.log(err);
						}
						db.close();
						resolve(result);
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
	},
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

				// get last docker number
				const result = yield db.collection("networks").find({ip:value}).toArray();
				yield db.close();
				if(result.length == 1){
					resolve(result[0].network_id);
				} else if (result.length == 0){
					// if there is not exist network
					resolve("00000");
				} else{
					reject("error the network too many");

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
				const result = yield db.collection("networks").find({network_name:name}).toArray();

				yield db.close();
				resolve(result[0].vlan);

			}).catch(function(err){
				process.on('unhandledRejection', console.log(err));
			});

		});
	},
	// get docker name from service ip
	getDockerName : function getDockerName(ip) {
		return new Promise(function (resolve,reject){
			co(function* () {
				const db = yield MongoClient.connect(url);

				const result = yield db.collection("container").find({service_ip:ip}).toArray();
				yield db.close();
				resolve(result[0].docker_name);

			}).catch(function(err){
				process.on('unhandledRejection', console.log(err));
			});

		});
	},
	// get docker infomation to reload created container
	getDockreInfomation : function getDockreInfomation() {
		return new Promise(function (resolve,reject){
			co(function* () {
				let db;
				try{
					db = yield MongoClient.connect(url);
					const result = yield db.collection("container").find().toArray();
					yield db.close();
					let value = new Array();
					for(i=0;i < result.length; i++){
						value.push({
							management_ip:result[i].management_ip,
		          			service_ip:result[i].service_ip,
		         			network:result[i].ip,
		          			vlan:result[i].vlan
						})
					}
					resolve(value);
				} catch(e){
					reject();
				}


			}).catch(function(err){
				process.on('unhandledRejection', console.log(err));
			});

		});
	},
	// get resoleve record
	getRecord : function getRecord() {
		return new Promise(function (resolve,reject){
			co(function* () {
				const db = yield MongoClient.connect(url);

				// get last docker number
				const result = yield db.collection("resolve").find().toArray();
				yield db.close();
				resolve(result);


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

				console.log(value);

				yield db.close();
				resolve(0);

			}).catch(function(err){
				process.on('unhandledRejection', console.log(err));
			});

		});
	},
	registRecord : function registRecord(record,callback){
		return new Promise(function (resolve,reject){
			co(function* () {
				const db = yield MongoClient.connect(url);

				for (data of record){
					const result = yield db.collection("resolve").find({ip:data.ip}).toArray();

					for (i of result){
						yield db.collection("resolve").remove({ip:i.ip});
						console.log("remove",i);
					}
				}

				db.collection("resolve").insert(record);
				// console.log(record);
				yield db.close();
				resolve(0);
				callback();

			}).catch(function(err){
				process.on('unhandledRejection', console.log(err));
			});

		});
	},
	dropRecord : function dropRecord(callback){
		return new Promise(function (resolve,reject){
			co(function* () {
				const db = yield MongoClient.connect(url);

				yield db.collection("resolve").remove();

				yield db.close();
				resolve(0);
				callback();

			}).catch(function(err){
				process.on('unhandledRejection', console.log(err));
			});

		});
	},
	deleteDockerNW : function deleteDockerNW(value) {
		return new Promise(function (resolve,reject){
			co(function* () {
				const db = yield MongoClient.connect(url);

				const result = yield db.collection("container").remove({docker_name:value});
				yield db.close();


				resolve(0);

			}).catch(function(err){
				process.on('unhandledRejection', console.log(err));
			});

		});
	},
	flushContainer : function flushContainer() {
		return new Promise(function (resolve,reject){
			co(function* () {
				const db = yield MongoClient.connect(url);

				const result = yield db.collection("container").remove();
				console.log("all datas is removed in `container` collection");
				yield db.close();


				resolve(0);

			}).catch(function(err){
				process.on('unhandledRejection', console.log(err));
			});

		});
	},
	flushDockerNW : function flushDockerNW() {
		return new Promise(function (resolve,reject){
			co(function* () {
				const db = yield MongoClient.connect(url);

				const result = yield db.collection("networks").remove();
				console.log("all datas is removed in `networks` collection");
				yield db.close();


				resolve(0);

			}).catch(function(err){
				process.on('unhandledRejection', console.log(err));
			});

		});
	},
}
