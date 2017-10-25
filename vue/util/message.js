// element ui
import Vue 			from 'vue'
import ElementUI  	from 'element-ui'
import locale     	from 'element-ui/lib/locale/lang/ja'
import 'element-ui/lib/theme-default/index.css'
Vue.use(ElementUI, {locale});


export const messageArea = new Vue ({
  el: "#messageArea",
  data() {
    return {}
  }
})
