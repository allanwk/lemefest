<template>
    <v-container fluid fill-height class="d-flex justify-center">
        <FullscreenLoader v-if="!loaded"/>
        <CountdownTimer v-else-if="remainingSeconds != null" :initial-time="remainingSeconds" ref="timer" message="O cadastro para seleção das mesas começará em:" @timerEnd="waitThenCheckIfStarted"/>
        <v-card v-if="unavailable" max-width="500">
            <v-card-title class="keep-words">Parece que o sistema ainda não está disponível, tente novamente mais tarde.</v-card-title>
        </v-card>
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
                retried: false,
                unavailable: false,
                timerEnded: false,
            }
        },
        mounted: async function () {
            await this.checkIfStarted();
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
                    console.log(e);
                    if (!this.retried || this.timerEnded) {
                        this.retried = true;
                        window.setTimeout(this.checkIfStarted, 5000);
                    } else {
                        this.loaded = true;
                        this.unavailable = true;
                    }
                }
            },
            waitThenCheckIfStarted: async function () {
                this.loaded = false;
                this.timerEnded = true;
                const rand = Math.floor(Math.random() * (500 + 1));
                window.setTimeout(this.checkIfStarted, rand);
            }
        },
    }
</script>

<style scoped>
    .keep-words {
        word-wrap: break-word;
        overflow-wrap: break-word;
        word-break: keep-all;
    }
</style>