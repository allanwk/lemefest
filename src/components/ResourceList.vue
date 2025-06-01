<template>
    <v-container fluid fill-height>
        
        <v-card style="width:100%">
            <v-card-title>
                <v-row justify="center" align="center">
                    <v-col>
                        {{getTitle}}
                    </v-col>
                    <v-col v-if="step === steps.SELECTION && remainingSeconds != null">
                        <countdown-timer :initial-time="remainingSeconds" ref="timer" />
                    </v-col>
                </v-row>
            </v-card-title>
            <v-card-text>
                <v-progress-linear v-if='step === steps.QUEUE' indeterminate rounded/>
                <v-simple-table>
                <tbody>
                <tr
                    v-for="(row, rowIndex) in chunkedResources"
                    :key="rowIndex"
                    style="border-bottom: none"
                >
                    <td
                        v-for="item in row"
                        :key="item.id_recurso"
                        style="border-bottom: none"
                    >
                        <NumberToggle
                            v-model="selected"
                            :value="item.id_recurso"
                            :number="parseInt(item.nome_recurso_short, 10)"
                            :state="getResourceState(item)"
                            :readonly="step === steps.QUEUE"
                        />                        
                    </td>
                </tr>
                </tbody>
            </v-simple-table>
            </v-card-text>
            <v-card-actions>
                
            </v-card-actions>
        </v-card>
        <v-footer
            color="primary"
            app
            v-if="step === steps.SELECTION"
            >
            <span style="color:background">{{ totalPriceLabel }}</span>
            <v-spacer/>
            <v-btn color='background' @click="requestPickedResources" :loading="buttonLoading">{{ buyButtonLabel }}</v-btn>
        </v-footer>
    </v-container>
</template>

<script>
    import NumberToggle from './NumberToggle';
    import CountdownTimer from './CountdownTimer';

    export default {
        name: 'ResourceList',
        components: {
            NumberToggle,
            CountdownTimer,
        },
        data: function () {
            return {
                interval: null,
                resourceInterval: null,
                step: 1,
                steps: {
                    REGISTER: 0,
                    QUEUE: 1,
                    SELECTION: 2,
                    PAYMENT: 3,
                    PAID: 4,
                    SELECTION_EXPIRED: 5,
                },
                resources: [],
                unavailableResources: [],
                selected: [],
                qr_code: null,
                qr_code_base64: null,
                buttonLoading: false,
                tableLimit: 0,
                remainingSeconds: null,
            };
        },
        mounted: function () {
            this.startPolling();
        },
        computed: {
            getTitle: function () {
                if (this.step === this.steps.QUEUE) {
                    return "Aguarde, você está na fila";
                }
                if (this.step === this.steps.SELECTION) {
                    return "Hora de escolher suas mesas";
                }
                return null;
            },
            chunkedResources() {
                const chunkSize = 4;
                const chunks = [];
                for (let i = 0; i < this.resources.length; i += chunkSize) {
                    chunks.push(this.resources.slice(i, i + chunkSize));
                }
                return chunks;
            },
            getMySelectedResourceIds() {
                return this.selected.filter(id => {
                    const resource = this.resources.find(resource => resource.id_recurso === id);
                    return resource.id_status_recurso === 1 || resource.solicitado_por_mim === 1
                })
            },
            buyButtonLabel: function () {
                if (this.getMySelectedResourceIds.length === 1) {
                    return "Comprar mesa";
                } else if (this.getMySelectedResourceIds.length > 1) {
                    return `Comprar ${this.getMySelectedResourceIds.length} mesas`;
                }
                return "Comprar mesas";
            },
            totalPriceLabel: function () {
                const total = this.getMySelectedResourceIds.reduce((acc, resourceId) => {return acc + Number(this.resources.find(res => res.id_recurso === resourceId).valor)}, 0);
                return "Total: R$ " + total.toFixed(2);
            },
            resourceLimitReached: function () {
                return this.getMySelectedResourceIds.length >= this.tableLimit;
            }
        },
        methods: {
            startPolling: function () {
                if (!this.interval) {
                    this.getState();
                    this.interval = window.setInterval(this.getState, 5000);
                }
                if (!this.resourceInterval) {
                    this.getResources();
                    this.resourceInterval = window.setInterval(this.getResources, 10000);
                }
            },
            stopPollingState: function () {
                if (this.interval) {
                    window.clearInterval(this.interval);
                    this.interval = null;
                }
            },
            stopPollingResources: function () {
                if (this.resourceInterval) {
                    window.clearInterval(this.resourceInterval);
                    this.resourceInterval = null;
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
                if (parseInt(user.segundos_restantes_selecao) < 0) {
                    this.stopPollingResources();
                    this.stopPollingState();
                    this.$emit('timeExpired');
                    return;
                }
                if (user.minha_vez === 1 && this.step === this.steps.QUEUE) {
                    this.startSelectionStep();
                    this.tableLimit = parseInt(user.limite_mesas, 10);
                    this.remainingSeconds = user.segundos_restantes_selecao;
                    this.$nextTick(() => {
                        this.$refs.timer.startTimer();
                    })
                    return;
                }
                if (user.minha_vez === 1 && this.step === this.steps.SELECTION) {
                    this.remainingSeconds = user.segundos_restantes_selecao;
                    this.$nextTick(() => {
                        this.$refs.timer.startTimer();
                    })
                }
            },
            getResources: async function () {
                let response;
                try {
                    response = await this.$axios.post('/resource');
                } catch (e) {
                    console.error(e);
                    this.$toasted.error("Não foi possível consultar os recursos");
                    return;
                }
                this.resources = response.data.recursos;
                this.selected = this.resources.filter(resource => resource.id_status_recurso !== 1).map(resource => resource.id_recurso);
            },
            startSelectionStep: function () {
                this.stopPollingResources();
                this.step = this.steps.SELECTION;
                this.getResources();
            },
            requestPickedResources: async function () {
                if (!this.getMySelectedResourceIds) {
                    this.$toasted.error("É necessário escolher ao menos uma mesa");
                    return;
                }
                this.buttonLoading = true;
                let paymentResponse;
                try {
                    paymentResponse = await this.$axios.post('/resource/request', {
                        resource_ids: this.getMySelectedResourceIds
                    });
                } catch (e) {
                    console.error(e);
                    this.$toasted.error("Não foi possível solicitar os recursos");
                    return;
                } finally {
                    this.buttonLoading = false;
                }
                this.stopPollingResources();
                this.stopPollingState();
                this.$emit('next', paymentResponse);
            },
            getResourceState: function (item) {
                if (item.id_status_recurso !== 1 && !item.solicitado_por_mim) {
                    return 3; //disabled dark
                }
                
                if (this.step === this.steps.QUEUE) {
                    return 1; //disabled, but no appearance change
                }

                if (this.resourceLimitReached && this.selected.findIndex(it => it === item.id_recurso) === -1) {
                    return 2; //disabled light
                }

                return 0;
            }
        }
    }
</script>