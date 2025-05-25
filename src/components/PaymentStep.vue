<template>
    <div>
        <h1>Pagamento</h1>
        <v-img v-if='qr_code_base64' :src="`data:image/png;base64,${qr_code_base64}`"></v-img>
    </div>
</template>

<script>
    export default {
        name: 'PaymentStep',
        data: function () {
            return {
                qr_code: null,
                qr_code_base64: null,
                interval: null,
            }
        },
        mounted: function () {
            this.loadPayment();
            this.startPolling();
        },
        methods: {
            loadPayment: async function () {
                const response = await this.$axios.post('/payment');
                if (response.data.pagamento) {
                    const { qr_code, qr_code_base64 } = response.data.pagamento;
                    this.qr_code = qr_code;
                    this.qr_code_base64 = qr_code_base64;
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
                }
            },
        }
    }
</script>