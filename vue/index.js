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
import {timeRange}      from "./lib/lib-analytics";
import {realtimeDashboard,pieChart,option}        from "./lib/lib-realtime.js";
