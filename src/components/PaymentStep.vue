<template>
    <v-container fluid fill-height class="d-flex justify-center">
        <FullscreenLoader v-if="!loaded"/>
        <v-card v-else class="payment-card">
            <v-card-title>
                <v-row justify="center" align="center">
                    <v-col class="keep-words" v-if="payment_value != null">
                        Pague R${{ payment_value.toFixed(2) }} via PIX
                    </v-col>
                    <v-col v-if="remainingSeconds != null">
                        <countdown-timer :initial-time="remainingSeconds" ref="timer" message="Tempo restante" @timerEnd="atTimerEnd"/>
                    </v-col>
                </v-row>
            </v-card-title>
            <v-card-text>
                <div class="mb-2">Escaneie o código QR:</div>
                <v-img v-if='qr_code_base64' :src="`data:image/png;base64,${qr_code_base64}`"></v-img>

                <v-divider class="mb-1"/>
                <div class="mb-2">Ou use o código abaixo:</div>
                <v-text-field id="textToCopy" readonly :value="qr_code" append-icon="mdi-content-copy" @click:append="copyCode"/>
                <v-row align="center">
                    <v-col style="display: flex; gap: 10px">
                        <v-btn color="error" @click="cancelDialog = true" style="flex: 1">Cancelar</v-btn>
                        <v-btn color="primary" @click="copyCode" style="flex: 1">Copiar código</v-btn>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col>
                        <p>Você será redirecionado automaticamente assim que o pagamento for aprovado.</p>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>
        <v-dialog v-model="cancelDialog" max-width="400">
            <v-card>
                <v-card-title>Atenção</v-card-title>
                <v-card-text>Tem certeza que deseja cancelar? As mesas não serão reservadas. Para comprar novas mesas, será necessário entrar na fila novamente.</v-card-text>
                <v-card-actions style="flex-wrap: wrap; gap: 5px">
                    <v-btn @click="cancelDialog = false" style="width: 100%; margin: 0 !important">Continuar pagamento</v-btn>
                    <v-btn color="error" @click="cancelSelection" :loading="cancelLoading" style="width: 100%; margin: 0 !important">Cancelar compra</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-container>
</template>

<script>
    import CountdownTimer from './CountdownTimer';
    import FullscreenLoader from './FullscreenLoader';

    export default {
        name: 'PaymentStep',
        components: {
            CountdownTimer,
            FullscreenLoader,
        },
        data: function () {
            return {
                qr_code: null,
                qr_code_base64: null,
                payment_value: null,
                interval: null,
                remainingSeconds: null,
                shownAlert: false,
                loaded: false,
                cancelDialog: false,
                cancelLoading: false,
                timeout: null,
            }
        },
        mounted: function () {
            this.loadPayment();
            this.startPolling();
        },
        beforeDestroy: function () {
            this.stopPolling();
            if (this.timeout) {
                window.clearTimeout(this.timeout);
            }
        },
        methods: {
            loadPayment: async function () {
                try {
                    const response = await this.$axios.post('/payment');
                    if (response.data.pagamento) {
                        const { qr_code, qr_code_base64, valor } = response.data.pagamento;
                        this.qr_code = qr_code;
                        this.qr_code_base64 = qr_code_base64;
                        this.payment_value = Number(valor);
                        this.loaded = true;
                    }
                } catch (e) {
                    this.$toasted.error("Erro ao carregar pagamento. Por favor recarregue a página em instantes");
                }
            },
            startPolling: function () {
                if (!this.interval) {
                    this.getState();
                    this.interval = window.setInterval(this.getState, 5000);
                }
            },
            stopPolling: function () {
                if (this.interval) {
                    window.clearInterval(this.interval);
                    this.interval = null;
                }
            },
            getState: async function () {
                let response;
                try {
                    response = await this.$axios.post('/state');
                } catch (e) {
                    console.error(e);
                    // this.$toasted.error("Não foi possível consultar a fila");
                    return;
                }
                const user = response.data.usuario;
                if (parseInt(user.id_etapa, 10) === 7) {
                    this.stopPolling();
                    this.$emit('cancelled');
                    return;
                }
                if (parseInt(user.id_etapa, 10) === 4) {
                    this.stopPolling();
                    this.$emit('next');
                    return;
                }
                if (parseInt(user.segundos_restantes_pagamento, 10) < 0) {
                    this.stopPolling();
                    this.$emit('timeExpired');
                    return;
                }

                this.remainingSeconds = user.segundos_restantes_pagamento;

                if (!this.shownAlert && parseInt(this.remainingSeconds, 10) <= 60) {
                    this.$toasted.error("Atenção! Você tem menos de um minuto para realizar o pagamento. Realize o pagamento dentro do tempo limite para garantir suas mesas.", {
                        duration: 8000,
                    })
                    this.shownAlert = true;
                }

                this.$nextTick(() => {
                    if (this.$refs.timer) {
                        this.$refs.timer.startTimer();
                    } else {
                        window.setTimeout(this.startTimer, 1000);
                    }
                })
            },
            copyCode: async function () {
                try {
                    let copyText = document.querySelector("#textToCopy");
                    copyText.select();
                    document.execCommand("copy");
                    this.$toasted.success('Código copiado!');
                } catch (e) {
                    console.error(e);
                    this.$toasted.error("Não foi possível copiar o código");
                }
            },
            startTimer: function () {
                if (this.$refs.timer) {
                    this.$refs.timer.startTimer();
                }
            },
            atTimerEnd: function () {
                this.stopPolling();
                this.timeout = window.setTimeout(this.startPolling, 1000);
            },
            cancelSelection: async function () {
                this.cancelLoading = true;
                try {
                    await this.$axios.post('/user/cancel');
                    this.stopPolling();
                    this.$emit('cancelled');
                } catch (e) {
                    console.error(e);
                    this.$toasted.error("Não foi possível cancelar. Por favor tente novamente.", { position: 'top-center' });
                } finally {
                    this.cancelLoading = false;
                    this.cancelDialog = false;
                }
            }
        }
    }
</script>

<style scoped>
    .keep-words {
        word-wrap: break-word;
        overflow-wrap: break-word;
        word-break: keep-all;
    }

    .payment-card {
        max-width: min(100vw, 370px);
    }
</style>