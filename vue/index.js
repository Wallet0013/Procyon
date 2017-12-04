import co             from "co";
import moment         from "moment";
import ipaddr         from "ip";
import axios          from "axios";
import promiseRetry   from "promise-retry";
import child_process  from "child_process";
import BigNumber      from "bignumber.js";
import Papa           from "papaparse";

// element ui
import Vue            from 'vue';
import ElementUI      from 'element-ui';
import locale         from 'element-ui/lib/locale/lang/ja';
import 'element-ui/lib/theme-chalk/index.css'
Vue.use(ElementUI, {locale});

import mongo            from "./util/mongo";        // load mongo util about model
import procyon_node     from "./util/procyon-node"; // load vagrant util
import { messageArea }  from "./util/message";
import lib_node         from "./lib/lib-node";
import lib_app          from "./lib/lib-app";
import lib_projectTree  from "./lib/lib-projectTree";
import lib_topNav       from "./lib/lib-topNav";
import {realtimeDashboard,pieChart,option}        from "./realtime.js";


axios.defaults.timeout = 1000;

// let ContainerTableValue = new Array();

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
    let i;
    for(i = 0;i < result.length; i++){
      let transTime;
      transTime = (result[i].microsec / 1000).toString();
      transResult.push({
        source:result[i].source,
        source_resolve:(result[i].source_resolve !== undefined) ? result[i].source_resolve.name : "",
        dest:result[i].destnation,
        dest_resolve:(result[i].destnation_resolve !== undefined) ? result[i].destnation_resolve.name : "",
        alive:result[i].alive + "",
        time:transTime,
        timestamp:moment(result[i].timestamp[0],"X").format('YYYY-MM-DD HH:mm:ss') + "." + ( "000000" + result[i].timestamp[1].toString()).slice(-6).slice(0,3),
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
  for(let i of data){
    if(i.alive == "true"){
      alivecnt++;
    }else{
      deadcnt++;
    }
  }

  LogArea.deadPinglog = deadcnt;
  LogArea.alivePinglog = alivecnt;

  /////
  // transfrom data for ECharts

  // sort asc
  let dataAsc = new Array();
  for(let i in data){
    let arg = (data.length-1) - i;
    dataAsc.push(data[arg]);
  }

  let arrObj = {};
  let dedupedData = [];
  let realtimeData = new Array();

  const dead_style    = {normal: {color: "#bd6d6c"}};
  const alive_style   = {normal: {color: "#72b362"}};

  // dedupe object from soruce
  for (let i = 0; i < dataAsc.length; i++) {
    arrObj[dataAsc[i]['source']] = dataAsc[i];
  }
  // get filter data from deduped data
  for (let key in arrObj) {
    dedupedData.push(arrObj[key]['source']);
  }

  dedupedData.sort(function(a,b){
    if( ipaddr.toLong(a) < ipaddr.toLong(b) ) return -1;
    if( ipaddr.toLong(a) > ipaddr.toLong(b) ) return 1;
    return 0;
  });

  // transform data
  for (let i = 0; i < dedupedData.length; i++) {
    const matchData = dataAsc.filter(function(item, index){
      if (item.source == dedupedData[i]) return true;
    });

    console.log("matchData",matchData);

    let livingData = new Array();
    let startTime, endTime, status;
    for (let k in matchData){
      // input startTime and endTime;
      // calculate aliving time;
      if(k <= 0){
        startTime = Number(moment(matchData[k].timestamp).format('x'));
        status = matchData[k].status;
      } else if (matchData[k-1].alive !== matchData[k].alive){ // when change status
        console.log("(matchData[k-1].alive !== matchData[k].alive",matchData[k-1].alive,matchData[k].alive);
        console.log("called");
        endTime = Number(moment(matchData[k].timestamp).format('x'));
        const interval = (Number(endTime) - Number(startTime));
        const style = matchData[k-1].alive == "true" ? alive_style : dead_style;
        livingData.push({name: matchData[k-1].alive , value: [i, startTime, endTime,interval], itemStyle: style }, (x) => {
          startTime = Number(moment(matchData[k].timestamp).format('x'));
        });
        // console.log("matchData[k]",matchData[k]);
        console.log("livingData",livingData);
      } else if (k == matchData.length - 1){ // last of data
        endTime = Number(moment(matchData[k].timestamp).format('x'));
        const interval = (Number(endTime) - Number(startTime));
        const style = matchData[k-1].alive == "true" ? alive_style : dead_style;
        livingData.push({name: matchData[k-1].alive , value: [i, startTime, endTime,interval], itemStyle: style });
        // console.log("livingData",livingData);
      }

    }
    // console.log("livingData",livingData);
    for (let l of livingData){
      realtimeData.push(l);
    }
  }

  console.log("realtimeData",realtimeData);
  // get filter data from deduped data
  let minArray = new Array();
  for (let key in realtimeData) {
    // console.log("realtimeData[key]",realtimeData[key]['value'][1]);
    minArray.push(realtimeData[key]['value'][1]);
  }
  let mindata = 0;
  for(let cont of minArray){
    if(mindata < cont){
      mindata = cont;
    }
  }

  let maxArray = new Array();
  for (let key in realtimeData) {
    maxArray.push(realtimeData[key]['value'][2]);
  }
  let maxdata = 9999999999999;
  for(let cont of maxArray){
    if(maxdata > cont){
      maxdata = cont;
    }
  }

  /////////////
  ///// リローーーど処理。
  // set height
  // realtimeDashboard.adHeight = 400;
  // option.grid.height = realtimeDashboard.adHeight;
  // option.dataZoom[0].top = realtimeDashboard.adHeight + 80;
  // set  data
  realtimeDashboard.adData = realtimeData;
  option.series[0].data = realtimeDashboard.adData;
  option.xAxis.min = Number(mindata);
  option.xAxis.max = Number(maxdata);
  option.yAxis.data = dedupedData;

  pieChart.setOption(option);

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
      LogArea.tableSyslogData = result;
      LogArea.tableSyslogMasterData = result;
    }).catch(function(err){
      process.on('unhandledRejection', console.log(err));
    });
  });
}

