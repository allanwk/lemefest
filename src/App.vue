<template>
  <v-app>
    <v-app-bar
      app
      color="primary"
      dark
      :extension-height="samsungBannerVisible ? 72 : undefined"
    >
      <v-toolbar-title>{{ appBarTitle }}</v-toolbar-title>
      <v-spacer></v-spacer>
        <v-img
        :src="require('@/assets/colegio.png')"
        contain
        height="40"
        max-width="40"
      ></v-img>

      <template v-if="samsungBannerVisible" v-slot:extension>
        <SamsungDarkBanner @close="dismissBanner" />
      </template>
    </v-app-bar>

    <v-main class="background">
      <Admin v-if="isAdmin"/>
      <FichaFlow v-else-if="isFichas" @exit="exitFichas"/>
      <template v-else-if="sessionReady">
        <StartForm v-if='step === steps.REGISTER' @gotoStep='handleGotoStep' @next="step = steps.QUEUE" :fromRestart="restart"/>
        <ResourceList v-if='[steps.QUEUE, steps.SELECTION].includes(step)' @next="step = steps.PAYMENT" @timeExpired="step = steps.SELECTION_EXPIRED" @cancelled="step = steps.CANCELLED"/>
        <PaymentStep v-if='step === steps.PAYMENT' @next="step = steps.PAID" @timeExpired="step = steps.PAYMENT_EXPIRED" @cancelled="step = steps.CANCELLED"/>
        <PurchaseFinished v-if='step === steps.PAID' @restart="handleRestart"/>
        <TimeExpired v-if='[steps.PAYMENT_EXPIRED, steps.SELECTION_EXPIRED].includes(step)' :step="step" @restart="handleRestart"/>
        <SelectionCancelled v-if='step === steps.CANCELLED' @restart="handleRestart"/>
      </template>
    </v-main>

    <ServerUnavailable v-if="serverUnavailable" />
  </v-app>
</template>

<script>
import StartForm from './components/StartForm';
import ResourceList from './components/ResourceList';
import PaymentStep from './components/PaymentStep';
import PurchaseFinished from './components/PurchaseFinished';
import TimeExpired from './components/TimeExpired';
import SelectionCancelled from './components/SelectionCancelled';
import SamsungDarkBanner from './components/SamsungDarkBanner';
import Admin from './components/Admin';
import FichaFlow from './components/FichaFlow';
import ServerUnavailable from './components/ServerUnavailable';
import { isSamsungBrowser } from './utils/isSamsungBrowser';
import api from './api/axios';
import stateStream from './api/stateStream';

export default {
  name: 'App',

  components: {
    StartForm,
    ResourceList,
    PaymentStep,
    PurchaseFinished,
    TimeExpired,
    SelectionCancelled,
    SamsungDarkBanner,
    Admin,
    FichaFlow,
    ServerUnavailable
  },

  data: () => ({
    steps: {
      REGISTER: 0,
      QUEUE: 1,
      SELECTION: 2,
      PAYMENT: 3,
      PAID: 4,
      SELECTION_EXPIRED: 5,
      PAYMENT_EXPIRED: 6,
      CANCELLED: 7,
    },
    step: 0,
    restart: false,
    showSamsungBanner: false,
    bannerDismissed: localStorage.getItem('samsungBannerDismissed') === 'true',
    sessionReady: false,
    serverUnavailable: false,
    retryTimer: null,
    isAdmin: window.location.hash.startsWith('#/admin'),
    isFichas: window.location.hash.startsWith('#/fichas'),
  }),

  computed: {
    samsungBannerVisible: function () {
      return this.showSamsungBanner && !this.bannerDismissed;
    },
    appBarTitle: function () {
      if (this.isAdmin) return 'Administração';
      if (this.isFichas) return 'Compra de fichas';
      return 'Festa Junina Leme 2026';
    }
  },

  async created() {
    window.addEventListener('hashchange', this.handleHashChange);
    await this.checkServerAndConnect();
  },

  mounted: function () {
    this.showSamsungBanner = isSamsungBrowser();
  },

  beforeDestroy: function () {
    window.removeEventListener('hashchange', this.handleHashChange);
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    stateStream.stop();
  },

  methods: {
    async checkServerAndConnect() {
      try {
        await api.get('/health');
      } catch (e) {
        this.serverUnavailable = true;
        this.retryTimer = setTimeout(this.checkServerAndConnect, 5000);
        return;
      }
      this.serverUnavailable = false;
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
      if (this.isAdmin) return;
      await this.ensureTabSession();
      this.sessionReady = true;
      if (sessionStorage.getItem('token') && !this.isFichas) {
        stateStream.connect();
      }
    },

    dismissBanner() {
      this.bannerDismissed = true;
      localStorage.setItem('samsungBannerDismissed', 'true');
    },

    async ensureTabSession() {
      if (sessionStorage.getItem('token')) return;
      const bootstrap = localStorage.getItem('bootstrapToken');
      if (!bootstrap) return;
      try {
        const response = await api.post('/user/claim-session', {}, {
          headers: { Authorization: bootstrap },
        });
        sessionStorage.setItem('token', response.data.token);
        localStorage.setItem('bootstrapToken', response.data.token);
      } catch (e) {
        const status = e.response?.status;
        if (status === 401 || status === 403) {
          sessionStorage.removeItem('token');
          localStorage.removeItem('bootstrapToken');
        } else {
          console.error(e);
        }
      }
    },
    handleHashChange: function () {
      this.isAdmin = window.location.hash.startsWith('#/admin');
      this.isFichas = window.location.hash.startsWith('#/fichas');
      if (this.isFichas || this.isAdmin) {
        stateStream.stop();
      } else if (sessionStorage.getItem('token')) {
        stateStream.connect();
      }
    },
    exitFichas: function () {
      window.location.hash = '';
    },
    handleGotoStep: function (stepId) {
      this.step = this.steps[Object.keys(this.steps).find(key => this.steps[key] === stepId)];
    },
    handleRestart: function () {
      this.$toasted.success('Aqui você pode informar mais RMs de alunos para comprar mais mesas. Com tudo pronto, basta clicar em "Entrar na fila"', {
        duration: 8000,
      });
      this.step = this.steps.REGISTER;
      this.restart = true;
    }
  }
};
</script>

<style scoped>
.v-app-bar >>> .v-toolbar__extension {
  padding: 0;
}
</style>
