import ssh2			from 'ssh2';
import mongo        from "./mongo";
import vagrant 		from "node-vagrant";
import moment 		from "moment";
import sudo 		from 'sudo-prompt';
import os 			from 'os';
import S 			from 'string';

const Client = ssh2.Client;

const vagrantfile 	= "./vagrant/";
const machine = vagrant.create({ cwd: vagrantfile, env: process.env });

const ssh_config = {
			  host: '200.200.0.2',
			  port: 22,
			  username: 'vagrant',
			  password: 'vagrant'
			};
const mongoIP = "200.200.0.3";	// define mongo ip addr
const mongoApp = "mongo:3.4.7";	// define mongo docker



export default {
	getStatus() {
		return new Promise(function (resolve,reject){
			vagrant.globalStatus('--prune',function(err,out){
				console.log("get status",err, out);
				resolve(out);
			})
		});
	},
	getMachineStatus() {
		return new Promise(function (resolve,reject){
			machine.status(function(err,out){
				// console.log(err, out);
				resolve(out);
			})
		});
	},
	getVersion(callback) {
		return new Promise(function (resolve,reject){
			vagrant.version(function(err,out){
				// console.log(err, out);
				// split first row
				resolve(out);
				callback();

			})
		});
	},
	getDockerNetwork(nwNumber,dockerNumber,type) {
		return new Promise(function (resolve,reject){
			let value;
			const command =
				"sudo docker inspect -f '{{.NetworkSettings.Networks.mgmt_net.IPAddress}}'" + " procyon-node-" + type + dockerNumber + " &&" +
				"sudo docker inspect -f '{{.NetworkSettings.Networks."  + "dedicated_net" + nwNumber + ".IPAddress}}'" + " procyon-node-" + type + dockerNumber;

			const conn = new Client();
			conn.on('ready', function() {
				// console.log('Client :: ready');
				conn.exec( command , function(err, stream) {
					if (err) throw err;
					stream.on('close', function(code, signal) {
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
						reject('STDERR: ' + data);
						console.log('STDERR: ' + data);
					});

				});
			}).connect(ssh_config);
		});
	},
	haltNode() {
		return new Promise(function (resolve,reject){
			machine.halt(function (err, out) {
				if (err) {
					throw new Error(err);
				}
				resolve(0);
			});
		});
	},
	bootNode(callback) {
		return new Promise(function (resolve,reject){
			machine.up(function (err, out) {
				if (err) {
					throw new Error(err);
				}
				callback();
				resolve(0);
			});
		});
	},
	runDocker(nwNumber,dockerNumber,type) {
		return new Promise(function (resolve,reject){
			const value = {
				docker_id : dockerNumber,
				network_id : nwNumber,
				docker_name : "procyon-node-" + type + dockerNumber,
				network_name: "dedicated_net" + nwNumber,
				type:type,
				timestamp:moment().format()
			}

			// judge docker type
			let command;
			let portNumber;
			switch (type) {
				case "app":
					command =
						"sudo docker run --name procyon-node-app" + dockerNumber + " -e TZ=Asia/Tokyo --net=mgmt_net -d wallet0013/procyon-node-app:1.0 node app.js " + mongoIP + " 200.200.0.1:50001" + " &&" +
						"sudo docker network connect dedicated_net" + nwNumber + " procyon-node-app" + dockerNumber;
					break;

				case "syslog":
					portNumber = "514";
					command =
						"sudo docker run --name procyon-node-syslog" + dockerNumber + " -e TZ=Asia/Tokyo --net=mgmt_net -d wallet0013/procyon-node-syslog:1.0 node index.js " + portNumber + " " + mongoIP + " &&" +
						"sudo docker network connect dedicated_net" + nwNumber + " procyon-node-syslog" + dockerNumber;
					break;
			}

			const conn = new Client();
			conn.on('ready', function() {
				conn.exec(command, function(err, stream) {
					if (err) throw err;
					stream.on('close', function(code, signal) {
						// console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
						conn.end();
						if(code == 0){ resolve(value); }
					}).on('data', function(data) {
						console.log("return data is :" + data);
						// messageArea.$message({message:"Created app : " + data,type:"info"});
					}).stderr.on('data', function(data) {
						console.log('STDERR: ' + data);
					});

				});
			}).connect(ssh_config);
		});
	},
	flushDockerNW(data) {
		return new Promise(function (resolve,reject){
			const command =
				"sudo docker network rm `sudo docker network ls -q -f \"name=dedicated_net*\"`";
			const conn = new Client();
			conn.on('ready', function() {
				console.log(command);
				conn.exec(command, function(err, stream) {
					if (err) throw err;
					stream.on('close', function(code, signal) {
						console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
						conn.end();
					}).on('data', function(data) {
						console.log('STDOUT: ' + data);
						resolve(0);
					}).stderr.on('data', function(data) {
						resolve(0);
						console.log("No Docker Netwrok at all");
					});

				});
			}).connect(ssh_config);
		});
	},
	flushContainer(data) {
		return new Promise(function (resolve,reject){
			const command =
				"sudo docker rm -f `sudo docker ps -a -q -f \"name=procyon-node-app*\"` && " +
				"sudo docker rm -f `sudo docker ps -a -q -f \"name=procyon-node-syslog*\"`";

			const conn = new Client();
			conn.on('ready', function() {
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
						console.log("No container at all");
					});

				});
			}).connect(ssh_config);
		});
	},
	flushArptable() {
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
	addNetwork_novlan(number,ip,range,gateway,exclude) {
		return new Promise(function (resolve,reject){
			const sleepTime = 1;
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
				command = "sudo docker network create --driver macvlan --subnet=" + ip + " --gateway=" + gateway + " --ip-range=" + range + " -o parent=enp0s8 dedicated_net" + number + " ; sleep " + sleepTime
			}else{
				command = "sudo docker network create --driver macvlan --subnet=" + ip + " --gateway=" + gateway + " -o parent=enp0s8 dedicated_net" + number + " ; sleep " + sleepTime
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
					}).on('data', function(data) {
						console.log('STDOUT: ' + data);
						// if(code == 0){
							mongo.insertNetwork(value);
							resolve(0);
						// }
					}).stderr.on('data', function(data) {
						reject('STDERR: ' + data);
						console.log('STDERR: ' + data);
					});

				});
			}).connect(ssh_config);

		});
	},
	setMgmt(ip,gateway,callback) {
		return new Promise(function (resolve,reject){
			const sleepTime = 7;
			const conn = new Client();
			conn.on('ready', function() {
				// console.log('Client :: ready');
				conn.exec(
					"sudo ip link del docker0 && " +
					"sudo ip link set enp0s3 down && " +
					"sudo ip addr del 10.10.10.10/24 dev enp0s8 &&" +
					"sudo ip addr add " + ip + " dev enp0s8 && " +
					"sudo ip route add default via " + gateway + " &&" +
					"sudo docker network create --driver=macvlan --subnet=200.200.0.0/16 --ip-range=200.200.128.0/17 -o parent=enp0s9 mgmt_net ; sleep " + sleepTime
				, function(err, stream) {
					if (err) {
						throw err;
						console.log('Error ssh connecton. Please retry: ' + data);
					}
					stream.on('close', function(code, signal) {
						// console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
						conn.end();
						callback();
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
	setMongo(callback) {
		return new Promise(function (resolve,reject){
			const conn = new Client();
			conn.on('ready', function() {
				const command = "sudo docker run --name procyon-node-mongo -e TZ=Asia/Tokyo  --net=mgmt_net --ip " + mongoIP + " -d " + mongoApp;
				console.log("command:",command);
				conn.exec(command, function(err, stream) {
					if (err) throw err;
					stream.on('close', function(code, signal) {
						conn.end();
						callback();
					}).on('data', function(data) {
						console.log('STDOUT: ' + data);
					}).stderr.on('data', function(data) {
						reject('STDERR: ' + data);
						console.log('STDERR: ' + data);
					});
				});
			}).connect(ssh_config);
			resolve(0);
		});
	},
	setNTP(ntp,callback) {
		return new Promise(function (resolve,reject){
			const conn = new Client();
			conn.on('ready', function() {
				conn.exec(
					// "sudo ntpdate " + ntp + " && " +
					"sudo sed -i -e '20,20d' /etc/chrony/chrony.conf && " +
					"sudo sed -i -e \"20i server " + ntp + " iburst\" /etc/chrony/chrony.conf && " +
					"sudo systemctl restart chrony"
				, function(err, stream) {
					if (err) throw err;
					stream.on('close', function(code, signal) {
						console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
						conn.end();
						callback();
					}).on('data', function(data) {
						console.log('STDOUT: ' + data);
					}).stderr.on('data', function(data) {
						reject('STDERR: ' + data);
						console.log('STDERR: ' + data);
					});
				});
			}).connect(ssh_config);
			resolve(0);
		});
	},
	setAddress(ip,gateway) {
		return new Promise(function (resolve,reject){
			const conn = new Client();
			conn.on('ready', function() {
				conn.exec(
					"sudo ip addr del 10.10.10.10/24 dev enp0s8 && " +
					"sudo ip addr add " + ip + " dev enp0s8 && " +
					"sudo ip route add default via " + gateway
				, function(err, stream) {
					if (err) throw err;
					stream.on('close', function(code, signal) {
						console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
						conn.end();
					}).on('data', function(data) {
						console.log('STDOUT: ' + data);
					}).stderr.on('data', function(data) {
						reject('STDERR: ' + data);
						console.log('STDERR: ' + data);
					});
				});
			}).connect(ssh_config);
			resolve(0);
		});
	},
	deleteNode(callback) {
		return new Promise(function (resolve,reject){
			machine.destroy(function (err, out) {
				console.log(err, out);
				callback();
			});
			resolve(0);
		});
	},
	deleteContainer(data) {
		return new Promise(function (resolve,reject){
			const conn = new Client();
			conn.on('ready', function() {
				const command = "sudo docker rm -f " + data;
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
						reject('STDERR: ' + data);
						console.log('STDERR: ' + data);
					});

				});
			}).connect(ssh_config);
		});
	}
}
