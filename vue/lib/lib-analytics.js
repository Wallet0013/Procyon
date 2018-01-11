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
import chart          from 'echarts';

// load Model util
import mongo          from "../util/mongo";
// load vagrant util
import procyon_node   from "../util/procyon-node";
import {messageArea}  from "../util/message";

// element ui
import Vue      from 'vue'
import ElementUI    from 'element-ui'
import locale       from 'element-ui/lib/locale/lang/ja'
import 'element-ui/lib/theme-chalk/index.css'
Vue.use(ElementUI, {locale});


const pingGraph = chart.init(document.getElementById('pingGraph'));
const traceGraph = chart.init(document.getElementById('traceGraph'));
const syslogGraph = chart.init(document.getElementById('syslogGraph'));

const pingGraphoption = {
    tooltip: {
        trigger: 'item',
        formatter: "{a} <br/>{b}: {c} ({d}%)"
    },
    legend: {
        orient: 'vertical',
        x: 'left',
        data:['直接访问','邮件营销','联盟广告','视频广告','搜索引擎']
    },
    series: [
        {
            name:'访问来源',
            type:'pie',
            radius: ['50%', '70%'],
            avoidLabelOverlap: false,
            label: {
                normal: {
                    show: false,
                    position: 'center'
                },
                emphasis: {
                    show: true,
                    textStyle: {
                        fontSize: '30',
                        fontWeight: 'bold'
                    }
                }
            },
            labelLine: {
                normal: {
                    show: false
                }
            },
            data:[
                {value:335, name:'直接访问'},
                {value:310, name:'邮件营销'},
                {value:234, name:'联盟广告'},
                {value:135, name:'视频广告'},
                {value:1548, name:'搜索引擎'}
            ]
        }
    ]
};

const timeRange = new Vue({
  el:"#timeRange",
  data (){
    return{
      displaytimeRange:false,
      PingLogsData:"",
      limitTimeRangeDate:new Date(),
      limitTimeRangeTime:[moment(new Date()).subtract(1,"hours").toDate(),new Date()],
      PingCnt:"",
      TraceCnt:"",
      SyslogCnt:"",
    }
  },
  methods : {
    setTimeYesterday() {
      timeRange.limitTimeRangeDate =  moment().subtract(1,'days').toDate();
    },
    setTimeDayTime() {
      timeRange.limitTimeRangeTime = [moment().set({'hour':9,'minute':0,'second':0}).toDate(),moment().set({'hour':17,'minute':0,'second':0}).toDate()];
    },
    getAllpingCnt() {
      return new Promise(function (resolve,reject){
        co(function* () {
          const cnt = yield mongo.getAllPingCollectionCnt();
          resolve(timeRange.PingCnt = cnt);
        });
      }).catch(function(err){
        process.on('unhandledRejection', console.log(err));
      });
    },
    analyzePinglog(data) {
      return new Promise(function (resolve,reject){
        co(function* () {
          // console.log("data",data);

          let aliveCnt = 0;
          let deadCnt = 0;
          for(let d of data){
            if(d.alive == true){
              aliveCnt++;
            }
            if(d.alive == false){
              deadCnt++;
            }
          }
          resolve([aliveCnt,deadCnt]);
        });
      }).catch(function(err){
        process.on('unhandledRejection', console.log(err));
      });
    },
    figurePingGraph(data) {
      return new Promise(function (resolve,reject){
        co(function* () {
          // console.log("data",data);

          let aliveCnt = 0;
          let deadCnt = 0;
          for(let d of data){
            if(d.alive == true){
              aliveCnt++;
            }
            if(d.alive == false){
              deadCnt++;
            }
          }
          resolve([aliveCnt,deadCnt]);
        });
      }).catch(function(err){
        process.on('unhandledRejection', console.log(err));
      });
    },
    getAllData(timerange) {
      return new Promise(function (resolve,reject){
        co(function* () {

          // set date from date input
          const startTime = moment().set({
            'year':moment(timeRange.limitTimeRangeDate).year(),
            'month':moment(timeRange.limitTimeRangeDate).month(),
            'date':moment(timeRange.limitTimeRangeDate).date(),
            'hour':moment(timeRange.limitTimeRangeTime[0]).hour(),
            'minute':moment(timeRange.limitTimeRangeTime[0]).minute(),
            'second':moment(timeRange.limitTimeRangeTime[0]).second(),
            'millisecond':0
          });

          // set time from time input
          const endTime = moment().set({
            'year':moment(timeRange.limitTimeRangeDate).year(),
            'month':moment(timeRange.limitTimeRangeDate).month(),
            'date':moment(timeRange.limitTimeRangeDate).date(),
            'hour':moment(timeRange.limitTimeRangeTime[1]).hour(),
            'minute':moment(timeRange.limitTimeRangeTime[1]).minute(),
            'second':moment(timeRange.limitTimeRangeTime[1]).second(),
            'millisecond':0
          });

          const query  = { "timestamp" : { "$gte" : Number(moment(startTime).format('x')), "$lte" : Number(moment(endTime).format('x')) }};
          const limit = 500000;

          const pLog = yield mongo.getPingCollection(limit,query);
          const tLog = yield mongo.getTraceCollection(limit,query);
          const sLog = yield mongo.getSyslogCollection(limit,query)

          // transform pLog for dygraph data
          let logData = new Array();
          for(let data of pLog){
            logData.push([
              moment(data.timestamp,"x").toDate(),
              new BigNumber(data.microsec).div(1000).round().toNumber()
            ]);
          }
          let asclogData = new Array();
          for(let data of logData){
            asclogData.unshift(data);
          }

          /////
          // dygraph
          const area = document.getElementsByClassName('timelineArea');
          const curretWidth = (document.body.clientWidth - 500);
          const option = {
            labels: [ "TimeStamp", "RTT(ms)" ],
            width:curretWidth,
            height: 100,
            animatedZooms: true,
            zoomCallback: function(minDate, maxDate,yRanges) {
              co(function* () {
                const query  = { "timestamp" : { "$gte" : minDate, "$lte" : maxDate }};
                const limit = 500000;
                // console.log("yRanges",yRanges);

                const pLog = yield mongo.getPingCollection(limit,query);
                const tLog = yield mongo.getTraceCollection(limit,query);
                const sLog = yield mongo.getSyslogCollection(limit,query)
                timeRange.PingCnt = pLog.length;
                timeRange.TraceCnt = tLog.length;
                timeRange.SyslogCnt = sLog.length;

                const adratio = yield timeRange.analyzePinglog(pLog);

                pingGraph.setOption(pingGraphoption);
                console.log("alive",adratio[0]);
                console.log("dead",adratio[1]);

              }).catch(function(err){
                process.on('unhandledRejection', console.log(err));
              });
            }
          };
          // print
          const g = new Dygraph(area[0], asclogData , option);

          pingGraph.setOption(pingGraphoption);

          timeRange.PingCnt = pLog.length;
          timeRange.TraceCnt = tLog.length;
          timeRange.SyslogCnt = sLog.length;
        });
      }).catch(function(err){
        process.on('unhandledRejection', console.log(err));
      });

    },
  },

})

const LogArea = new Vue({
  el: "#LogArea",
  data (){
    return{
      tableData:[],
      masterData:[],
      LogActive:"Ping",
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


export {timeRange,LogArea};