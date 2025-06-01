<template>
    <v-container fluid fill-height>
        <FullscreenLoader v-if="!loaded"/>
        <CountdownTimer v-else-if="remainingSeconds != null" :initial-time="remainingSeconds" ref="timer" message="O cadastro para seleção das mesas começará em:"/>
    </v-container>
</template>

<script>
    import FullscreenLoader from './FullscreenLoader';
    import CountdownTimer from './CountdownTimer';

    export default {
        name: 'StartWaiting',
        components: {
            FullscreenLoader,
            CountdownTimer,
        },
        data: function () {
            return {
                loaded: false,
                remainingSeconds: null,
                interval: null,
            }
        },
        mounted: async function () {
            await this.checkIfStarted();
            this.startPolling();
        },
        beforeDestroy: function () {
            this.stopPolling();
        },
        methods: {
            checkIfStarted: async function () {
                try {
                    const response = await this.$axios.post('/state/getStarted');
                    if (response.data.segundos_ate_liberacao != null) {
                        if (parseInt(response.data.segundos_ate_liberacao, 10) <= 0) {
                            this.$emit('next');
                        } else {
                            this.loaded = true;
                            this.remainingSeconds = response.data.segundos_ate_liberacao;
                            this.$nextTick(() => {
                                this.$refs.timer.startTimer();
                            })
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
            },
            startPolling: function () {
                if (this.interval == null) {
                    this.interval = window.setInterval(this.checkIfStarted, 5000);
                }
            },
            stopPolling: function () {
                if (this.interval != null) {
                    window.clearInterval(this.interval);
                    this.interval = null;
                }
            },
        },
    }
</script>