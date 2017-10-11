const co            = require('co');
const moment        = require("moment");
const ipaddr        = require("ip");
const axios         = require("axios");
const promiseRetry  = require('promise-retry');
const child_process = require("child_process");

const mongo         = require("./util/mongo");
const procyon_node  = require("./util/procyon-node");

axios.defaults.timeout = 1000;

let ContainerTableValue = new Array();

let wacher = child_process.fork("./vue/mongo-wacher.js");

// startWacher();

function startWacher() {
  wacher.send({
    interval : 1000
  });

  wacher.on("message", function (result) {
      console.log(result);
  });
}


function addNetwork(existNW,networkCidr,nodeAdd) {
  return new Promise(function (resolve,reject){
    co(function* () {
      if (existNW  == 0){
        // get network number from mongo
        const nwNumber = yield mongo.getNetworknewnumber();
        if (nodeAdd.form.vlan){
          // is specific vlan
          yield nodeTool.$message("add network with vlan " + nodeAdd.form.vlan);
          /////////////
          ///// ここをvlanのコンフィグにするーー
          /////////////
          resolve(0);
        } else{
          // is not specific vlan
          nodeTool.$message("add network with native vlan");
          console.log("add network with native vlan");
          ////////////// check duplicate eth
          resolve(yield procyon_node.addNetwork_novlan(nwNumber,networkCidr,nodeAdd.form.IPrange,nodeAdd.form.gateway,nodeAdd.form.exclude));
        }
      }else{
        resolve(0);
      }
    });
  }).catch(function(err){
    process.on('unhandledRejection', console.log(err));
  });
}

const nodeTool = new Vue ({
  el: "#nodeTool",
  data : {
  },
  data() {
    return {
      nodeIP:'172.20.10.2/24',
      nodeGateway:'172.20.10.1',
      bootnodeDisabled:false
    }
  },
  methods : {
    bootNode() {
      co(function* () {
        // flush arp table;
        containerTable.flushArptable();

        // disable boot button
        nodeTool.bootnodeDisabled = true;

        nodeTool.$message("Booting Procyon node! Please wait about 3 minutes");
        const MachineStatus = yield procyon_node.getMachineStatus();
        const status = MachineStatus["Procyon-node-01"].status
        if( status == "running"){
          nodeTool.$message({message:"Procyon node is already running.",type:"warning"});
          // release boot button
          nodeTool.bootnodeDisabled = false;
        // } else if(status == "poweroff"){
        //     console.log("find procyon-node");
        //     nodeTool.$message({message:"find procyon-node",type:"info"});
        //     yield procyon_node.bootNode();
        //     nodeTool.bootnodeDisabled = false;

        } else{
          // console.log("status",status);
          let bootcnt = 180;
          const bootTimer = setInterval( () =>{
            bootcnt--;
            nodeTool.$message("Booting Timer " + bootcnt + " secounds");
          }, 1000);
          yield procyon_node.bootNode();

          // retry
          yield promiseRetry({
            retries: 5,
            factor: 3,
            minTimeout: 1 * 1000,
            maxTimeout: 10 * 1000
          },function (retry, number) {
            console.log('attempt number', number);
            return procyon_node.setMgmt(nodeTool.nodeIP,nodeTool.nodeGateway)
            // .catch(retry);
            .catch(function (err) {
                if (err.code === 'ETIMEDOUT') {
                    retry(err);
                    console.log("ssh error");
                }
                throw err;
            });
          })
          .then(function (value) {
            procyon_node.setMongo();
            nodeTool.bootnodeDisabled = false;
            clearInterval(bootTimer);
          }, function (err) {
            console.log("error");
          });

          // yield procyon_node.setMgmt(nodeTool.nodeIP,nodeTool.nodeGateway ,function(err){
          //   if (err) {
          //     nodeTool.$message({message:"Errorだよ",type:"error"});
          //   }
          // });

          /////// ツールボックスを開放

        }
      });
    },
    setAddress() {
      nodeTool.$message("Set ip address to Procyon node");
      procyon_node.setAddress(nodeTool.nodeIP,nodeTool.nodeGateway);
    },
    getVersion() {
      nodeTool.$message("Get vagrant version");
      procyon_node.getVersion();
    },
    haltNode() {
      nodeTool.$message("killing node");
      procyon_node.haltNode();

    },
    deleteNode() {
      nodeTool.$message("Delete Procyon node");
      procyon_node.deleteNode();
    }
  }
})

const topNav = new Vue({
  el : "#topNav",
  data() {
    return {
      activeIndex: '1'
    };
  },
  methods: {
    handleSelect(key, keyPath) {
      console.log(key, keyPath);
    }
  }
})


