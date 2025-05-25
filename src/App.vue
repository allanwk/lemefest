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
      <ResourceList v-if='[steps.QUEUE, steps.SELECTION].includes(step)' @next="step = steps.PAYMENT"/>
      <PaymentStep v-if='step === steps.PAYMENT' @next="step = steps.FINISHED"/>
      <PurchaseFinished v-if='step === steps.FINISHED' />
    </v-main>
  </v-app>
</template>

<script>
import StartForm from './components/StartForm';
import ResourceList from './components/ResourceList';
import PaymentStep from './components/PaymentStep';
import PurchaseFinished from './components/PurchaseFinished';

export default {
  name: 'App',

  components: {
    StartForm,
    ResourceList,
    PaymentStep,
    PurchaseFinished
  },

  data: () => ({
    steps: {
      REGISTER: 0,
      QUEUE: 1,
      SELECTION: 2,
      PAYMENT: 3,
      FINISHED: 4,
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
