const chart = require('echarts');

var pieChart = chart.init(document.getElementById('pie-chart')); // 表示する場所のID

// set chart options
var pieOption = {
  title:{
    text:"Living Ratio"
  },
  tooltip : {
      trigger: 'axis',
      axisPointer : {
          type : 'shadow'
      }
  },
  color: [
    "#66BB6A",
    "#EF5350"
  ],
  legend: {
      data:['Alive','Dead']
  },
  grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
  },
  xAxis : [
      {
          type : 'category',
          data : ['host1-dest1','host2-dest2']
      }
  ],
  yAxis : [
      {
          type : 'value'
      }
  ],
  series : [
      {
          name:'Alive',
          type:'bar',
          stack:'ratio',
          data:[20, 40]
      },
      {
          name:'Dead',
          type:'bar',
          stack: 'ratio',
          data:[80, 60]
      }
  ]
};
// オプションをインスタンスに適用
pieChart.setOption(pieOption);