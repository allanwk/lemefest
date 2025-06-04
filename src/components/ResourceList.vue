<template>
    <v-container fluid fill-height>
        <v-card style="width:100%">
            <v-card-title class="py-1">
                <v-row justify="center" align="center">
                    <v-col v-if="step === steps.SELECTION && remainingSeconds != null">
                        <countdown-timer :initial-time="remainingSeconds" ref="timer" message="Tempo para escolher: " />
                    </v-col>
                    <v-col v-else style="min-width: 170px; display: flex; align-content: center; justify-content: center;">
                        <span class="mr-2 keep-words">{{ getTitle }}</span>
                        <v-progress-circular v-if='step === steps.QUEUE' indeterminate color="primary" />
                    </v-col>
                </v-row>
            </v-card-title>
            <v-card-text>
                <div class="table-map">
                    <div style="grid-area: 1 / 14 / span 1 / span 7; display: grid; place-items: center;">
                        <h1>Cantina e bar</h1>
                    </div>
                    <div style="grid-area: 3 / 21 / span 9 / span 1; display: grid; place-items: center;">
                        <h1 style="writing-mode: vertical-rl">Palco da quadra / caixa</h1>
                    </div>
                    <div class="border" style="grid-area: 2 / 1 / 12 / 21; margin:-10px"></div>
                    <NumberToggle v-for="item in positionedResources" :key="item.id_recurso"
                        v-model="selected" :value="item.id_recurso" :number="parseInt(item.nome_recurso_short, 10)"
                        :state="getResourceState(item)" :readonly="step === steps.QUEUE" :style="getItemStyle(item)"/>
                    <div class="palco border">
                        <div style="grid-area: 1 / 1 / span 4 / span 7; display: grid; place-items: center;">
                            <h1>Apresentações</h1>
                        </div>
                        <div class="border" style="grid-area: 5 / 1 / span 1 / span 3; display: grid; place-items: center;">
                            <h2>Fotos</h2>
                        </div>
                        <div class="border" style="grid-area: 5 / 5 / span 1 / span 3; display: grid; place-items: center;">
                            <h2>Fotos</h2>
                        </div>
                    </div>
                    <div style="grid-area: 12 / 1 / 12 / 7">
                        <h1 style="text-align: left;">Entrada</h1>
                        <v-icon style="transform: scaleX(4) scaleY(1); transform-origin:left;">mdi-arrow-right-bold</v-icon>
                    </div>
                    <div style="grid-area: 13 / 1 / 13 / 21; display: grid; place-items: center;">
                        <h1 style="text-align: left;">Arquibancada</h1>
                    </div>
                </div>
            </v-card-text>
        </v-card>
        <v-dialog v-model="informationDialog">
            <v-card>
                <v-card-title>
                    Seleção de mesas
                </v-card-title>
                <v-card-text>
                    <ul>
                        <li>Para navegar pelo mapa, basta arrastar a tela</li>
                        <li>Quando chegar a sua vez na fila, você poderá clicar nas mesas para escolhê-las</li>
                        <li>Fique atento ao <b>tempo limite</b> para escolher as mesas. Quando for sua vez, um contador aparecerá no topo da tela.</li>
                        <li>Quando tiver escolhido suas mesas, basta clicar no botão "Comprar mesas" na parte inferior da tela</li>
                    </ul>
                </v-card-text>
                <v-card-actions>
                    <v-spacer/>
                    <v-btn color="primary" @click="informationDialog = false">OK</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        <v-footer color="primary" app style="justify-content: end; gap: 5px">
            <template v-if="step === steps.SELECTION">
                <span style="color:background">{{ totalPriceLabel }}</span>
                <v-spacer />
                <v-btn color='background' @click="informationDialog = true">Ajuda</v-btn>
                <v-btn color='background' @click="requestPickedResources" :loading="buttonLoading">{{ buyButtonLabel }}</v-btn>
            </template>
            <v-btn v-else color='background' @click="informationDialog = true">Ajuda</v-btn>
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
            informationDialog: true,
            shownAlert: false,
            queuePosition: null,
        };
    },
    mounted: function () {
        this.startPolling();
    },
    beforeDestroy: function () {
        this.stopPollingState();
        this.stopPollingResources();
    },
    computed: {
        getTitle: function () {
            if (this.step === this.steps.QUEUE) {
                if (this.queuePosition <= 2) {
                    return "Aguarde, você será o próximo a escolher.";
                }
                if (this.queuePosition != null) {
                    return `Aguarde, você está em ${this.queuePosition}º lugar na fila.`;
                }
                return "Aguarde, você está na fila.";
            }
            if (this.step === this.steps.SELECTION) {
                return "Tempo para escolher:";
            }
            return null;
        },
        positionedResources() {
            return this.resources.filter(item => item.column_start != null);
        },
        getMySelectedResourceIds() {
            return this.selected.filter(id => {
                const resource = this.resources.find(resource => resource.id_recurso === id);
                return resource.id_status_recurso === 1 || (resource.id_status_recurso !== 4 && resource.solicitado_por_mim === 1)
            })
        },
        getMyBookedResources() {
            return this.selected.filter(id => {
                const resource = this.resources.find(resource => resource.id_recurso === id);
                return resource.id_status_recurso === 4 && resource.solicitado_por_mim === 1
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
            const total = this.getMySelectedResourceIds.reduce((acc, resourceId) => { return acc + Number(this.resources.find(res => res.id_recurso === resourceId).valor) }, 0);
            return "Total: R$ " + total.toFixed(2);
        },
        resourceLimitReached: function () {
            return (this.getMyBookedResources.length + this.getMySelectedResourceIds.length) >= this.tableLimit;
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

            if (this.step === this.steps.QUEUE && user.posicao != null) {
                this.queuePosition = parseInt(user.posicao, 10);
            }

            if (user.minha_vez === 1 && this.step === this.steps.QUEUE && user.limite_mesas != null) {
                this.startSelectionStep();
                this.tableLimit = parseInt(user.limite_mesas, 10);
                this.remainingSeconds = user.segundos_restantes_selecao;
                this.$nextTick(() => {
                    this.$refs.timer.startTimer();
                });
                this.$toasted.success("Chegou sua vez na fila! Por favor selecione suas mesas.", {
                    position: 'top-center',
                });
                return;
            }
            if (user.minha_vez === 1 && this.step === this.steps.SELECTION) {
                this.remainingSeconds = user.segundos_restantes_selecao;

                if (!this.shownAlert && parseInt(this.remainingSeconds, 10) <= 60) {
                    this.$toasted.error("Atenção! Você tem menos de um minuto para terminar de selecionar suas mesas. Termine a seleção e clique em \"Comprar mesas\" dentro do tempo limite para garantir suas mesas.", {
                        position: 'top-center',
                        duration: 8000,
                    });
                    this.shownAlert = true;
                }

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
                this.$toasted.error("Não foi possível consultar os recursos", { position: 'top-center' });
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
            if (!this.getMySelectedResourceIds.length) {
                this.$toasted.error("É necessário escolher ao menos uma mesa", { position: 'top-center' });
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
                this.$toasted.error("Não foi possível solicitar os recursos", { position: 'top-center' });
                return;
            } finally {
                this.buttonLoading = false;
            }
            this.stopPollingResources();
            this.stopPollingState();
            this.$emit('next', paymentResponse);
        },
        getResourceState: function (item) {
            if (item.id_status_recurso === 4 && item.solicitado_por_mim) {
                return 4; //disabled colored
            }

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
        },
        getItemStyle: function (item) {
            if (item.row_start == null || item.row_end == null || item.column_start == null || item.column_end == null) {
                return null;
            }

            return {
                "grid-row": item.row_start + 1 + " / span " + (item.row_end - item.row_start + 1),
                "grid-column": item.column_start + " / span " + (item.column_end - item.column_start + 1)
            }
        }
    }
}
</script>

<style scoped>
.table-map {
    display: grid;
    grid-template-columns: repeat(21, 40px);
    grid-template-rows: repeat(13, 40px);
    gap: 15px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f8f9fa;
    border-radius: 10px;
    min-height: 500px;
    overflow: scroll;
}

.palco {
    padding: 8px;
    width: 100%; 
    height: 100%; 
    grid-area: 2 / 7 / span 5 / span 7;
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    grid-template-rows: repeat(5, 1fr);
}

.border {
    border: 2px solid #ccc;
    border-radius: 4px;
}

.keep-words {
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: keep-all;
}
</style>