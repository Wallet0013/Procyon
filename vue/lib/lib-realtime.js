import co             from "co";
import moment         from "moment";
import chart          from 'echarts';
import child_process  from "child_process";
import _              from "lodash";

// element ui
import Vue      from 'vue'
import ElementUI    from 'element-ui'
import locale       from 'element-ui/lib/locale/lang/ja'
import 'element-ui/lib/theme-chalk/index.css'

Vue.use(ElementUI, {locale});

import mongo            from "../util/mongo";        // load mongo util about model
import { messageArea }  from "../util/message";

let watcher = child_process.fork("./vue/watcher/mongo-wacher-ping.js");
let syslogWatcher = child_process.fork("./vue/watcher/mongo-wacher-syslog.js");


const dead_style    = {normal: {color: "#bd6d6c"}};
const alive_style   = {normal: {color: "#72b362"}};

// print mongodb ping data process
function startWatcher() {
  stopWatcher();
  watcher.send({
    interval : realtimeDashboard.ReloadInt,
    // source:LogArea.filterLogsSource,
    source:"",
    // destnation:LogArea.filterLogsDestnation,
    destnation:"",
    // alive:LogArea.filterLogsAlive,
    alive:"",
    start : "tes",
    end : "tes",
    limit : 5000,
  });

  watcher.on("message", function (result) {
    co(function* () {
      const transResult = yield pingLogConvertor(result);
      // LogArea.tableData = transResult;
      // LogArea.masterData = transResult;
      analyticsPingLog(transResult);
    }).catch(function(err){
      process.on('unhandledRejection', console.log(err));
    });
  });

  watcher.on("exit", function (result) {
    co(function* () {
      console.log("stopped watcher");
      messageArea.$message({message:"Stop watcher" ,type:"info"});
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
        timestamp:moment(result[i].timestamp).format('YYYY-MM-DD HH:mm:ss.SSS'),
        message:result[i].error + ""
      })
    }
    resolve(transResult);
  });
}

