const co            = require('co');
const moment        = require("moment");
const ipaddr        = require("ip");
const axios        = require("axios");

const pingTools     = require("./util/ping");
const mongo         = require("./util/mongo");
const procyon_node  = require("./util/procyon-node");


let ContainerTableValue = new Array();

const nodeTool = new Vue ({
  el: "#nodeTool",
  data : {
  },
  data() {
    return {
      nodeIP:'172.20.10.2/24',
      nodeGateway:'172.20.10.1'
    }
  },
  methods : {
    bootNode() {
      co(function* () {
        nodeTool.$message("Booting Procyon node! Please wait few minutes");
        // const status = yield procyon_node.getStatus();
        const MachineStatus = yield procyon_node.getMachineStatus();
        // console.log(MachineStatus);
        const status = MachineStatus["rancher-01"].status
        if( status == "running"){
          nodeTool.$message({message:"Procyon node is already running.",type:"warning"});
        } else{
          yield procyon_node.bootNode();
          yield procyon_node.setMgmt(nodeTool.nodeIP,nodeTool.nodeGateway ,function(err){
            if (err) {
              console.log("erroだよ。")
            }
          });
          yield procyon_node.setMongo();

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
      }
    }
  },
  methods : {
    addApp() {
      co(function* () {
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
        if (existNW  == 0){
          // get network number from mongo
          nwNumber = yield mongo.getNetworknewnumber();
          if (nodeAdd.form.vlan){
            // is specific vlan
            yield nodeTool.$message("add network with vlan " + nodeAdd.form.vlan);
            ///// ここをvlanのコンフィグにするーー
            // yield procyon_node.addNetwork_vlan(nwNumber,networkCidr,nodeAdd.form.gateway,nodeAdd.form.vlan);
            yield procyon_node.runDocker(nwNumber,dockerNumber);
          } else{
            // is not specific vlan
            nodeTool.$message("add network with native vlan");
            //// check duplicate eth
            yield procyon_node.addNetwork_novlan(nwNumber,networkCidr,nodeAdd.form.IPrange,nodeAdd.form.gateway,nodeAdd.form.exclude);
            yield procyon_node.runDocker(nwNumber,dockerNumber);
          }
        } else {
          nwNumber = yield mongo.getNetworkID(networkCidr);
          let dockerValue = yield procyon_node.runDocker(nwNumber,dockerNumber);
          const tmp = yield procyon_node.getDockerNetwork(nwNumber,dockerNumber);
          dockerValue.ip = yield mongo.getNetworkAddress(dockerValue.network_name);
          const tmpVlan = yield mongo.getNetworkVlan(dockerValue.network_name);
          if(tmpVlan){
            dockerValue.vlan = tmpVlan;
          }else{
            dockerValue.vlan = "native";
          }
          dockerValue.service_ip = tmp.split("\n")[0];
          dockerValue.management_ip = tmp.split("\n")[1];
          mongo.insertDockerNW(dockerValue);

          ContainerTableValue.push({
            name:dockerValue.docker_name,
            service_ip:dockerValue.service_ip,
            management_ip:dockerValue.management_ip,
            network:dockerValue.ip,
            vlan:dockerValue.vlan
          });
          containerTable.containerData = ContainerTableValue;
        }


      });
    }
  }
})
const containerTable = new Vue({
  el: "#containerTable",
  data:{
    containerData : ""
  },
  methods: {
    startPing(row,data){
      axios.post("http://" + data[0].management_ip + ":50001/start_ping", {
        destnatione:"172.20.10.1",
        interval:1000,
        timeout:1000,
        packetsize:54
      })
      .then(res => {
        this.sending = false
        console.log(res.status, res.statusText, res.data)
        // => 200, "OK", { message: "You just sent the data!" }
      })
      .catch(error => {
        this.sending = false
        throw error
      })
    },
    deleteContainer(row,data) {
      co(function* () {
        yield procyon_node.deleteContainer(data[0]);
        yield mongo.deleteDockerNW(data[0]);
        nodeTool.$message({message:"delete app",type:"warning"});
        containerTable.containerData.splice(row,1);
      });
    },
    flushContainer(){
      co(function* () {
        yield procyon_node.flushContainer();
        yield mongo.flushDcokerNW();
        nodeTool.$message({message:"flush app",type:"warning"});
        ContainerTableValue = new Array();
        containerTable.containerData = ContainerTableValue;
      });
    }
  },
  data() {
    return{
      containerData: ContainerTableValue
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

