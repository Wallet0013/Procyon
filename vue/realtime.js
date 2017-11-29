import co             from "co";
import moment         from "moment";

// element ui
import Vue      from 'vue'
import ElementUI    from 'element-ui'
import locale       from 'element-ui/lib/locale/lang/ja'
import 'element-ui/lib/theme-chalk/index.css'

Vue.use(ElementUI, {locale});

import chart          from 'echarts';

const realtimeDashboard = new Vue ({
  el: "#realtimeDashboard",
  data() {
    return {
      // xAxis_data:["test","test2"],
      displayRealtimeDashboard:false,
    }
  },
  methods: {
    reloadChart() {
      co(function* () {
        option.series[0].data.push({name: "dead"  , value: [2, 1511757893161, 1511757993161, 170 ], itemStyle: alive_style});
        // option.series[0].data.shift();
        pieChart.setOption(option);
        console.log(option.series[0].data);
      })
    }
  }
});

var pieChart = chart.init(document.getElementById('realtime')); // 表示する場所のID


const categories = ['192.168.1.1->10.10.10.10', 'src2-dest1', 'src2-dest2'];

const dead_style    = {normal: {color: "#bd6d6c"}};
const alive_style   = {normal: {color: "#72b362"}};

const startTime = 1511757805295;

const datas = [
    {name: "alive"  , value: [0, 1511757805295, 1511757867942, 9440], itemStyle: alive_style },
    {name: "dead"   , value: [0, 1511757867942, 1511757883206, 7977], itemStyle: dead_style},
    {name: "alive"  , value: [0, 1511757883206, 1511757893161, 5092], itemStyle: alive_style},
    {name: "alive"  , value: [1, 1511757805295, 1511757893161, 3000], itemStyle: alive_style},
    {name: "dead"   , value: [2, 1511757805295, 1511757867942, 4742], itemStyle: dead_style},
    {name: "alive"  , value: [2, 1511757867942, 1511757893161, 870 ], itemStyle: alive_style},
]


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


const option = {
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
        top: 400,
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
        height:300
    },
    xAxis: {
        min: startTime,
        scale: true,
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
        data: categories
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
        data: datas
    }]
};



// オプションをインスタンスに適用
pieChart.setOption(option);



export {realtimeDashboard};