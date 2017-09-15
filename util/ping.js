const ping = require('ping');




/**
 * Cross platform config representation
 * @typedef {Object} PingConfig
 * @property {boolean} numeric - Map IP address to hostname or not
 * @property {number} timeout - Time duration for ping command to exit
 * @property {number} min_reply - Exit after sending number of ECHO_REQUEST
 * @property {string[]} extra - Optional options does not provided
 */


const cfg = {
    timeout: 10,
    // WARNING: -i 2 may not work in other platform like window
    extra: ["-i 2"],
};



module.exports = {
	pingto : function pingto(target) {
		return new Promise(function (resolve,reject){
			// console.log(target);
			const hosts = [target];
			hosts.forEach(function (host) {
			    ping.promise.probe(host)
			        .then(function (res) {
			        	// console.log(host);
			            resolve(res);
			        });
			},cfg);
		});
	}
}
