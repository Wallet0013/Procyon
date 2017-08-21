const co = require('co');
const pingTools = require("./util/ping");


function pingto(input) {
  co(function *() {
    const response = yield pingTools.pingto();
    console.log(input);
    console.log(response);
  });
}


var Main = new Vue ({
  el: "#pingBox",
  data : {
    target : ""
  },
  data() {
    return {
      input: '10.135.57.254'
    }
  },
  methods : {
    ping() {
      pingto(input);
      // console.log("aa");
    }
  }
})