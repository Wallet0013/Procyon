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
import message        from "../util/message";

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
          message.showNotification("Procyon node is already running.","warning");
          nodeTool.bootnodeDisabled = false; // release boot button
        } else{
          message.showNotification("flash arp","info");
          procyon_node.flushArptable();
          message.showNotification("Booting Procyon node! Please wait about 3 minutes","info");
          let bootcnt = 120;
          const incrementCnt = 0.8;
          const bootTimer = setInterval( () =>{
            bootcnt--;
            nodeTool.progress += incrementCnt;
          }, 1000);
          yield procyon_node.bootNode( () => {
            message.showNotification("Procyon node is booted.","info");
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
            nodeTool.progress = 100;
            return procyon_node.setMgmt(nodeTool.nodeIP,nodeTool.nodeGateway, () =>{
              message.showNotification("Management network is created.","info");
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
              message.showNotification("Created mongoDB.","info");
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
      message.showNotification("Set ip address to Procyon node");
      procyon_node.setAddress(nodeTool.nodeIP,nodeTool.nodeGateway);
    },
    getVersion() {
      message.showNotification("Get vagrant version");
      procyon_node.getVersion();
    },
    haltNode() {
      message.showNotification("kill node");
      procyon_node.haltNode();

    },
    deleteNode() {
      nodeTool.dialogVisible = false;
      message.showNotification("Delete Procyon node","info");
      procyon_node.deleteNode( () => {
        message.showNotification("Procyon node is deleted","info");
        nodeTool.DisableInput = false;
      });
    },
    setNTP(){
      console.log("setntp");
    },
  }
})