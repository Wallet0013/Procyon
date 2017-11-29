import co             from "co";
import moment         from "moment";
import ipaddr         from "ip";
import axios          from "axios";
import promiseRetry   from "promise-retry";
import child_process  from "child_process";
import BigNumber      from "bignumber.js";
import InspireTree    from "inspire-tree";
import InspireTreeDOM    from "inspire-tree-dom";

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



const tree = new InspireTree({
  editable: true,
  data: [{
      text: 'A node',
    },{
      text: 'B node',
    }
  ]
});

new InspireTreeDOM(tree, {
    target: '#treeView'
});

tree.on('node.click', (evt, node) => {
    // node clicked!
    console.log(['node clicked', evt, node]);
    projectTree.currentProj = node.text;
    console.log(projectTree.currentProj);
});


const projectTree = new Vue ({
  el: "#projectTree",
  data() {
    return {
      projectData: [{
        id: 1,
        label: 'ALL',
        children: [{
          id: 2,
          label: '01-01',
          children: [{
            id: 9,
            label: '01-02'
          }]
        },{
          id:3,
          label:"02-01"

        }]
      }],
      defaultProps: {
        children: 'children',
        label: 'label'
      },
      projectInput:"",
      currentProj:"",
    };
  },
  methods: {
    append(data) {
      const newChild = { id: id++, label: 'testtest', children: [] };
      if (!data.children) {
        this.$set(data, 'children', []);
      }
      data.children.push(newChild);
    },

    remove(node, data) {
      const parent = node.parent;
      const children = parent.data.children || parent.data;
      const index = children.findIndex(d => d.id === data.id);
      children.splice(index, 1);
    },

    renderContent(h, { node, data, store }) {
        // return (
        //   <span style="flex: 1; display: flex; align-items: center; justify-content: space-between; font-size: 14px; padding-right: 8px;">
        //     <span>
        //       <span>{node.label}</span>
        //     </span>
        //     <span>
        //       <el-button style="font-size: 12px;" type="text" on-click={ () => this.append(data) }>Append</el-button>
        //       <el-button style="font-size: 12px;" type="text" on-click={ () => this.remove(node, data) }>Delete</el-button>
        //     </span>
        //   </span>);
      }
  }
})