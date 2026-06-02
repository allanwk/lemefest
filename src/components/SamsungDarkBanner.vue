<template>
  <div class="samsung-banner">
    <v-icon class="samsung-banner-icon">mdi-information-outline</v-icon>
    <span class="samsung-banner-text">
      Para a melhor experiência, recomendamos acessar pelo <b>Google Chrome</b>. O modo escuro do Samsung Internet pode alterar as cores do site.
    </span>
    <v-btn icon small class="samsung-banner-close" @click="$emit('close')" aria-label="Fechar">
      <v-icon>mdi-close</v-icon>
    </v-btn>
  </div>
</template>

<script>
export default {
  name: 'SamsungDarkBanner',
};
</script>

<style scoped>
.samsung-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  padding: 6px 12px;
  background-color: #ffd54f;
  color: #212121;
  font-size: 13px;
  line-height: 1.25;
}

.samsung-banner-icon {
  color: #212121 !important;
  flex-shrink: 0;
}

.samsung-banner-text {
  flex: 1;
}

.samsung-banner-close {
  flex-shrink: 0;
  color: #212121 !important;
}
</style>
