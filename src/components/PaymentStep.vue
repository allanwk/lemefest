<template>
    <v-container fluid fill-height>
        <v-card>
            <v-card-title>
                <v-row justify="center" align="center">
                    <v-col>
                        Pague R${{ payment_value.toFixed(2) }} via PIX
                    </v-col>
                    <v-col v-if="remainingSeconds != null">
                        <countdown-timer :initial-time="remainingSeconds" ref="timer" />
                    </v-col>
                </v-row>
            </v-card-title>
            <v-card-text>
                <div class="mb-2">Escaneie o código QR:</div>
                <v-img v-if='qr_code_base64' :src="`data:image/png;base64,${qr_code_base64}`"></v-img>

                <v-divider class="mb-1"/>
                <div class="mb-2">Ou <a @click="copyCode"><b>copie</b></a> o código abaixo:</div>
                <v-text-field readonly :value="qr_code" append-icon="mdi-content-copy" @click:append="copyCode"/>
                <p>Você será redirecionado automaticamente assim que o pagamento for aprovado.</p>
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script>
    import CountdownTimer from './CountdownTimer';

    export default {
        name: 'PaymentStep',
        components: {
            CountdownTimer,
        },
        data: function () {
            return {
                qr_code: null,
                qr_code_base64: null,
                payment_value: null,
                interval: null,
                remainingSeconds: null,
            }
        },
        mounted: function () {
            this.loadPayment();
            this.startPolling();
        },
        beforeDestroy: function () {
            this.stopPolling();
        },
        methods: {
            loadPayment: async function () {
                const response = await this.$axios.post('/payment');
                if (response.data.pagamento) {
                    const { qr_code, qr_code_base64, valor } = response.data.pagamento;
                    this.qr_code = qr_code;
                    this.qr_code_base64 = qr_code_base64;
                    this.payment_value = Number(valor);
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
                    this.$toasted.error("Não foi possível consultar a fila");
                    return;
                }
                const user = response.data.usuario;
                if (user.id_etapa === 4) {
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
                this.$nextTick(() => {
                    this.$refs.timer.startTimer();
                })
            },
            copyCode: async function () {
                try {
                    await navigator.clipboard.writeText(this.textToCopy);
                    this.$toasted.success("Código copiado!");
                } catch (e) {
                    console.error(e);
                    this.$toasted.error("Não foi possível copiar o código");
                }
            }
        }
    }
</script>