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

// element ui
import Vue      from 'vue'
import ElementUI    from 'element-ui'
import locale       from 'element-ui/lib/locale/lang/ja'
import 'element-ui/lib/theme-default/index.css'
Vue.use(ElementUI, {locale});

const projectTree = new Vue ({
  el: "#projectTree",
  data() {
      return {
        data2: [{
          id: 1,
          label: 'Level one 1',
          children: [{
            id: 4,
            label: 'Level two 1-1',
            children: [{
              id: 9,
              label: 'Level three 1-1-1'
            }, {
              id: 10,
              label: 'Level three 1-1-2'
            }]
          }]
        }, {
          id: 2,
          label: 'Level one 2',
          children: [{
            id: 5,
            label: 'Level two 2-1'
          }, {
            id: 6,
            label: 'Level two 2-2'
          }]
        }, {
          id: 3,
          label: 'Level one 3',
          children: [{
            id: 7,
            label: 'Level two 3-1'
          }, {
            id: 8,
            label: 'Level two 3-2'
          }]
        }],
        defaultProps: {
          children: 'children',
          label: 'label'
        }
      };
    }
  })