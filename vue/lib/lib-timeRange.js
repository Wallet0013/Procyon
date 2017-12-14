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

export const timeRange = new Vue({
  el:"#timeRange",
  data (){
    return{
      displaytimeRange:false,
      PingLogsData:"",
      limitTimeRangeDate:new Date(),
      limitTimeRangeTime:[moment(new Date()).subtract(1,"hours").toDate(),new Date()],
      PingCnt:""
    }
  },
  methods : {
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
    getAllPing(timerange) {
      return new Promise(function (resolve,reject){
        co(function* () {

          console.log("ping cnt : ", yield mongo.getAllPingCollectionCnt());

          // console.log("timeRange.limitTimeRangeDate",timeRange.limitTimeRangeDate);
          // console.log("timeRange.limitTimeRangeTime",timeRange.limitTimeRangeTime);

          // limitTimeRange
          /// ここにtransformしたtimerangeを入れる

          const d = yield mongo.getAllPingCollection()

          let logData = new Array();
          for(let data of d){
            logData.push([
              moment(data.timestamp,"x").toDate(),
              new BigNumber(data.microsec).div(1000).round().toNumber()
            ]);
          }
          // console.log("logData",logData);

          const targetId = document.getElementById('timeRange');
          const appendDiv = document.createElement('div');
          targetId.appendChild(appendDiv);
          const curretWidth = (document.body.clientWidth - 500);

          const option = {
            labels: [ "TimeStamp", "RTT(ms)" ],
            width:curretWidth,
            height: 100,
            animatedZooms: true,
          };

          const g = new Dygraph(appendDiv, logData , option);
        });
      }).catch(function(err){
        process.on('unhandledRejection', console.log(err));
      });

    },
  },
  mounted: function(){
    return new Promise(function (resolve,reject){
      co(function* () {
        // const targetId = document.getElementById('timeRange');
        // const appendDiv = document.createElement('div');
        // targetId.appendChild(appendDiv);
        // const curretWidth = (document.body.clientWidth - 500);
        // const curretWidth = 500;
        let slogData = [
          [new Date("2015-07-02T15:00:00"),10,100],
          [new Date("2016-07-02T15:00:00"),20,80],
          [new Date("2017-07-02T15:00:00"),50,60],
          [new Date("2018-07-02T15:00:00"),70,80],
          [new Date("2019-07-02T15:00:00"),20,100],
          [new Date("2020-07-02T15:00:00"),33,22]
        ];
        // const option = {
        //   labels: [ "Date", "AA", "BB" ],
        //   width:curretWidth,
        //   height: 100,
        //   animatedZooms: true,
        // };

        // const g = new Dygraph(appendDiv, logData , option);
      });
    }).catch(function(err){
      process.on('unhandledRejection', console.log(err));
    });

  }
})