function stopSyslogWatcher() {
  co(function* () {
    syslogWatcher.kill('SIGKILL');
    syslogWatcher = child_process.fork("./vue/watcher/mongo-wacher-syslog.js");
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
        console.log("success check app status");
        return 0;
      })
      .catch(error => {
        this.sending = false
        console.log("failed check app status");
        throw error
      })
    });
  }).catch(function(err){
    process.on('unhandledRejection', console.log(err));
  });
}

const nodeAdd = new Vue ({
  el: "#nodeAdd",
  data() {
    return {
      numberApp:1,
      form:{
        vlan:"",
        IPaddr:"172.20.10.0/24",
        IPrange:"172.20.10.0/24",
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
      axios.post("http://" + data.management_ip + ":50001/start_traceroute", {
        destnation:data.targetip,
        hop:containerTable.reqConf.hop,
        timeout:containerTable.reqConf.timeout
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


const LogArea = new Vue({
  el: "#LogArea",
  data (){
    return{
      tableData:[],
      masterData:[],
      LogActive:"Ping",
      MongoSwitchPing:false,
      interval:1000,
      logLimit:100,
      logStaticLimit:100,
      totalPinglog:"",
      deadPinglog:"",
      alivePinglog:"",
      filterLogsSource:"",
      filterLogsDestnation:"",
      filterLogsAlive:"",
      filterLogsMessage:"",
      filterLogsTime:"",
      filterLogsTimedate:"",
      filterLogsTimetime:"",
      sourceFLG:0,
      destFLG:0,
      aliveFLG:0,
      messageFLG:0,
      timeFLG:0,
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
      },
      MongoSwitchSyslog:false,
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
      MongoSwitchTraceroute:false,
      hosts:"",
      resolveType:"IP",
      recordData: [{ ip: '', name: ''}],  // resolve record data
      displayLogArea:false,
    }
  },
  methods: {
    changeSwitch() {
      co(function* () {
        if(LogArea.MongoSwitchPing){
          try{
            yield mongo.getStatus();
            startWatcher();
          } catch(e){
            console.log("failed");
            messageArea.$message({message:"Fail connecting mongodb.",type:"error"});
            LogArea.MongoSwitchPing = false;
          }
        }
        else{
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
    changeSwitchSyslog() {
      co(function* () {
        if(LogArea.MongoSwitchSyslog){
          // LogArea.$el.getElementsByClassName("el-table")[0].hidden = false;
          try{
            yield mongo.getStatus();
            startSyslogWatcher();
          } catch(e){
            console.log("failed");
            messageArea.$message({message:"failed connecting mongodb",type:"error"});
            LogArea.MongoSwitchSyslog = false
          }
        }
        else{
          // LogArea.$el.getElementsByClassName("el-table")[0].hidden = true;
          stopSyslogWatcher();
        }
      })
    },
    changeSwitchTraceroute() {
      co(function* () {
        // if(LogArea.MongoSwitchTraceroute){
        //   // LogArea.$el.getElementsByClassName("el-table")[0].hidden = false;
        //   try{
        //     yield mongo.getStatus();
        //     startSyslogWatcher();
        //   } catch(e){
        //     console.log("failed");
        //     messageArea.$message({message:"failed connecting mongodb",type:"error"});
        //     LogArea.MongoSwitchTraceroute = false
        //   }
        // }
        // else{
        //   // LogArea.$el.getElementsByClassName("el-table")[0].hidden = true;
        //   stopSyslogWatcher();
        // }
      })
    },
    // save record
    registRecord(){
      co(function* () {
        let record = new Array();

        console.log(LogArea.hosts);
        if (LogArea.hosts == "") {
          messageArea.$message({message:"input resolve record",type:"error"});
          return 1;
        }

        const results = Papa.parse(LogArea.hosts,{delimiter: " "});

        for(let result of results.data){
          const data = {
            ip:result[0],
            name:result[1]
          }
          record.push(data);
        }

        yield mongo.registRecord(record, (x) => {
          messageArea.$message({message:"success record registration.",type:"success"});
          LogArea.hosts = "";
        });
      })
    },
    resetRecord(){
      co(function* () {
        let record = new Array();

        yield mongo.dropRecord((x) => {
          messageArea.$message({message:"the record is all deleted.",type:"success"});
        });
      })
    },
    checkRecord(){
      co(function* () {
        LogArea.recordData =  yield mongo.getRecord();

      })
    },
    filterdata(TargetData){
      let find_logs = new Array();

      if(LogArea.sourceFLG == 1){
        for(let data of TargetData){
          let findFlg = 0;

          if(data.source.indexOf(this.filterLogsSource) >= 0){ findFlg = 1; }
          if(data.source_resolve.indexOf(this.filterLogsSource) >= 0){ findFlg = 1; }

          if(findFlg >= 1){ find_logs.push(data); }
        }
      } else{
        find_logs  = TargetData;
      }

      if(LogArea.destFLG == 1){
        let filterdata = new Array();

        for(let data of find_logs){
          let findFlg = 0;

          if(data.dest.indexOf(this.filterLogsDestnation) >= 0){ findFlg = 1; }
          if(data.dest_resolve.indexOf(this.filterLogsDestnation) >= 0){ findFlg = 1; }

          if(findFlg >= 1){ filterdata.push(data); }
        }
        find_logs = filterdata;
      }

      if(LogArea.aliveFLG == 1){
        let filterdata = new Array();
        for(let data of find_logs){
          let findFlg = 0;

          if(data.alive.indexOf(this.filterLogsAlive) >= 0){ findFlg = 1; }

          if(findFlg >= 1){ filterdata.push(data); }
        }
        find_logs = filterdata;
      }

      if(LogArea.timeFLG == 1){
        let filterdata = new Array();
        for(let data of find_logs){
          let findFlg = 0;

          if(data.timestamp.indexOf(this.filterLogsTime) >= 0){ findFlg = 1; }

          if(findFlg >= 1){ filterdata.push(data); }
        }
        find_logs = filterdata;
      }

      if(LogArea.messageFLG == 1){
        let filterdata = new Array();
        for(let data of find_logs){
          let findFlg = 0;

          if(data.message.indexOf(this.filterLogsMessage) >= 0){ findFlg = 1; }

          if(findFlg >= 1){ filterdata.push(data); }
        }
        find_logs = filterdata;
      }

      if(
        LogArea.sourceFLG   == 0 &&
        LogArea.destFLG     == 0 &&
        LogArea.aliveFLG    == 0 &&
        LogArea.timeFLG     == 0 &&
        LogArea.messageFLG  == 0
      ){
        find_logs = LogArea.masterData;
      }

      return find_logs;
    },
  },
  watch:{
    filterLogsSource: function(e){
      const TargetData = LogArea.masterData;

      if(this.filterLogsSource == ""){
        LogArea.sourceFLG = 0;
        LogArea.tableData = LogArea.filterdata(TargetData);
        return analyticsPingLog(TargetData);
      }

      LogArea.sourceFLG = 1;
      let find_logs = LogArea.filterdata(TargetData);
      LogArea.tableData = find_logs;


      analyticsPingLog(find_logs);
    },
    filterLogsDestnation: function(e){
      const TargetData = LogArea.masterData;

      if(this.filterLogsDestnation == ""){
        LogArea.destFLG = 0;
        LogArea.tableData = LogArea.filterdata(TargetData);
        return analyticsPingLog(LogArea.tableData);
      }

      LogArea.destFLG = 1;

      let find_logs = LogArea.filterdata(TargetData);
      LogArea.tableData = find_logs;

      analyticsPingLog(find_logs);
    },
    filterLogsAlive: function(e){
      const TargetData = LogArea.masterData;

      if(this.filterLogsAlive == ""){
        LogArea.aliveFLG = 0;
        LogArea.tableData = LogArea.filterdata(TargetData);
        return analyticsPingLog(LogArea.tableData);
      }

      LogArea.aliveFLG = 1;

      let find_logs = LogArea.filterdata(TargetData);
      LogArea.tableData = find_logs;

      analyticsPingLog(find_logs);
    },
    filterLogsTime: function(e){
      const TargetData = LogArea.masterData;

      if(this.filterLogsTime == ""){
        LogArea.timeFLG = 0;
        LogArea.tableData = LogArea.filterdata(TargetData);
        return analyticsPingLog(LogArea.tableData);
      }

      LogArea.timeFLG = 1;

      let find_logs = LogArea.filterdata(TargetData);
      LogArea.tableData = find_logs;

      analyticsPingLog(find_logs);
    },
    filterLogsMessage: function(e){
      const TargetData = LogArea.masterData;

      if(this.filterLogsMessage == ""){
        LogArea.messageFLG = 0;
        LogArea.tableData = LogArea.filterdata(TargetData);
        return analyticsPingLog(LogArea.tableData);
      }

      LogArea.messageFLG = 1;

      let find_logs = LogArea.filterdata(TargetData);
      LogArea.tableData = find_logs;

      analyticsPingLog(find_logs);
    },

  },
})

export {nodeAdd,containerTable,ResultArea,LogArea};
