<template>
    <div class="fullscreen-loader">
        <v-progress-circular indeterminate size="64" color="primary" />
    </div>
</template>

<script>
export default {}
</script>

<style scoped>
.fullscreen-loader {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(255, 255, 255, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
}
</style>