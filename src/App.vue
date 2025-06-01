<template>
  <v-app>
    <v-app-bar
      app
      color="primary"
      dark
    >
      <v-toolbar-title>Festa Junina Leme 2025</v-toolbar-title>
    </v-app-bar>

    <v-main class="background">
      <StartForm v-if='step === steps.REGISTER' @gotoStep='handleGotoStep' @next="step = steps.QUEUE"/>
      <ResourceList v-if='[steps.QUEUE, steps.SELECTION].includes(step)' @next="step = steps.PAYMENT" @timeExpired="step = steps.SELECTION_EXPIRED"/>
      <PaymentStep v-if='step === steps.PAYMENT' @next="step = steps.PAID" @timeExpired="step = steps.PAYMENT_EXPIRED"/>
      <PurchaseFinished v-if='step === steps.FINISHED' />
      <TimeExpired v-if='[steps.PAYMENT_EXPIRED, steps.SELECTION_EXPIRED].includes(step)' :step="step"/>
    </v-main>
  </v-app>
</template>

<script>
import StartForm from './components/StartForm';
import ResourceList from './components/ResourceList';
import PaymentStep from './components/PaymentStep';
import PurchaseFinished from './components/PurchaseFinished';
import TimeExpired from './components/TimeExpired';

export default {
  name: 'App',

  components: {
    StartForm,
    ResourceList,
    PaymentStep,
    PurchaseFinished,
    TimeExpired
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
    },
    step: 0,
  }),

  methods: {
    handleGotoStep: function (stepId) {
      this.step = this.steps[Object.keys(this.steps).find(key => this.steps[key] === stepId)];
    }
  }
};
</script>
