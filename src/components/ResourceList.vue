<template>
    <v-container fluid fill-height>
        <FullscreenLoader v-if="!loaded"/>
        <template v-else>
            <v-card style="width:100%">
                <v-card-title class="py-1 queue-status-sticky" :style="stickyTopStyle">
                    <v-row justify="center" align="center">
                        <v-col v-if="step === steps.SELECTION && remainingSeconds != null">
                            <countdown-timer :initial-time="remainingSeconds" ref="timer" message="Tempo para escolher: " @timerEnd="atTimerEnd"/>
                        </v-col>
                        <v-col v-else style="min-width: 170px; display: flex; align-content: center; justify-content: center;">
                            <span class="mr-2 keep-words">{{ getTitle }}</span>
                            <v-progress-circular v-if='step === steps.QUEUE' indeterminate color="primary" />
                        </v-col>
                    </v-row>
                </v-card-title>
                <v-card-text>
                    <TableMap v-model="selected" :resources="resources"
                        :resource-state="getResourceState" :readonly="step === steps.QUEUE"/>
                </v-card-text>
            </v-card>
            <v-dialog v-model="informationDialog" max-width="400">
                <v-card>
                    <v-card-title>
                        Ajuda
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
            <v-dialog v-model="cancelDialog" max-width="400">
                <v-card>
                    <v-card-title>Atenção</v-card-title>
                    <v-card-text>{{ cancelDescription }} Caso decida comprar novas mesas, será necessário entrar na fila novamente.</v-card-text>
                    <v-card-actions style="flex-wrap: wrap; gap: 5px">
                        <v-btn @click="cancelDialog = false" style="width: 100%; margin: 0 !important"> {{ cancelNegativevButtonDescriptionDescription }}</v-btn>
                        <v-btn color="error" @click="cancelSelection" :loading="cancelLoading" style="width: 100%; margin: 0 !important">Sair da fila</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
            <v-footer color="primary" app class="app-footer">
                <template v-if="step === steps.SELECTION">
                    <div class="footer-top-row">
                        <span v-if="totalPriceLabel" style="color:background">{{ totalPriceLabel }}</span>
                        <v-btn color='error' class="footer-top-btn" @click="cancelDialog = true">{{ cancelLabel }}</v-btn>
                        <v-btn color='background' class="footer-top-btn" @click="informationDialog = true">Ajuda</v-btn>
                    </div>
                    <v-btn color='background' class="footer-btn footer-btn-wrap" @click="requestPickedResources" :loading="buttonLoading">{{ buyButtonLabel }}</v-btn>
                </template>
                <template v-else>
                    <v-btn color='background' class="footer-btn" @click="informationDialog = true">Ajuda</v-btn>
                    <v-btn color='error' class="footer-btn" @click="cancelDialog = true"> {{ cancelLabel }}</v-btn>
                </template>
            </v-footer>
        </template>
    </v-container>
</template>

<script>
import TableMap from './TableMap';
import CountdownTimer from './CountdownTimer';
import FullscreenLoader from './FullscreenLoader';

