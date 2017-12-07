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
  el:"timeRange",
  data (){
    return{
      displaytimeRange:false,
    }
  },
  mounted: function(){
    const targetId = document.getElementById('timeRange');
    const appendDiv = document.createElement('div');
    targetId.appendChild(appendDiv);
    const curretWidth = (document.body.clientWidth - 500);
    // const curretWidth = 500;
    const data = [
      [1512606536,10,100],
      [1512606537,20,80],
      [1512606538,50,60],
      [1512606539,70,80],
      [1512606540,20,100],
      [1512606541,33,22]
    ];
    const option = {
      labels: [ "Date", "AA", "BB" ],
      width:curretWidth,
      height: 100,
      axis : {
        x : {
                    valueFormatter: Dygraph.dateString_,
                    valueParser: function(x) { return 1000*parseInt(x); },
                    ticker: Dygraph.dateTicker   
        }
      }

    };

    const g = new Dygraph(appendDiv, data, option);
  }
})