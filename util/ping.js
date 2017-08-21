const ping = require('ping');


const cfg = {
    timeout: 100,
    // WARNING: -i 2 may not work in other platform like window
    extra: ["-i 2"],
};

const DefaultGateway = "10.135.57.254";




module.exports = {
	pingto : function pingto() {
		return new Promise(function (resolve,reject){
			const hosts = [DefaultGateway];
			hosts.forEach(function (host) {
			    ping.promise.probe(host)
			        .then(function (res) {
			        	// console.log(res);
			        	// return res;
			            resolve(res);
			        });
			});
	});
	}
}
