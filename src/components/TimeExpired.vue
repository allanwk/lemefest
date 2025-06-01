<template>
    <v-container fluid fill-height>
        <v-card style="width:100%">
            <v-card-title>
                Tempo expirado!
            </v-card-title>
            <v-card-text>
                <p>{{ getMessage }}</p>
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script>
    export default {
        name: 'TimeExpired',
        data: function () {
            return {
                steps: {
                    REGISTER: 0,
                    QUEUE: 1,
                    SELECTION: 2,
                    PAYMENT: 3,
                    PAID: 4,
                    SELECTION_EXPIRED: 5,
                    PAYMENT_EXPIRED: 6,
                }
            }
        },
        props: {
            step: {
                type: Number,
                required: true,
            },
        },
        computed: {
            getMessage: function () {
                if (this.step === this.steps.SELECTION_EXPIRED) {
                    return "O tempo para escolher as mesas expirou";
                }
                if (this.step === this.steps.PAYMENT_EXPIRED) {
                    return "O tempo para pagamento expirou";
                }
                return null;
            }
        }
    }
</script>