<template>
  <div class="server-unavailable">
    <v-card class="server-unavailable__card" max-width="360">
      <v-icon color="error" size="64">mdi-cloud-off-outline</v-icon>
      <div class="server-unavailable__title">Servidor indisponível</div>
      <div class="server-unavailable__message">
        Não foi possível conectar ao servidor. Tentando reconectar…
      </div>
      <v-progress-circular indeterminate size="28" color="error" />
    </v-card>
  </div>
</template>

<script>
export default {
  name: 'ServerUnavailable'
};
</script>

<style scoped>
.server-unavailable {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(255, 255, 255, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  padding: 16px;
}

.server-unavailable__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 24px;
  gap: 16px;
}

.server-unavailable__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--v-error-base);
}

.server-unavailable__message {
  font-size: 0.95rem;
  color: rgba(0, 0, 0, 0.7);
}
</style>
