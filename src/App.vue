<template>
  <v-app>
    <v-app-bar
      app
      color="primary"
      dark
      :extension-height="samsungBannerVisible ? 72 : undefined"
    >
      <v-toolbar-title>Festa Junina Leme 2026</v-toolbar-title>
      <v-spacer></v-spacer>
        <v-img
        :src="require('@/assets/colegio.png')"
        contain
        height="40"
        max-width="40"
      ></v-img>

      <template v-if="samsungBannerVisible" v-slot:extension>
        <SamsungDarkBanner @close="bannerDismissed = true" />
      </template>
    </v-app-bar>

    <v-main class="background">
      <StartWaiting v-if="step === steps.START_WAITING" @next="step = steps.REGISTER"/>
      <StartForm v-if='step === steps.REGISTER' @gotoStep='handleGotoStep' @next="step = steps.QUEUE" :fromRestart="restart"/>
      <ResourceList v-if='[steps.QUEUE, steps.SELECTION].includes(step)' @next="step = steps.PAYMENT" @timeExpired="step = steps.SELECTION_EXPIRED" @cancelled="step = steps.CANCELLED"/>
      <PaymentStep v-if='step === steps.PAYMENT' @next="step = steps.PAID" @timeExpired="step = steps.PAYMENT_EXPIRED" @cancelled="step = steps.CANCELLED"/>
      <PurchaseFinished v-if='step === steps.PAID' @restart="handleRestart"/>
      <TimeExpired v-if='[steps.PAYMENT_EXPIRED, steps.SELECTION_EXPIRED].includes(step)' :step="step" @restart="handleRestart"/>
      <SelectionCancelled v-if='step === steps.CANCELLED' @restart="handleRestart"/>
    </v-main>
  </v-app>
</template>

<script>
import StartWaiting from './components/StartWaiting';
import StartForm from './components/StartForm';
import ResourceList from './components/ResourceList';
import PaymentStep from './components/PaymentStep';
import PurchaseFinished from './components/PurchaseFinished';
import TimeExpired from './components/TimeExpired';
import SelectionCancelled from './components/SelectionCancelled';
import SamsungDarkBanner from './components/SamsungDarkBanner';
import { isSamsungBrowser } from './utils/isSamsungBrowser';

export default {
  name: 'App',

  components: {
    StartWaiting,
    StartForm,
    ResourceList,
    PaymentStep,
    PurchaseFinished,
    TimeExpired,
    SelectionCancelled,
    SamsungDarkBanner
  },

  data: () => ({
    steps: {
      START_WAITING: -1,
      REGISTER: 0,
      QUEUE: 1,
      SELECTION: 2,
      PAYMENT: 3,
      PAID: 4,
      SELECTION_EXPIRED: 5,
      PAYMENT_EXPIRED: 6,
      CANCELLED: 7,
    },
    step: -1,
    restart: false,
    showSamsungBanner: false,
    bannerDismissed: false,
  }),

  computed: {
    samsungBannerVisible: function () {
      return this.showSamsungBanner && !this.bannerDismissed;
    }
  },

  mounted: function () {
    this.showSamsungBanner = isSamsungBrowser();
  },

  methods: {
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
