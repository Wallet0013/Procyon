import co             from "co";
import moment         from "moment";
import ipaddr         from "ip";
import axios          from "axios";
import promiseRetry   from "promise-retry";
import child_process  from "child_process";
import BigNumber      from "bignumber.js";
import Papa           from "papaparse";
import _              from "lodash";
import Dygraph        from "dygraphs";
import {promisify}    from 'util';

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
import {nodeAdd,containerTable,ResultArea}          from "./lib/lib-app";
import lib_projectTree  from "./lib/lib-projectTree";
import lib_topNav       from "./lib/lib-topNav";
import {timeRange}      from "./lib/lib-timeRange";
import {realtimeDashboard,pieChart,option}        from "./lib/lib-realtime.js";


axios.defaults.timeout = 1000;



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
      resolveDialogVisible:false,
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

        ///////////
        // table reload
        //////////////////////////////
        // LogArea.tableData = data;
        // LogArea.masterData = data;
        /////////////////////////////
        analyticsPingLog(data);
      })
    },
    changeSwitchSyslog() {
      co(function* () {
        if(LogArea.MongoSwitchSyslog){
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

export {LogArea};
