import co             from "co";
import moment         from "moment";
import _              from "lodash";

// element ui
import Vue      from 'vue'
import ElementUI    from 'element-ui'
import locale       from 'element-ui/lib/locale/lang/ja'
import 'element-ui/lib/theme-chalk/index.css'

Vue.use(ElementUI, {locale});

import mongo            from "../util/mongo";        // load mongo util about model
import { messageArea }  from "../util/message";


const nodeAdd = new Vue ({
  el: "#nodeAdd",
  data() {
    return {
      numberApp:1,
      form:{
        vlan:"",
        IPaddr:"172.20.10.0/28",
        IPrange:"172.20.10.8/29",
        gateway:"172.20.10.1",
        exclude:"",
      },
      addappDisabled:false,
      displayNodeApp:false,
      rules : {
        cidr_req: [
          { type:'number', required: true, message: 'It is not CIDR format', trigger: 'change' },
        ],
        cidr: [
          { type:'number', required: false, message: 'It is not CIDR format', trigger: 'change' },
        ],
        ip_req: [
          { required: true, message: 'It is not IP format', trigger: 'change' },
        ],
        ip: [
          { type:'number', required: false, message: 'It is not IP format', trigger: 'change' },
        ],
      },
      AppContainerTable: new Array(),
      AppMgmtContainerTable: new Array(),
    }
  },
  methods : {
    addNetwork(existNW,networkCidr,nodeAdd) {
      return new Promise(function (resolve,reject){
        co(function* () {
          if (existNW  == 0){
            // get network number from mongo
            const nwNumber = yield mongo.getNetworknewnumber();
            console.log("form vlan : ",nodeAdd.form.vlan);
            if (nodeAdd.form.vlan){
              // is specific vlan
              messageArea.$message({message:"add network with vlan " + nodeAdd.form.vlan,type:"info"});
              // console.log("add network with vlan");

              resolve(yield procyon_node.addNetwork_withvlan(nwNumber,networkCidr,nodeAdd.form.vlan,nodeAdd.form.IPrange,nodeAdd.form.gateway,nodeAdd.form.exclude));

            } else{
              // is not specific vlan
              messageArea.$message({message:"add network with native vlan",type:"info"});
              // console.log("add network with native vlan");

              /////////////
              //// check duplicate eth
              /////////////

              resolve(yield procyon_node.addNetwork_novlan(nwNumber,networkCidr,nodeAdd.form.IPrange,nodeAdd.form.gateway,nodeAdd.form.exclude));
            }
          }else{
            resolve(0);
          }
        });
      }).catch(function(err){
        process.on('unhandledRejection', console.log(err));
      });
    },
    addApp(type) {
      co(function* () {
        nodeAdd.addappDisabled = true;
        messageArea.$message({message:"please wait.",type:"info"});
        for(let i = 1; i <= nodeAdd.numberApp; i++){
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
          const result = yield nodeAdd.addNetwork(existNW,networkCidr,nodeAdd);

          // run app container
          nwNumber = yield mongo.getNetworkID(networkCidr);
          let dockerValue
          try{
            dockerValue = yield procyon_node.runDocker(nwNumber,dockerNumber,type);
          } catch(e){
            console.log("err : " + e);
            console.log("faild command 'docker run'.");
            messageArea.$message({message:e,type:"error"});
            return nodeAdd.addappDisabled = false;
          }

          // insert docker info to mongo
          const tmp = yield procyon_node.getDockerNetwork(nwNumber,dockerNumber,type);
          dockerValue.ip = yield mongo.getNetworkAddress(dockerValue.network_name);
          const tmpVlan = yield mongo.getNetworkVlan(dockerValue.network_name);
          if(tmpVlan){
            dockerValue.vlan = tmpVlan;
          }else{
            dockerValue.vlan = "native";
          }
          dockerValue.management_ip = tmp.split("\n")[0];
          dockerValue.service_ip = tmp.split("\n")[1];
          yield mongo.insertDockerNW(dockerValue);

          if(type == "app"){
            nodeAdd.AppContainerTable.push({
              management_ip:dockerValue.management_ip,
              service_ip:dockerValue.service_ip,
              network:dockerValue.ip,
              vlan:dockerValue.vlan,
              targetip:"",
              // failure:!connectFLG,
              pingdisabled:false,
              conneted:true,
              checked:false,
            });
          } else if (type = "syslog"){
            nodeAdd.AppContainerTable.push({
            // nodeAdd.AppMgmtContainerTable.push({
              management_ip:dockerValue.management_ip,
              service_ip:dockerValue.service_ip,
              network:dockerValue.ip,
              vlan:dockerValue.vlan,
              // failure:!connectFLG,
              pingdisabled:false,
              conneted:true,
              checked:false,
            });
          }
          ResultArea.AppData = nodeAdd.AppContainerTable;
        }
        nodeAdd.addappDisabled = false;
        nodeAdd.numberApp = 1;
        messageArea.$message({message:"done.",type:"success"});
      });
    },
  }
})

