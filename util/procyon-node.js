const vagrant 		= require('node-vagrant');
const Client		= require('ssh2').Client;
const vagrantfile 	= "./vagrant/";
const mongo         = require("./mongo");
const moment        = require("moment");
const sudo 			= require('sudo-prompt');
const os 			= require('os');
const S 			= require('string');

const machine = vagrant.create({ cwd: vagrantfile, env: process.env });

const ssh_config = {
			  host: '200.200.0.2',
			  port: 22,
			  username: 'rancher',
			  password: 'rancher'
			};

module.exports = {
	getStatus : function getStatus() {
		return new Promise(function (resolve,reject){
			vagrant.globalStatus('--prune',function(err,out){
				nodeTool.$message({message:err+ out,type:"warning"});
				console.log("get status",err, out);
				resolve(out);
			})
		});
	},
	getMachineStatus : function getMachineStatus() {
		return new Promise(function (resolve,reject){
			machine.status(function(err,out){
				// nodeTool.$message({message:err+ out,type:"warning"});
				// console.log(err, out);
				resolve(out);
			})
		});
	},
	getVersion : function getVersion() {
		return new Promise(function (resolve,reject){
			vagrant.version(function(err,out){
				console.log(err, out);
				// split first row
				nodeTool.$message({message:out.split(/\r\n|\r|\n/)[0],type:"info"});
				const h = nodeTool.$createElement;

			})
			resolve(0);
		});
	},
	getDockerNetwork : function getDockerNetwork(nwNumber,dockerNumber) {
		return new Promise(function (resolve,reject){

			let value;

			const conn = new Client();
			conn.on('ready', function() {
				// console.log('Client :: ready');
				conn.exec(
					"docker inspect -f '{{.NetworkSettings.Networks.mgmt_net.IPAddress}}'" + " procyon-node-app" + dockerNumber + " &&" +
					"docker inspect -f '{{.NetworkSettings.Networks."  + "dedicated_net" + nwNumber + ".IPAddress}}'" + " procyon-node-app" + dockerNumber
				, function(err, stream) {
					if (err) throw err;
					stream.on('close', function(code, signal) {
						// console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
						conn.end();
						resolve(value);

					}).on('data', function(data) {
						if(value){
							value += data;
						}else{
							value = data;
						}
						console.log('STDOUT: ' + data);
					}).stderr.on('data', function(data) {
						console.log('STDERR: ' + data);
						// nodeTool.$message({message:data,type:"error"});
					});

				});
			}).connect(ssh_config);


		});
	},
	haltNode : function haltNode() {
		return new Promise(function (resolve,reject){
			machine.halt(function (err, out) {
				nodeTool.$message({message:"shutdown node",type:"info"});
				if (err) {
					throw new Error(err);
				}
				resolve(0);
			});
		});
	},
	bootNode : function bootNode() {
		return new Promise(function (resolve,reject){
			machine.up(function (err, out) {
				nodeTool.$message({message:"Procyon node is running.",type:"info"});
				console.log("booted");
				if (err) {
					throw new Error(err);
				}
				resolve(0);
			});
		});
	},
	runDocker : function runDocker(nwNumber,dockerNumber) {
		return new Promise(function (resolve,reject){
			const value = {
				docker_id : dockerNumber,
				network_id : nwNumber,
				docker_name : "procyon-node-app" + dockerNumber,
				network_name: "dedicated_net" + nwNumber,
				timestamp:moment().format()
			}
			const conn = new Client();
			conn.on('ready', function() {
				// console.log('Client :: ready');
				conn.exec(
					"docker run --name procyon-node-app" + dockerNumber + " -e TZ=Asia/Tokyo --net=mgmt_net -d wallet0013/procyon-node-app:1.0 node app.js 200.200.0.3 200.200.0.1:50001" + " &&" +
					"docker network connect dedicated_net" + nwNumber + " procyon-node-app" + dockerNumber
				, function(err, stream) {
					if (err) throw err;
					stream.on('close', function(code, signal) {
						console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
						conn.end();

						if(code == 0){
							resolve(value);

						}
					}).on('data', function(data) {
						nodeTool.$message({message:"created app",type:"info"});
						console.log('STDOUT: ' + data);
					}).stderr.on('data', function(data) {
						console.log('STDERR: ' + data);
					});

				});
			}).connect(ssh_config);
		});
	},
	flushContainer : function flushContainer(data) {
		return new Promise(function (resolve,reject){
			const conn = new Client();
			conn.on('ready', function() {
				// console.log('Client :: ready');
				// console.log(data);
				const command = "docker rm -f `docker ps -a -q -f \"name=procyon-node-app*\"`";
				console.log(command);
				conn.exec(command, function(err, stream) {
					if (err) throw err;
					stream.on('close', function(code, signal) {
						console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
						conn.end();

						if(code == 0){
							resolve(0);
						}
					}).on('data', function(data) {
						console.log('STDOUT: ' + data);
					}).stderr.on('data', function(data) {
						resolve(0);
						console.log("no container at all");
						// console.log('STDERR: ' + data);
					});

				});
			}).connect(ssh_config);
		});
	},
	flushArptable : function flushArptable() {
		return new Promise(function (resolve,reject){
			// console.log("called flush arp table");
			// const platform = ;
			const command = S(os.platform()).contains(/^win/) ? "arp -d" : 'arp -a -d';
			console.log(command);
			sudo.exec(command, {name: 'Procyon'},
			  function(error, stdout, stderr) {
			    if (error) throw error;
			    console.log('stdout: ' + stdout);
			  }
			);
		});
	},
	addNetwork_novlan : function addNetwork_novlan(number,ip,range,gateway,exclude) {
		return new Promise(function (resolve,reject){
			const value = {
				network_id : number,
				vlan : null,
				ip: ip,
				gateway: gateway,
				network_name: "dedicated_net" + number,
				timestamp:moment().format()
			}

			let command;
			if(range){
				command = "sudo docker network create --driver macvlan --subnet=" + ip + " --gateway=" + gateway + " --ip-range=" + range + " -o parent=eth1 dedicated_net" + number + " ; sleep 5"
			}else{
				command = "sudo docker network create --driver macvlan --subnet=" + ip + " --gateway=" + gateway + " -o parent=eth1 dedicated_net" + number + " ; sleep 5"
			}

			// create network
			const conn = new Client();
			conn.on('ready', function() {
				console.log('Client :: ready');
				conn.exec(command, function(err, stream) {
					if (err) throw err;
					stream.on('close', function(code, signal) {
						console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
						conn.end();
						// insert db when success
						if(code == 0){
							mongo.insertNetwork(value);
							resolve(0);
						}
					}).on('data', function(data) {
						console.log('STDOUT: ' + data);
					}).stderr.on('data', function(data) {
						console.log('STDERR: ' + data);
					});

				});
			}).connect(ssh_config);

		});
	},
	setMgmt : function setMgmt(ip,gateway,callback) {
		return new Promise(function (resolve,reject){
			const conn = new Client();
			conn.on('ready', function() {
				console.log('Client :: ready');
				conn.exec(
					"sudo ip link del docker0 ; sudo ip link del docker-sys && " +
					"sudo ip link set eth0 down && " +
					"sudo ros config set rancher.network.interfaces.eth1.address " + ip + " && " +
					"sudo ros config set rancher.network.interfaces.eth1.gateway " + gateway + " && " +
					// "sudo ros config set rancher.network.interfaces.eth0.address 0.0.0.0 && " +
					"sudo system-docker restart network && " +
					"docker network create --driver=macvlan --subnet=200.200.0.0/16 --ip-range=200.200.128.0/17 -o parent=eth2 mgmt_net"
				, function(err, stream) {
					if (err) {
						throw err;
						nodeTool.$message({message:"Error ssh connecton. Please retry",type:"error"});
					}
					stream.on('close', function(code, signal) {
						nodeTool.$message({message:"Management network is created.",type:"info"});
						console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
						conn.end();
					}).on('data', function(data) {
						console.log('STDOUT: ' + data);
					}).stderr.on('data', function(data) {
						console.log('STDERR: ' + data);
					});
				});
			}).connect(ssh_config);
			resolve(0);
			callback();
		});
	},
	setMongo : function setMongo(ip,gateway) {
		return new Promise(function (resolve,reject){
			const conn = new Client();
			conn.on('ready', function() {
				console.log('Client :: ready');
				conn.exec(
					"sleep 5 ; " +
					"docker run --name procyon-node-mongo -e TZ=Asia/Tokyo  --net=mgmt_net --ip 200.200.0.3 -d mongo:3.4.7"
					, function(err, stream) {
					if (err) throw err;
					stream.on('close', function(code, signal) {
						nodeTool.$message({message:"Created mongoDB.",type:"info"});
						console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
						conn.end();
					}).on('data', function(data) {
						console.log('STDOUT: ' + data);
					}).stderr.on('data', function(data) {
						nodeTool.$message({message:data,type:"error"});
						console.log('STDERR: ' + data);
					});
				});
			}).connect(ssh_config);
			resolve(0);
		});
	},
	setAddress : function setAddress(ip,gateway) {
		return new Promise(function (resolve,reject){
			const conn = new Client();
			conn.on('ready', function() {
				console.log('Client :: ready');
				conn.exec(
					"sudo ros config set rancher.network.interfaces.eth1.address " + ip + " && " +
					"sudo ros config set rancher.network.interfaces.eth1.gateway " + gateway + " && " +
					"sudo system-docker restart network"
				, function(err, stream) {
					if (err) throw err;
					stream.on('close', function(code, signal) {
						console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
						conn.end();
					}).on('data', function(data) {
						console.log('STDOUT: ' + data);
					}).stderr.on('data', function(data) {
						console.log('STDERR: ' + data);
					});
				});
			}).connect(ssh_config);
			resolve(0);
		});
	},
	deleteNode : function deleteNode() {
		return new Promise(function (resolve,reject){
			machine.destroy(function (err, out) {
				nodeTool.$message({message:"Procyon node is deleted",type:"info"});
				console.log(err, out);
			});
			resolve(0);
		});
	},
	deleteContainer : function deleteContainer(data) {
		return new Promise(function (resolve,reject){
			const conn = new Client();
			conn.on('ready', function() {
				// console.log('Client :: ready');
				// console.log(data);
				const command = "docker rm -f " + data;
				console.log(command);
				conn.exec(command, function(err, stream) {
					if (err) throw err;
					stream.on('close', function(code, signal) {
						console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
						conn.end();

						if(code == 0){
							resolve(0);
						}
					}).on('data', function(data) {
						console.log('STDOUT: ' + data);
					}).stderr.on('data', function(data) {
						console.log('STDERR: ' + data);
					});

				});
			}).connect(ssh_config);
		});
	},

}
