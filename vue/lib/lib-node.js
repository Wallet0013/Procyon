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

const config = {
  ip:"172.20.10.2/24",
  gateway:"172.20.10.1",
  external:true,
  ntp:"ntp.nict.jp",
}

const nodeTool = new Vue ({
  el: "#nodeTool",
  data() {
    return {
      nodeIP:config.ip,
      nodeGateway:config.gateway,
      nodeNTP:config.ntp,
      bootnodeDisabled:false,
      ntpDisable:false,
      selectNTP:"Use Internal NTP",
      DisableInput:false,
      dialogVisible:false,
      progress:0,
    }
  },
  methods : {
    bootNode() {
      co(function* () {
        nodeTool.bootnodeDisabled = true; // lock boot button
        nodeTool.DisableInput = true;

        // check exist procyon node
        const status = yield procyon_node.getMachineStatus();

        if( status.default.status == "running"){
          messageArea.$message({message:"Procyon node is already running.",type:"warning"});
          nodeTool.bootnodeDisabled = false; // release boot button
        } else{
          messageArea.$message({message:"flash arp",type:"info"});
          procyon_node.flushArptable();
          messageArea.$message({message:"Booting Procyon node! Please wait about 3 minutes",type:"info"});
          let bootcnt = 120;
          const incrementCnt = 0.8;
          const bootTimer = setInterval( () =>{
            bootcnt--;
            nodeTool.progress += incrementCnt;
          }, 1000);
          yield procyon_node.bootNode( () => {
            messageArea.$message({message:"Procyon node is booted.",type:"info"});
          } );

          // retry
          yield promiseRetry({
            retries: 5,
            factor: 3,
            minTimeout: 1 * 1000,
            maxTimeout: 10 * 1000
          },function (retry, number) {
            console.log('attempt number', number);
            bootcnt = 0;
            return procyon_node.setMgmt(nodeTool.nodeIP,nodeTool.nodeGateway, () =>{
              console.log("Management network is created.");
            })
            // .catch(retry);
            .catch(function (err) {
                if (err.code === 'ETIMEDOUT') {
                    retry(err);
                    console.log("ssh error");
                }
                throw err;
            });
          })
          .then(function (value) {
            procyon_node.setMongo( () => {
              console.log("Created mongoDB.");
              messageArea.$message({message:"Ready for Use.",type:"info"});
              nodeTool.progress = 100;
            });
            nodeTool.bootnodeDisabled = false;
            clearInterval(bootTimer);
          }, function (err) {
            console.log("error");
          });

          /////// ツールボックスを開放

        }
      });
    },
    setAddress() {
      messageArea.$message({message:"Set ip address to Procyon node",type:"info"});
      procyon_node.setAddress(nodeTool.nodeIP,nodeTool.nodeGateway);
    },
    getVersion() {
      procyon_node.getVersion( (x) => {
        messageArea.$message({message:x,type:"info"});
      });
    },
    haltNode() {
      messageArea.$message({message:"kill node",type:"info"});
      procyon_node.haltNode();

    },
    deleteNode() {
      nodeTool.dialogVisible = false;
      messageArea.$message({message:"Delete Procyon node",type:"info"});
      procyon_node.deleteNode( () => {
        messageArea.$message({message:"Procyon node is deleted",type:"info"});
        nodeTool.DisableInput = false;
        nodeTool.progress = 0;
      });
    },
    setNTP(){
      // console.log(config.ntp);
      nodeTool.ntpDisable = true;
      procyon_node.setNTP(nodeTool.nodeNTP , () => {
        messageArea.$message({message:"success setting ntp",type:"info"});
        nodeTool.ntpDisable = false;
      });
      // console.log("setntp");
    },
  }
})