const containerTable = new Vue({
  el: "#containerTable",
  data () {
    return {
      reqConf:{
        timeout:1000,
        interval:1000,
        packetsize:54,
        hop:10
      },
      displayContainerTable:false,
    }
  },
  methods: {
    flushContainer(){
      co(function* () {
        yield procyon_node.flushContainer();
        yield mongo.flushContainer();
        yield procyon_node.flushDockerNW();
        yield mongo.flushDockerNW();
        messageArea.$message({message:"Flush All app.",type:"warning"});
        nodeAdd.AppContainerTable = new Array();
        ResultArea.AppData = nodeAdd.AppContainerTable;
      });
    },
    flushArptable(){
      messageArea.$message({message:"flush arp is require plivilede",type:"warning"});
      procyon_node.flushArptable();
    }
  },
  // Auto reload Apps
  created: function() {
    co(function* () {
      try{
        const data = yield mongo.getDockreInfomation();
        nodeAdd.AppContainerTable = data;
        ResultArea.AppData = nodeAdd.AppContainerTable;
      }catch(e){
        console.log("mongo is not started");
      }
    })
  }
})

// Container BOX Area
const ResultArea = new Vue ({
  el:"#ResultArea",
  data(){
    return{
      AppData: nodeAdd.AppContainerTable,
      labelPosition: 'top',
      currentDate: new Date(),
      PingSwitchValue:false,
      displayResultArea:false,
    }
  },
  methods: {
    startPing(data,index){
      console.log("ping disabled : ",data.pingdisabled);
      console.log("data.targetip :",data.targetip );
      if (data.targetip == undefined || data.targetip == ""){
        messageArea.$message({message:"Target ip is null",type:"error"});
        data.pingdisabled = false;
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
        this.sending = false;
        data.pingdisabled = true;

        messageArea.$message({message:"success ping request.",type:"success"});
        console.log(res.status, res.statusText, res.data)
      })
      .catch(error => {
        this.sending = false;
        data.pingdisabled = false;
        messageArea.$message({message:"fail ping request",type:"error"});
        throw error
      })
    },
    stopPing(data,index){
      const status = true;
      this.isActive = false;
      axios.post("http://" + data.management_ip + ":50001/stop_ping")
      .then(res => {
        this.sending = false
        data.pingdisabled = false; // unlock disable button
        messageArea.$message({message:"success stopping ping request.",type:"success"});
        console.log(res.status, res.statusText, res.data)
      })
      .catch(error => {
        this.sending = false
        messageArea.$message({message:"fail ping request.",type:"error"});

        throw error
      })
    },
    startTraceroute(data,index){
      console.log(this.$el.children[index].color);
      if (data.targetip == undefined){
        messageArea.$message({message:"Target ip is null",type:"error"});
        return 127;
      }
      const status = true;
      this.isActive = false;
      let transTimeout = 1;

      if(containerTable.reqConf.timeout <= 1999 ){
        transTimeout = 1;
        console.log("div data : ",transTimeout);
      } else if (containerTable.reqConf.timeout >= 2000 ){
        transTimeout = new BigNumber(containerTable.reqConf.timeout).div(1000).round(0,1).toNumber();
        console.log("div data : ",transTimeout);
      }

      axios.post("http://" + data.management_ip + ":50001/start_traceroute", {
        destnation:data.targetip,
        hop:containerTable.reqConf.hop,
        timeout:transTimeout
      })
      .then(res => {
        this.sending = false
        messageArea.$message({message:"Success traceroute request.",type:"success"});
      })
      .catch(error => {
        this.sending = false
        messageArea.$message({message:"Fail traceroute request",type:"error"});
        throw error
      })
    },
    deleteContainer(data,index) {
      co(function* () {
        const dockerName = yield mongo.getDockerName(data.service_ip);
        yield procyon_node.deleteContainer(dockerName);
        yield mongo.deleteDockerNW(dockerName);
        messageArea.$message({message:"Success delete app",type:"success"});
        for(i=0; i<nodeAdd.AppContainerTable.length; i++){
            if(nodeAdd.AppContainerTable[i].management_ip == data.management_ip){
                nodeAdd.AppContainerTable.splice(i, 1);
            }
        }
        ResultArea.AppData = nodeAdd.AppContainerTable;
      });
    }
  }
})