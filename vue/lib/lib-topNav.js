import co             from "co";
import moment         from "moment";
import ipaddr         from "ip";
import axios          from "axios";
import promiseRetry   from "promise-retry";
import child_process  from "child_process";
import BigNumber      from "bignumber.js";

// load Model util
import mongo          from "../util/mongo";
// load vagrant util
import procyon_node   from "../util/procyon-node";
import {messageArea}  from "../util/message";
import {nodeTool}       from "../lib/lib-node";
import {nodeAdd,containerTable,ResultArea,LogArea}       from "../index";
import {realtimeDashboard}        from "../realtime.js";

// element ui
import Vue      from 'vue'
import ElementUI    from 'element-ui'
import locale       from 'element-ui/lib/locale/lang/ja'
import 'element-ui/lib/theme-chalk/index.css'
Vue.use(ElementUI, {locale});

const topNav = new Vue({
  el : "#topNav",
  data() {
    return {
      activeIndex: '1'
    };
  },
  methods: {
    handleSelect(key, keyPath) {
      switch (key) {
        case "1":
          // console.log(key,keyPath);
          nodeTool.displayNodeTool = true;
          nodeAdd.displayNodeApp = false;
          containerTable.displayContainerTable = false;
          ResultArea.displayResultArea = false;
          realtimeDashboard.displayRealtimeDashboard = false;
          LogArea.displayLogArea = false;
          break;
        case "2":
          // console.log(key,keyPath);
          nodeTool.displayNodeTool = false;
          nodeAdd.displayNodeApp = true;
          containerTable.displayContainerTable = true;
          ResultArea.displayResultArea = true;
          realtimeDashboard.displayRealtimeDashboard = false;
          LogArea.displayLogArea = false;
          break;
        case "3":
          // console.log(key,keyPath);
          nodeTool.displayNodeTool = false;
          nodeAdd.displayNodeApp = false;
          containerTable.displayContainerTable = false;
          ResultArea.displayResultArea = false;
          realtimeDashboard.displayRealtimeDashboard = true;
          LogArea.displayLogArea = false;
          break;
        case "4":
          // console.log(key,keyPath);
          nodeTool.displayNodeTool = false;
          nodeAdd.displayNodeApp = false;
          containerTable.displayContainerTable = false;
          ResultArea.displayResultArea = false;
          realtimeDashboard.displayRealtimeDashboard = false;
          LogArea.displayLogArea = true;
          break;
        default:
          console.log("default");
          break;
      }
    },
  }
})