function analyticsPingLog(data){
  let realtimeData = new Array();

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

  // up side down raw data
  let dataAsc = new Array();
  for(let i in data){
    let arg = (data.length-1) - i;
    dataAsc.push(data[arg]);
  }

  // dedupe by source & dest
  const arrObj = _.uniqBy(dataAsc, (x) => {
    return x.source + ' ' + x.dest;
  });

  // sort by source & dest
  const arrObjSorted = _.sortBy(arrObj,["source","dest"]);

  // set Categories by source-dest
  let arrayData = [];
  for(let kk of arrObjSorted){
    arrayData.push(kk.source + "-" + kk.dest);
  }
  // console.log("arrayData",arrayData);

  ////////
  // transform deduped data to graph datasets
  ///

  // loop per deduped data
  for (let i = 0; i < arrObjSorted.length; i++) {
    const matchData = dataAsc.filter(function(item, index){
      if (item.source == arrObjSorted[i].source && item.dest == arrObjSorted[i].dest) return true;
    });


    let livingData = new Array();
    let startTime, endTime, status;
    for (let k in matchData){
      // input startTime and endTime. calculate aliving time;

      if(k <= 0){ // first loop
        startTime = Number(moment(matchData[k].timestamp).format('x'));
        status = matchData[k].status;
      } else if (matchData[k-1].alive !== matchData[k].alive){ // when change status
        // console.log("matchData -1 : ",matchData[k-1].source,matchData[k-1].dest);
        // console.log("matchData : ",matchData[k].source,matchData[k].dest);
        // console.log("(matchData[k-1].alive !== matchData[k].alive",matchData[k-1].alive,matchData[k].alive);
        endTime = Number(moment(matchData[k].timestamp).format('x'));
        const interval = (Number(endTime) - Number(startTime));
        const style = matchData[k-1].alive == "true" ? alive_style : dead_style;
        const pushData = {name: matchData[k-1].alive , value: [i, startTime, endTime,interval], itemStyle: style };
        // console.log("pushData : ",pushData);
        livingData.push(pushData);

        // promisify(livingData.push(pushData)).then((x) =>{
          startTime = Number(moment(matchData[k].timestamp).format('x'))
        // })

        // console.log("matchData[k]",matchData[k]);
        // console.log("livingData",livingData);
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

  // console.log("realtimeData",realtimeData);
  // get filter data from deduped data
  let minArray = new Array();
  for (let key in realtimeData) {
    // console.log("realtimeData[key]",realtimeData[key]['value'][1]);
    minArray.push(realtimeData[key]['value'][1]);
  }
  // let mindata = 0;
  let mindata = 9999999999999;
  for(let cont of minArray){
    // console.log("minArray",moment(cont).format("MM-DD HH:mm:ss.SSS"));
    if(mindata > cont){
      mindata = cont;
      // console.log("minArray",moment(mindata).format("MM-DD HH:mm:ss.SSS"))
    }
  }

  let maxArray = new Array();
  for (let key in realtimeData) {
    maxArray.push(realtimeData[key]['value'][2]);
  }
  // let maxdata = 9999999999999;
  let maxdata = 0;
  for(let cont of maxArray){
    // console.log("maxArray",moment(cont).format("MM-DD HH:mm:ss.SSS"));
    if(maxdata < cont){
      maxdata = cont;
      // console.log("maxArray",moment(maxdata).format("MM-DD HH:mm:ss.SSS"))
    }
  }

  //////////////////////////
  ///// リローーーど処理。
  //////////////////////////
  // set height
  // realtimeDashboard.adHeight = 400;
  // option.grid.height = realtimeDashboard.adHeight;
  // option.dataZoom[0].top = realtimeDashboard.adHeight + 80;
  // set data
  //////////////////////////

  realtimeDashboard.adData = realtimeData;
  option.series[0].data = realtimeDashboard.adData;
  // console.log(option.series[0].data);
  // option.series[0].data.push(realtimeDashboard.adData);
  option.xAxis.min = Number(mindata);
  option.xAxis.max = Number(maxdata);
  realtimeDashboard.adCategories = arrayData;
  option.yAxis.data = realtimeDashboard.adCategories;

  pieChart.setOption(option);

}


export const realtimeDashboard = new Vue ({
  el: "#realtimeDashboard",
  data() {
    return {
      displayRealtimeDashboard:false,
      adData:"",
      adHeight:300,
      adCategories:"",
      RealtimeSwitch:false,
      ReloadInt:1000,
      LoadRange:5,
    }
  },
  methods: {
    changeSwitch() {
      co(function* () {
        if(realtimeDashboard.RealtimeSwitch){
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
    // format tool tip for interval slider
    formatInt(val) {
        return val + " seconds";
    },
    // format tool tip for time range slider
    formatRange(val){
        return "last " + val + " minutes";
    },
  },

});

export const pieChart = chart.init(document.getElementById('realtime')); // 表示する場所のID

// const startTime = 1511757805295;

// realtimeDashboard.alivedeadratioData = [
//     {name: "alive"  , value: [0, 1511757805295, 1511757867942, 9440], itemStyle: alive_style },
//     {name: "dead"   , value: [0, 1511757867942, 1511757883206, 7977], itemStyle: dead_style},
//     {name: "alive"  , value: [0, 1511757883206, 1511757893161, 5092], itemStyle: alive_style},
//     {name: "alive"  , value: [1, 1511757805295, 1511757893161, 3000], itemStyle: alive_style},
//     {name: "dead"   , value: [2, 1511757805295, 1511757867942, 4742], itemStyle: dead_style},
//     {name: "alive"  , value: [2, 1511757867942, 1511757893161, 870 ], itemStyle: alive_style},
// ]


function renderItem(params, api) {
    var categoryIndex = api.value(0);
    var start = api.coord([api.value(1), categoryIndex]);
    var end = api.coord([api.value(2), categoryIndex]);
    var height = api.size([0, 1])[1] * 0.7;

    return {
        type: 'rect',
        shape: echarts.graphic.clipRectByRect({
            x: start[0],
            y: start[1] - height / 2,
            width: end[0] - start[0],
            height: height
        }, {
            x: params.coordSys.x,
            y: params.coordSys.y,
            width: params.coordSys.width,
            height: params.coordSys.height
        }),
        style: api.style()
    };
}


export let option = {
    toolbox: {
        show : true,
        feature : {
            // mark : {show: true},
            dataZoom : {show: true,title:{zoom:"zoom"}},
            // dataView : {show: true},
            // magicType : {show: true, type: ['line', 'bar']},
            // restore : {show: true},
            saveAsImage : {show: true,title:"Save as Image"}
        }
    },
    tooltip: {
        formatter: function (params) {
            let format;
            const time = params.value[3];
            format = params.marker + params.name + ': ' + time + ' ms' + '<br>';
            format += "s : " + moment(params.value[1]).format('YYYY-MM-DD HH:mm:ss.SSS') + "<br>";
            format += "e : " + moment(params.value[2]).format('YYYY-MM-DD HH:mm:ss.SSS');
            return format;
        },
        axisPointer: {
            animation: false,
            type: 'cross',
            lineStyle: {
                color: '#376df4',
                width: 2,
                opacity: 1
            }
        }
    },
    title: {
        text: 'Alive Dead Ratio',
        left: 'center'
    },
    legend: {
        data: ['bar', 'error']
    },
    dataZoom: [{
        show: true,
        xAxisIndex: [0],
        type: 'slider',
        filterMode: 'weakFilter',
        showDataShadow: false,
        top: realtimeDashboard.adHeight + 80,
        height: 10,
        borderColor: 'transparent',
        backgroundColor: '#e2e2e2',
        handleIcon: 'M10.7,11.9H9.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4h1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7v-1.2h6.6z M13.3,22H6.7v-1.2h6.6z M13.3,19.6H6.7v-1.2h6.6z', // jshint ignore:line
        handleSize: 10,
        handleStyle: {
            shadowBlur: 6,
            shadowOffsetX: 1,
            shadowOffsetY: 2,
            shadowColor: '#aaa'
        },
        labelFormatter: function (val) {
          let format;
          format = moment(val.value).format("MM-DD HH:mm:ss.SSS");
          return format;
        }
    }, {
        type: 'inside',
        xAxisIndex: [0],
        filterMode: 'weakFilter'
    }],
    grid: {
        height:realtimeDashboard.adHeight,
        left:150
    },
    xAxis: {
        // min: startTime,
        scale: true,
        boundaryGap: true,
        axisLabel: {
            formatter: function (val) {
              let format;
                format = moment(val).format("HH:mm:ss.SSS");
              return format;
            }
        },
        axisPointer: {
          label:{
            formatter: function (val) {
              let format;
              format = moment(val.value).format("'YY-MM-DD HH:mm:ss.SSS");
              return format;
            }
          }
        }
    },
    yAxis: {
        data: realtimeDashboard.adCategories,
        // offset:100
    },
    series: [{
        type: 'custom',
        renderItem: renderItem,
        itemStyle: {
            normal: {
                opacity: 0.8
            }
        },
        encode: {
            x: [1, 2],
            y: 0
        },
        data: realtimeDashboard.adData
    }]
};
