import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import Toasted from 'vue-toasted';
import api from './api/axios';
import VueTheMask from 'vue-the-mask';


Vue.config.productionTip = false
Vue.prototype.$axios = api;

Vue.use(Toasted, {
  position: 'bottom-center',
  duration: 3000,
  theme: 'toasted-primary'
});

Vue.use(VueTheMask);

new Vue({
  vuetify,
  render: h => h(App)
}).$mount('#app')
