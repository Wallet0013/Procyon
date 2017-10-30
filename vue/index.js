import co             from "co";
import moment         from "moment";
import ipaddr         from "ip";
import axios          from "axios";
import promiseRetry   from "promise-retry";
import child_process  from "child_process";
import BigNumber      from "bignumber.js";

// element ui
import Vue            from 'vue'
import ElementUI      from 'element-ui'
import locale         from 'element-ui/lib/locale/lang/ja'
import 'element-ui/lib/theme-default/index.css'
Vue.use(ElementUI, {locale});



import mongo            from "./util/mongo";        // load mongo util about model
import procyon_node     from "./util/procyon-node"; // load vagrant util
import { messageArea }  from "./util/message";
import lib_node         from "./lib/lib-node";
import lib_app          from "./lib/lib-app";
import lib_projectTree  from "./lib/lib-projectTree";
import analytics        from "./analytics";



axios.defaults.timeout = 1000;

let ContainerTableValue = new Array();

let watcher = child_process.fork("./vue/watcher/mongo-wacher-ping.js");
let syslogWatcher = child_process.fork("./vue/watcher/mongo-wacher-syslog.js");


// print mongodb ping data process
function startWatcher() {
  stopWatcher();
  watcher.send({
    interval : LogArea.interval,
    source:LogArea.filterLogsSource,
    destnation:LogArea.filterLogsDestnation,
    alive:LogArea.filterLogsAlive,
    start : "tes",
    end : "tes",
    limit : LogArea.logLimit
  });

  watcher.on("message", function (result) {
    co(function* () {
      // console.log(result);
      const transResult = yield pingLogConvertor(result);
      LogArea.tableData = transResult;
      LogArea.masterData = transResult;
      analyticsPingLog(transResult);
    }).catch(function(err){
      process.on('unhandledRejection', console.log(err));
    });
  });
}

function stopWatcher() {
  co(function* () {
    watcher.kill('SIGKILL');
    watcher = child_process.fork("./vue/watcher/mongo-wacher-ping.js");
  })
}

function pingLogConvertor(result){
  return new Promise(function (resolve,reject){
    let transResult = new Array();
    for(let i=0;i < result.length; i++){
      let transTime;
      transTime = (result[i].microsec / 1000).toString();
      transResult.push({
        source:result[i].source,
        dest:result[i].destnation,
        alive:result[i].alive + "",
        time:transTime,
        timestamp:moment(result[i].timestamp[0],"X").format('YYYY-MM-DD h:mm:ss') + "." + result[i].timestamp[1].toString().slice(0,3),
        message:result[i].error + ""
      })
    }
    resolve(transResult);
  });
}

function analyticsPingLog(data){
  LogArea.totalPinglog = data.length;
  let deadcnt = 0;
  let alivecnt = 0;
  for(i of data){
    if(i.alive == "true"){
      alivecnt++;
    }else{
      deadcnt++;
    }
  }
  ///////////////////
  /// 断時間の計測処理
  /// for i で -1でfalseの場合、timestammpを引き算して、それをaddしてゆく。
  /// これをsource destnationの関係で実施する。
  //////////////////

  LogArea.deadPinglog = deadcnt;
  LogArea.alivePinglog = alivecnt;
}


// print mongodb syslog data process
function startSyslogWatcher() {
  stopSyslogWatcher();
  syslogWatcher.send({
    interval : LogArea.interval,
    start : "tes",
    end : "tes",
    limit : LogArea.logLimit
  });

  syslogWatcher.on("message", function (result) {
    co(function* () {
      syslogArea.tableSyslogData = result;
      syslogArea.tableSyslogMasterData = result;
    }).catch(function(err){
      process.on('unhandledRejection', console.log(err));
    });
  });
}

function stopSyslogWatcher() {
  co(function* () {
    syslogWatcher.kill('SIGKILL');
    syslogWatcher = child_process.fork("./vue/wacher/mongo-wacher-syslog.js");
  })
}