const nodeAdd = new Vue ({
  el: "#nodeAdd",
  data : {

  },
  data() {
    return {
      form:{
        vlan:"",
        IPaddr:"172.20.10.0/27",
        IPrange:"172.20.10.8/29",
        gateway:"172.20.10.1",
        exclude:""
      },
      addappDisabled:false
    }
  },
  methods : {
    addApp() {
      co(function* () {
        nodeAdd.addappDisabled = true;
        let dockerNumber;
        let nwNumber;

        // get network info from input
        const networkInfo = ipaddr.cidrSubnet(nodeAdd.form.IPaddr);
        const networkCidr = networkInfo.networkAddress + "/" + networkInfo.subnetMaskLength;

        // check network exist
        const existNW = yield mongo.existNetwork(networkCidr);

        // get docker number from mongo
        dockerNumber = yield mongo.getDockernumber();

        // add the network if the network not found
        const result = yield addNetwork(existNW,networkCidr,nodeAdd);

        // run app container
        nwNumber = yield mongo.getNetworkID(networkCidr);
        let dockerValue = yield procyon_node.runDocker(nwNumber,dockerNumber);

        // insert docker info to mongo
        const tmp = yield procyon_node.getDockerNetwork(nwNumber,dockerNumber);
        dockerValue.ip = yield mongo.getNetworkAddress(dockerValue.network_name);
        const tmpVlan = yield mongo.getNetworkVlan(dockerValue.network_name);
        if(tmpVlan){
          dockerValue.vlan = tmpVlan;
        }else{
          dockerValue.vlan = "native";
        }
        dockerValue.management_ip = tmp.split("\n")[0];
        dockerValue.service_ip = tmp.split("\n")[1];
        mongo.insertDockerNW(dockerValue);

        ContainerTableValue.push({
          management_ip:dockerValue.management_ip,
          service_ip:dockerValue.service_ip,
          network:dockerValue.ip,
          vlan:dockerValue.vlan
        });
        containerTable.containerData = ContainerTableValue;
        ResultArea.AppData = ContainerTableValue;
        nodeAdd.addappDisabled = false;
      });
    }
  }
})
const containerTable = new Vue({
  el: "#containerTable",
  data () {
    return {
      containerData : ContainerTableValue,
      reqConf:{
        timeout:1000,
        interval:1000,
        packetsize:54,
        hop:10
      }
    }
  },
  methods: {
    flushContainer(){
      co(function* () {
        yield procyon_node.flushContainer();
        yield mongo.flushDcokerNW();
        nodeTool.$message({message:"flush app",type:"warning"});
        ContainerTableValue = new Array();
        containerTable.containerData = ContainerTableValue;
        ResultArea.AppData = ContainerTableValue;
      });
    },
    flushArptable(){
      nodeTool.$message({message:"flush arp is require plivilede",type:"warning"});
      procyon_node.flushArptable();
    }
  }
})


const ResultArea = new Vue ({
  el:"#ResultArea",
  data(){
    return{
      AppData: ContainerTableValue,
      labelPosition: 'top',
      currentDate: new Date()
    }
  },
  methods: {
    startPing(data){
      // console.log("ping started",data);
      if (data.targetip == undefined){
        nodeTool.$message({message:"Target ip is null",type:"error"});
        return 127;
      }
      const status = true;
      this.isActive = false;
      axios.post("http://" + data.management_ip + ":50001/start_ping", {
        destnation:data.targetip,
        interval:containerTable.reqConf.interval,
        timeout:containerTable.reqConf.timeout,
        packetsize:containerTable.reqConf.packetsize
      })
      .then(res => {
        this.sending = false
        nodeTool.$message({message:"success ping request ",type:"info"});
        console.log(res.status, res.statusText, res.data)
        // console.log(this);
      })
      .catch(error => {
        this.sending = false
        nodeTool.$message({message:"fail ping request",type:"error"});

        throw error
      })
    },
    startTraceroute(data){
      // console.log("ping started",data);
      if (data.targetip == undefined){
        nodeTool.$message({message:"Target ip is null",type:"error"});
        return 127;
      }
      const status = true;
      this.isActive = false;
      axios.post("http://" + data.management_ip + ":50001/start_traceroute", {
        destnation:data.targetip,
        hop:containerTable.reqConf.hop,
        timeout:containerTable.reqConf.timeout
      })
      .then(res => {
        this.sending = false
        nodeTool.$message({message:"success traceroute request ",type:"info"});
        console.log(res.status, res.statusText, res.data)
        // console.log(this);
      })
      .catch(error => {
        this.sending = false
        nodeTool.$message({message:"fail traceroute request",type:"error"});

        throw error
      })
    },
    deleteContainer(data) {
      co(function* () {
        const dockerName = yield mongo.getDockerName(data.service_ip);
        yield procyon_node.deleteContainer(dockerName);
        yield mongo.deleteDockerNW(dockerName);
        nodeTool.$message({message:"delete app",type:"warning"});
        for(i=0; i<ContainerTableValue.length; i++){
            if(ContainerTableValue[i].management_ip == data.management_ip){
                ContainerTableValue.splice(i, 1);
            }
        }
        ResultArea.AppData = ContainerTableValue;
      });
    }
  }
})


const LogArea = new Vue({
  el: "#LogArea",
  data (){
    return{
      tableData:[{
        timestamp:"aaa",
        source:"source",
        dest:"dest"

      }]
    }
  },
  methods: {
    printMongo(){
      // setInterval(() =>{
      //   console.log("tets");
      // },1000)
      startWacher();
    }
  }
})


// let pinglog = new Array();
// const pingBox = new Vue ({
//   el: "#pingBox",
//   data : {

//   },
//   data() {
//     return {
//       input: "10.135.57.254"
//     }
//   },
//   methods : {
//     ping() {
//       co(function* () {
//         const response = yield pingTools.pingto(pingBox.input);
//         // console.log(response);
//         // pinglog.unshift(response);
//         mongo.insert_pinglog(response);
//         pinglog.unshift({
//           date: moment().format(),
//           time: response.time,
//           alive: "test",
//           host: response.host,
//           ip:response.numeric_host,
//           output: response.output
//         });
//         resultBox.tableData = pinglog;
//         // resultBox.results = pinglog;
//         // return response;
//       });
//     }
//   }
// })

// const resultBox = new Vue ({
//     el: "#resultBox",
//     data: {
//       results : "",
//       tableData : ""
//     },
//     data() {
//       return {
//         tableData: null
//       }
//     }
// })

