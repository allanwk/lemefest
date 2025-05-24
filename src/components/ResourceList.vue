<template>
    <div>
        <h1>{{getTitle}}</h1>
        <v-progress-linear v-if='phase === phases.waiting' indeterminate rounded/>
        <template v-if='phase === phases.picking'>
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
                    <v-checkbox
                        v-model="selected"
                        :label="item.label"
                        :value="item.id_recurso"
                        :disabled="item.id_status_recurso !== 1 && !item.solicitado_por_mim"
                        hide-details
                    />
                    </td>
                </tr>
                </tbody>
            </v-simple-table>
            <v-btn @click="requestResources" :disabled="!getMySelectedResourceIds.length">Solicitar mesas</v-btn>
        </template>
    </div>
</template>

<script>
    export default {
        name: 'ResourceList',
        data: function () {
            return {
                interval: null,
                phase: null,
                phases: {
                    waiting: "waiting",
                    picking: "picking",
                    payment: "payment",
                    finalized: "finalized"
                },
                uuid: null,
                resources: [],
                unavailableResources: [],
                selected: [],
            };
        },
        mounted: function () {
            this.phase = this.phases.waiting;
            this.uuid = localStorage.getItem("uuid_usuario");
            this.startPolling();
        },
        computed: {
            getTitle: function () {
                if (this.phase === this.phases.waiting) {
                    return "Aguarde, você está na fila";
                }
                if (this.phase === this.phases.picking) {
                    return "Hora de escolher suas mesas";
                }
                if (this.phase === this.phases.payment) {
                    return "Pagamento";
                }
                if (this.phase === this.phases.finalized) {
                    return "Resumo da reserva";
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
            }
        },
        methods: {
            startPolling: function () {
                if (!this.interval) {
                    this.getState();
                    this.interval = window.setInterval(this.getState, 5000);
                }
            },
            getState: async function () {
                const response = await this.$axios.get('/state');
                const user = response.data.usuario;
                if (user.minha_vez === 1 && this.phase === this.phases.waiting) {
                    this.startPickingPhase();
                } else if (user.data_hora_fim_selecao && this.phase !== this.phases.finalized) {
                    this.gotoFinalized();
                }
            },
            getResources: async function () {
                const response = await this.$axios.get('/resource');
                this.resources = response.data.recursos;
                this.selected = this.resources.filter(resource => resource.id_status_recurso !== 1).map(resource => resource.id_recurso);
            },
            startPickingPhase: function () {
                this.phase = this.phases.picking;
                this.getResources();
            },
            requestResources: async function () {
                if (!this.getMySelectedResourceIds) {
                    this.$toasted.error("É necessário escolher ao menos uma mesa");
                    return;
                }
                await this.$axios.post('/resource/request', {
                    resource_ids: this.getMySelectedResourceIds
                });
                this.startPaymentPhase();
            },
            startPaymentPhase: function () {
                if (this.phase === this.phases.payment) {
                    return;
                }
                this.phase = this.phases.payment;
            },
            gotoFinalized: function () {
                this.phase = this.phases.finalized;
            }
        }
    }
</script>