function checkAppStatus(target){
  return new Promise(function (resolve,reject){
    co(function* () {
      const uri = "http://" + target + ":50001/test";
      // console.log("target : " + uri);
      axios.get(uri)
      .then(res => {
        this.sending = false;
        // console.log(res.status, res.statusText, res.data)
        return 0;
      })
      .catch(error => {
        this.sending = false
        throw error
      })
    });
  }).catch(function(err){
    process.on('unhandledRejection', console.log(err));
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
          messageArea.$message({message:"add network with vlan " + nodeAdd.form.vlan,type:"info"});

          /////////////
          ///// ここをvlanのコンフィグにするーー
          /////////////
          resolve(0);
        } else{
          // is not specific vlan
          messageArea.$message({message:"add network with native vlan",type:"info"});
          console.log("add network with native vlan");

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
}

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
    addApp(type) {
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
        let dockerValue
        try{
          dockerValue = yield procyon_node.runDocker(nwNumber,dockerNumber,type);
        } catch(e){
          console.log("err : " + e);
          console.log("faild command 'docker run'.");
          nodeAdd.addappDisabled = false;
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
        mongo.insertDockerNW(dockerValue);

        let connectFLG = false;
        // check conectibity
        try{
          setTimeout(checkAppStatus,3000,dockerValue.management_ip);
          connectFLG = true;
          console.log(connectFLG , !connectFLG);
          // console.log(tet);
        } catch(e){

        }

        ContainerTableValue.push({
          management_ip:dockerValue.management_ip,
          service_ip:dockerValue.service_ip,
          network:dockerValue.ip,
          vlan:dockerValue.vlan,
          failure:!connectFLG,
          conneted:true
        });

        containerTable.containerData = ContainerTableValue;
        console.log(ContainerTableValue);
        ResultArea.AppData = ContainerTableValue;
        nodeAdd.addappDisabled = false;
      });
    },
    addSyslog() {
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
        let dockerValue = yield procyon_node.runSyslog(nwNumber,dockerNumber);

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
        yield mongo.flushContainer();
        yield procyon_node.flushDockerNW();
        yield mongo.flushDockerNW();
        messageArea.$message({message:"Flush All app.",type:"warning"});
        ContainerTableValue = new Array();
        containerTable.containerData = ContainerTableValue;
        ResultArea.AppData = ContainerTableValue;
      });
    },
    flushArptable(){
      messageArea.$message({message:"flush arp is require plivilede",type:"warning"});
      procyon_node.flushArptable();
    }
  },
  created: function() {
    co(function* () {
      try{
        const data = yield mongo.getDockreInfomation();
        ContainerTableValue = data;
        ResultArea.AppData = ContainerTableValue;
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
      AppData: ContainerTableValue,
      labelPosition: 'top',
      currentDate: new Date(),
      PingSwitchValue:false
    }
  },
  methods: {
    startPing(data,index){
      if (data.targetip == undefined){
        messageArea.$message({message:"Target ip is null",type:"error"});
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
        messageArea.$message({message:"success ping request.",type:"info"});
        console.log(res.status, res.statusText, res.data)
      })
      .catch(error => {
        this.sending = false
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
        messageArea.$message({message:"success stopping ping request.",type:"info"});
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
      axios.post("http://" + data.management_ip + ":50001/start_traceroute", {
        destnation:data.targetip,
        hop:containerTable.reqConf.hop,
        timeout:containerTable.reqConf.timeout
      })
      .then(res => {
        this.sending = false
        messageArea.$message({message:"Success traceroute request.",type:"info"});
        // console.log(res.status, res.statusText, res.data)
      })
      .catch(error => {
        this.sending = false
        messageArea.$message({message:"fail traceroute request",type:"error"});
        throw error
      })
    },
    deleteContainer(data,index) {
      co(function* () {
        const dockerName = yield mongo.getDockerName(data.service_ip);
        yield procyon_node.deleteContainer(dockerName);
        yield mongo.deleteDockerNW(dockerName);
        messageArea.$message({message:"Delete app",type:"info"});
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
      tableData:[],
      masterData:[],
      LogActive:"Ping",
      MongoSwitch:false,
      interval:1000,
      logLimit:100,
      logStaticLimit:100,
      totalPinglog:"",
      deadPinglog:"",
      alivePinglog:"",
      filterLogsSource:"",
      filterLogsDestnation:"",
      filterLogsAlive:"",
      filterLogsTime:"",
      FilterTimeOption: {
        shortcuts: [{
          text: 'Yesterday',
          onClick(picker) {
            const end = new Date();
            const start = new Date();
            start.setTime(start.getTime() - 3600 * 1000 * 24 * 1);
            end.setTime(start.getTime() + 3600 * 1000 * 24 * 1);
            picker.$emit('pick', [start, end]);
          }
        }, {
          text: 'Last Week',
          onClick(picker) {
            const end = new Date();
            const start = new Date();
            start.setTime(start.getTime() - 3600 * 1000 * 24 * 7);
            picker.$emit('pick', [start, end]);
          }
        }]
      }
    }
  },
  methods: {
    changeSwitch(value) {
      co(function* () {
      if(LogArea.MongoSwitch){
          // LogArea.$el.getElementsByClassName("el-table")[0].hidden = false;
          try{
            yield mongo.getStatus();
            startWatcher();
          } catch(e){
            console.log("failed");
            messageArea.$message({message:"Fail connecting mongodb.",type:"error"});
            LogArea.MongoSwitch = false;
          }
        }
        else{
          // LogArea.$el.getElementsByClassName("el-table")[0].hidden = true;
          stopWatcher();
        }
      })
    },
    ReloadLogArea(){
      co(function* () {
        let limit;
        if(LogArea.logStaticLimit == "all"){
          limit = undefined;
        }else{
          limit = LogArea.logStaticLimit;
        }
        const result = yield mongo.getPingCollection(limit);
        const data = yield pingLogConvertor(result);
        LogArea.tableData = data;
        LogArea.masterData = data;
        analyticsPingLog(data);
      })
    },
    ChangeLogs(tab, event){
      console.log(tab, event);
    }
  },
  watch:{
    filterLogsSource: function(e){
      const TargetData = LogArea.masterData;

      if(this.filterLogsSource == ""){
        return LogArea.tableData = LogArea.masterData;
      }

      let find_logs = new Array();
      for(let data of TargetData){
        let findFlg = 0;
        if(data.source.indexOf(this.filterLogsSource) >= 0){ findFlg = 1;}
        // if(data.message.indexOf(this.filterLogsSouce) >= 0){ findFlg = 1; }

        if(findFlg >= 1){
          find_logs.push(data);
        }
      }
      LogArea.tableData = find_logs;
      analyticsPingLog(find_logs);
    },
    filterLogsDestnation: function(e){
      const TargetData = LogArea.masterData;

      if(this.filterLogsDestnation == ""){
        return LogArea.tableData = LogArea.masterData;
      }


      let find_logs = new Array();
      for(let data of TargetData){
        let findFlg = 0;
        if(data.dest.indexOf(this.filterLogsDestnation) >= 0){ findFlg = 1; }

        if(findFlg >= 1){
          find_logs.push(data);
        }
      }
      LogArea.tableData = find_logs;
      analyticsPingLog(find_logs);
    },
    filterLogsAlive: function(e){
      const TargetData = LogArea.masterData;

      if(this.filterLogsAlive == ""){
        return LogArea.tableData = LogArea.masterData;
      }

      let find_logs = new Array();
      for(let data of TargetData){
        let findFlg = 0;
        if(data.alive.indexOf(this.filterLogsAlive) >= 0){ findFlg = 1; }

        if(findFlg >= 1){
          find_logs.push(data);
        }
      }
      LogArea.tableData = find_logs;
      analyticsPingLog(find_logs);
    },
    filterLogsTime: function(e){
      const startTime = moment(e[0]).format();
      const endTime = moment(e[1]).format();
      console.log(startTime);
      console.log(endTime);

      const TargetData = LogArea.masterData;

      if(this.filterLogsTime == ""){
        console.log("data");
        return LogArea.tableData = LogArea.masterData;
      }

      let find_logs = new Array();
      for(let data of TargetData){
        // let findFlg = 0;
        // if(data.alive.indexOf(this.filterLogsTime) >= 0){ findFlg = 1; }

        // if(findFlg >= 1){
        //   find_logs.push(data);
        // }
        console.log(data.timestamp);
      }
      LogArea.tableData = find_logs;
      analyticsPingLog(find_logs);
    }
  }
})

const syslogArea = new Vue({
  el: "#syslogArea",
  data (){
    return{
      MongoSwitch:false,
      tableSyslogData : [{
        facility:"",
        severity:"",
        tag:"",
        times:"",
        hostname:"",
        address:"",
        port:"",
        size:"",
        msg:""
      }],
      tableSyslogMasterData : [{
        facility:"",
        severity:"",
        tag:"",
        times:"",
        hostname:"",
        address:"",
        port:"",
        size:"",
        msg:""
      }],
    }
  },
  methods: {
    changeSwitch() {
      co(function* () {
        if(syslogArea.MongoSwitch){
          // LogArea.$el.getElementsByClassName("el-table")[0].hidden = false;
          try{
            yield mongo.getStatus();
            startSyslogWatcher();
          } catch(e){
            console.log("failed");
            nodeTool.$message({message:"failed connecting mongodb",type:"error"});
            syslogArea.MongoSwitch = false
          }
        }
        else{
          // LogArea.$el.getElementsByClassName("el-table")[0].hidden = true;
          stopSyslogWatcher();
        }
      })
    }
  }
})

