module.exports = {
	showNotification : function showNotification(message,type){
		messageArea.$message({message:message,type:type});
	}
}

const messageArea = new Vue ({
  el: "#messageArea",
  data() {
    return {
    }
  }
})