export default {
    name: 'ResourceList',
    components: {
        TableMap,
        CountdownTimer,
        FullscreenLoader
    },
    data: function () {
        return {
            loaded: false,
            interval: null,
            step: 1,
            steps: {
                REGISTER: 0,
                QUEUE: 1,
                SELECTION: 2,
                PAYMENT: 3,
                PAID: 4,
                SELECTION_EXPIRED: 5,
                CANCELLED: 7,
            },
            resources: [],
            unavailableResources: [],
            selected: [],
            qr_code: null,
            qr_code_base64: null,
            buttonLoading: false,
            tableLimit: 0,
            limitePista: 0,
            remainingSeconds: null,
            informationDialog: true,
            shownAlert: false,
            cancelDialog: false,
            cancelLoading: false,
            queuePosition: null,
            pollingInterval: 60000,
            pollingIntervals: {
                EVERY_MINUTE: 60000,
                EVERY_10_SECONDS: 10000,
                EVERY_5_SECONDS: 5000,
            },
            timeout: null,
        };
    },
    mounted: function () {
        this.startPolling();
    },
    beforeDestroy: function () {
        this.stopPollingState();
        if (this.timeout) {
            window.clearTimeout(this.timeout);
        }
    },
    computed: {
        stickyTopStyle: function () {
            return { top: this.$vuetify.application.top + 'px' };
        },
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
        getMySelectedResourceIds() {
            return this.selected.filter(id => {
                const resource = this.resources.find(resource => resource.id_recurso === id);
                return resource.id_status_recurso === 1 || resource.solicitado_por_mim === 1
            })
        },
        getMyBookedResources() {
            return this.resources.filter(resource => {
                return resource.id_status_recurso === 4 && resource.solicitado_por_mim === 1
            })
        },
        getMySelectedResourceIdsPista() {
            return this.getMySelectedResourceIds.filter(id => {
                const resource = this.resources.find(resource => resource.id_recurso === id);
                return resource.pista
            })
        },
        buyButtonLabel: function () {
            const bookedIds = this.getMyBookedResources.map(r => r.id_recurso);
            const selectedIds = this.getMySelectedResourceIds;
            const newIds = selectedIds.filter(id => !bookedIds.includes(id));
            const keptCount = selectedIds.filter(id => bookedIds.includes(id)).length;
            const removedCount = bookedIds.length - keptCount;
            const newCount = newIds.length;

            const pluralize = (n) => n === 1 ? "mesa" : "mesas";

            if (bookedIds.length === 0) {
                if (selectedIds.length >= 1) return `Comprar ${selectedIds.length} ${pluralize(selectedIds.length)}`;
                return "Comprar mesas";
            }

            const swapCount = Math.min(newCount, removedCount);
            const extraBuyCount = newCount - swapCount;

            if (swapCount > 0 && extraBuyCount > 0) {
                return `Trocar ${swapCount} ${pluralize(swapCount)} e comprar ${extraBuyCount} ${pluralize(extraBuyCount)}`;
            }
            if (swapCount > 0) {
                return `Trocar ${swapCount} ${pluralize(swapCount)}`;
            }
            if (extraBuyCount > 0) {
                return `Comprar ${extraBuyCount} ${pluralize(extraBuyCount)}`;
            }
            return "Comprar mesas";
        },
        totalPriceLabel: function () {
            const bookedIds = this.getMyBookedResources.map(r => r.id_recurso);
            const selectedIds = this.getMySelectedResourceIds;
            const newIds = selectedIds.filter(id => !bookedIds.includes(id));
            const keptCount = selectedIds.filter(id => bookedIds.includes(id)).length;
            const removedCount = bookedIds.length - keptCount;
            const swapCount = Math.min(newIds.length, removedCount);
            const extraBuyCount = newIds.length - swapCount;

            const newValuesDesc = newIds
                .map(id => Number(this.resources.find(res => res.id_recurso === id).valor))
                .sort((a, b) => b - a);
            const total = newValuesDesc.slice(0, extraBuyCount).reduce((acc, v) => acc + v, 0);
            return "Total: R$ " + total.toFixed(2);
        },
        resourceLimitReached: function () {
            return this.getMySelectedResourceIds.length >= this.tableLimit;
        },
        pistaLimitReached: function () {
            return this.getMySelectedResourceIdsPista.length >= this.limitePista;
        },
        cancelLabel: function () {
            if (this.step === this.steps.QUEUE) {
                return "Sair da fila";
            }
            return "Cancelar";
        },
        cancelDescription: function () {
            if (this.step === this.steps.QUEUE) {
                return "Tem certeza que deseja sair da fila?";
            }
            return "Tem certeza que deseja cancelar a seleção de mesas?";
        },
        cancelNegativevButtonDescriptionDescription: function () {
            if (this.step === this.steps.QUEUE) {
                return "Continuar na fila";
            }
            return "Continuar escolhendo mesas";
        },
    },
    methods: {
        startPolling: function () {
            if (!this.interval) {
                this.getState();
                this.interval = window.setInterval(this.getState, this.pollingInterval);
            }
        },
        stopPollingState: function () {
            if (this.interval) {
                window.clearInterval(this.interval);
                this.interval = null;
            }
        },
        changePollingRate: function (pollingInterval) {
            this.pollingInterval = pollingInterval;
            if (this.interval) {
                window.clearInterval(this.interval);
            }
            this.interval = window.setInterval(this.getState, pollingInterval);
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

            if ((this.step === this.steps.QUEUE || !this.resources.length) && response.data.recursos) {
                this.resources = response.data.recursos;
                this.selected = this.resources.filter(resource => resource.id_status_recurso !== 1).map(resource => resource.id_recurso);
                this.loaded = true;
            }

            const user = response.data.usuario;
            if (parseInt(user.id_etapa, 10) === 7) {
                this.stopPollingState();
                this.$emit('cancelled');
                return;
            }
            if (parseInt(user.id_etapa, 10) === 3) {
                this.stopPollingState();
                this.$emit('next');
                return;
            }
            if (parseInt(user.segundos_restantes_selecao, 10) < 0) {
                this.stopPollingState();
                this.$emit('timeExpired');
                return;
            }

            if (this.step === this.steps.QUEUE && user.posicao != null) {
                this.queuePosition = parseInt(user.posicao, 10);
                if (this.queuePosition === 1) {
                    this.changePollingRate(this.pollingIntervals.EVERY_5_SECONDS);
                } else if (this.queuePosition <= 2) {
                    this.changePollingRate(this.pollingIntervals.EVERY_10_SECONDS);
                }
            }

            if (user.minha_vez === 1 && this.step === this.steps.QUEUE && user.limite_mesas != null) {
                this.startSelectionStep();
                this.tableLimit = parseInt(user.limite_mesas, 10);
                this.limitePista = parseInt(user.limite_mesas_pista, 10);
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
        startSelectionStep: function () {
            this.step = this.steps.SELECTION;
            this.changePollingRate(this.pollingIntervals.EVERY_5_SECONDS);
        },
        requestPickedResources: async function () {
            if (!this.getMySelectedResourceIds.length) {
                this.$toasted.error("É necessário escolher ao menos uma mesa", { position: 'top-center' });
                return;
            }
            if (this.getMySelectedResourceIds.length < this.getMyBookedResources.length) {
                this.$toasted.error("Não é possível selecionar menos mesas do que você já comprou", { position: 'top-center' });
                return;
            }
            this.buttonLoading = true;
            let paymentResponse;
            try {
                paymentResponse = await this.$axios.post('/resource/request', {
                    resource_ids: this.getMySelectedResourceIds
                }, { timeout: 30000 });
            } catch (e) {
                console.error(e);
                this.$toasted.error("Não foi possível solicitar os recursos. Por favor tente novamente em instantes.", { position: 'top-center' });
                return;
            } finally {
                this.buttonLoading = false;
            }
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

            if (((item.pista && this.pistaLimitReached) || this.resourceLimitReached) && this.selected.findIndex(it => it === item.id_recurso) === -1) {
                return 2; //disabled light
            }
            
            if (item.solicitado_por_mim) {
                return 4; //diffent color, allows selection
            }

            return 0;
        },
        atTimerEnd: function () {
            this.stopPollingState();
            this.timeout = window.setTimeout(this.startPolling, 1000);
        },
        cancelSelection: async function () {
            this.cancelLoading = true;
            try {
                await this.$axios.post('/user/cancel');
                this.stopPollingState();
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

.queue-status-sticky {
    position: sticky;
    z-index: 4;
    background-color: #fff;
}

.app-footer {
    justify-content: flex-end;
    gap: 5px;
    flex-wrap: wrap;
}

.footer-top-row {
    display: flex;
    align-items: center;
    gap: 5px;
}

.footer-btn-wrap >>> .v-btn__content {
    white-space: normal;
    flex: 1;
}

@media (max-width: 600px) {
    .footer-btn {
        flex: 1 1 100%;
    }
    .footer-top-row {
        width: 100%;
    }
    .footer-top-btn {
        flex: 1;
    }
}
</style>