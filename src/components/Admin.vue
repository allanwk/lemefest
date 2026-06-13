<template>
    <v-container fluid class="admin-container">
        <div v-if="state === 'loading'" class="admin-center">
            <v-progress-circular indeterminate color="primary" size="48"/>
        </div>

        <template v-else>
            <div class="admin-toolbar">
                <v-chip large color="primary" class="totalizer">
                    Mesas vendidas: <strong class="ml-1">{{ totalVendidas }}</strong>
                    <span class="ml-1">de {{ totalMesas }}</span>
                </v-chip>
                <v-spacer/>
                <span v-if="lastUpdate" class="last-update mr-3">Atualizado às {{ lastUpdate }}</span>
                <v-btn color="primary" :loading="refreshing" @click="refresh">
                    <v-icon left>mdi-refresh</v-icon> Atualizar agora
                </v-btn>
            </div>

            <v-alert v-if="errorMessage" type="warning" dense text class="mt-2">{{ errorMessage }}</v-alert>

            <v-card class="mt-3">
                <v-card-title class="py-2">Mapa das mesas</v-card-title>
                <v-card-text>
                    <TableMap :resources="recursos" :resource-state="adminResourceState" readonly
                        :item-title="resourceTitle"/>
                    <div class="legend mt-3">
                        <span class="legend-item"><span class="legend-box legend-available"></span> Livre</span>
                        <span class="legend-item"><span class="legend-box legend-process"></span> Em processo</span>
                        <span class="legend-item"><span class="legend-box legend-booked"></span> Reservada</span>
                        <span class="legend-item"><span class="legend-box legend-swap"></span> Troca solicitada</span>
                    </div>
                </v-card-text>
            </v-card>

            <v-card class="mt-4">
                <v-card-title class="py-2">
                    Mesas compradas
                    <v-spacer/>
                    <v-text-field v-model="searchCompradas" append-icon="mdi-magnify" label="Buscar"
                        single-line hide-details dense style="max-width: 260px"/>
                </v-card-title>
                <v-data-table :headers="compradasHeaders" :items="mesasCompradas" :search="searchCompradas"
                    :items-per-page="15" :mobile-breakpoint="700" sort-by="mesa_num">
                    <template v-slot:[`item.alunos`]="{ item }">
                        <template v-if="item.alunos">
                            <v-chip v-for="(aluno, i) in splitAlunos(item.alunos)" :key="i" x-small class="ma-1">
                                {{ aluno }}
                            </v-chip>
                        </template>
                        <span v-else class="grey--text">—</span>
                    </template>
                    <template v-slot:no-data>Nenhuma mesa comprada ainda.</template>
                </v-data-table>
            </v-card>

            <v-card class="mt-4">
                <v-card-title class="py-2">Fila</v-card-title>
                <v-data-table :headers="filaHeaders" :items="fila" :items-per-page="-1"
                    hide-default-footer :item-class="filaRowClass" :mobile-breakpoint="700"
                    sort-by="id_registro_fila">
                    <template v-slot:[`item.escolhendo_agora`]="{ item }">
                        <v-icon v-if="item.escolhendo_agora === 1" color="green">mdi-account-clock</v-icon>
                    </template>
                    <template v-slot:[`item.id_etapa`]="{ item }">
                        <v-chip small :color="stepInfo(item.id_etapa).color" dark>
                            <v-icon left small>{{ stepInfo(item.id_etapa).icon }}</v-icon>
                            {{ stepInfo(item.id_etapa).label }}
                        </v-chip>
                    </template>
                    <template v-slot:[`item.tempo`]="{ item }">
                        {{ limiteLabel(item) }}
                    </template>
                    <template v-slot:no-data>Ninguém na fila no momento.</template>
                </v-data-table>
            </v-card>

            <v-card class="mt-4 mb-6">
                <v-card-title class="py-2">Saíram da fila</v-card-title>
                <v-data-table :headers="expiradosHeaders" :items="expirados" :items-per-page="10"
                    :mobile-breakpoint="700" sort-by="id_registro_fila">
                    <template v-slot:[`item.id_etapa`]="{ item }">
                        <v-chip small :color="stepInfo(item.id_etapa).color" dark>
                            <v-icon left small>{{ stepInfo(item.id_etapa).icon }}</v-icon>
                            {{ stepInfo(item.id_etapa).label }}
                        </v-chip>
                    </template>
                    <template v-slot:[`item.quando_saiu`]="{ item }">
                        {{ formatDateTime(quandoSaiu(item)) }}
                    </template>
                    <template v-slot:no-data>Ninguém saiu da fila ainda.</template>
                </v-data-table>
            </v-card>
        </template>
    </v-container>
</template>

<script>
import TableMap from './TableMap';
import adminApi, { setAdminToken } from '../api/adminAxios';
import { STEP, stepInfo } from '../utils/steps';

const POLL_INTERVAL = 60000;

export default {
    name: 'AdminPanel',
    components: {
        TableMap,
    },
    data() {
        return {
            state: 'loading',
            refreshing: false,
            errorMessage: null,
            lastUpdate: null,
            fila: [],
            expirados: [],
            recursos: [],
            mesasCompradas: [],
            totalVendidas: 0,
            totalMesas: 0,
            searchCompradas: '',
            pollHandle: null,
            filaHeaders: [
                { text: '', value: 'escolhendo_agora', sortable: false, width: 40 },
                { text: 'Posição', value: 'posicao' },
                { text: 'Nome', value: 'nome' },
                { text: 'Etapa', value: 'id_etapa' },
                { text: 'Limite da etapa', value: 'tempo', sortable: false },
                { text: '#', value: 'id_registro_fila' },
            ],
            expiradosHeaders: [
                { text: '#', value: 'id_registro_fila' },
                { text: 'Nome', value: 'nome' },
                { text: 'Etapa', value: 'id_etapa' },
                { text: 'Quando saiu', value: 'quando_saiu', sortable: false },
            ],
            compradasHeaders: [
                { text: 'Mesa', value: 'nome_recurso_short' },
                { text: 'Comprador', value: 'nome_usuario' },
                { text: 'Alunos vinculados', value: 'alunos', sortable: false },
            ],
        };
    },
    async created() {
        const token = new URLSearchParams(window.location.search).get('token');
        if (!token) {
            this.redirectToNormalFlow();
            return;
        }
        setAdminToken(token);
        await this.fetchAll(true);
        if (this.state === 'ready') {
            this.pollHandle = window.setInterval(this.fetchAll, POLL_INTERVAL);
        }
    },
    beforeDestroy() {
        if (this.pollHandle) window.clearInterval(this.pollHandle);
    },
    methods: {
        stepInfo,
        redirectToNormalFlow() {
            window.location.replace(window.location.origin + window.location.pathname);
        },
        async refresh() {
            this.refreshing = true;
            await this.fetchAll();
            this.refreshing = false;
            if (this.pollHandle) {
                window.clearInterval(this.pollHandle);
                this.pollHandle = window.setInterval(this.fetchAll, POLL_INTERVAL);
            }
        },
        async fetchAll(initial = false) {
            let response;
            try {
                response = await adminApi.get('/admin/dashboard');
            } catch (e) {
                const status = e.response && e.response.status;
                if (status === 401 || status === 403) {
                    this.redirectToNormalFlow();
                    return;
                }
                console.error(e);
                if (initial) {
                    this.redirectToNormalFlow();
                } else {
                    this.errorMessage = 'Falha ao atualizar. Mostrando dados anteriores.';
                }
                return;
            }

            const d = response.data;
            this.fila = (d.fila || []).map(item => ({
                ...item,
                posicao: Number(item.posicao),
            }));
            this.expirados = d.expirados || [];
            this.recursos = d.recursos || [];
            this.mesasCompradas = (d.mesas_compradas || []).map(item => ({
                ...item,
                mesa_num: parseInt(item.nome_recurso_short, 10),
            }));
            this.totalVendidas = d.total_vendidas || 0;
            this.totalMesas = d.total_mesas || 0;
            this.errorMessage = null;
            this.lastUpdate = formatTime(new Date());
            this.state = 'ready';
        },
        adminResourceState(item) {
            switch (item.id_status_recurso) {
                case 4: return 7; // booked
                case 2:
                case 3: return 6; // in process
                case 5: return 8; // swap requested
                default: return 5; // available
            }
        },
        resourceTitle(item) {
            return item.nome_solicitante ? `Mesa ${item.nome_recurso_short} — ${item.nome_solicitante}` : `Mesa ${item.nome_recurso_short} — livre`;
        },
        limiteLabel(item) {
            if (item.id_etapa === STEP.SELECTION) return formatTimeOnly(item.data_hora_limite_selecao);
            if (item.id_etapa === STEP.PAYMENT) return formatTimeOnly(item.data_hora_limite_pagamento);
            return '—';
        },
        filaRowClass(item) {
            return item.escolhendo_agora === 1 ? 'fila-atual' : '';
        },
        quandoSaiu(item) {
            return item.data_hora_cancelado || item.data_hora_limite_pagamento || item.data_hora_limite_selecao || item.data_hora_registro;
        },
        formatDateTime(value) {
            if (!value) return '—';
            const d = new Date(value);
            return d.toLocaleString('pt-BR');
        },
        splitAlunos(alunos) {
            return alunos.split(', ');
        },
    },
};

function formatTimeOnly(value) {
    if (!value) return '—';
    return new Date(value).toLocaleTimeString('pt-BR');
}

function formatTime(date) {
    return date.toLocaleTimeString('pt-BR');
}
</script>

<style scoped>
.admin-container {
    max-width: 1200px;
}

.admin-center {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 60vh;
}

.admin-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

.totalizer {
    font-size: 1rem;
}

.last-update {
    color: #757575;
    font-size: 0.85rem;
}

.legend {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
}

.legend-box {
    display: inline-block;
    width: 18px;
    height: 18px;
    border-radius: 4px;
    border: 2px solid #ccc;
}

.legend-available {
    background-color: #fff;
    border-color: #bdbdbd;
}

.legend-process {
    background-color: #ffc107;
    border-color: #f0a000;
}

.legend-booked {
    background-color: #000084;
    border-color: #000084;
}

.legend-swap {
    background-color: #ab47bc;
    border-color: #8e24aa;
}

.admin-container >>> .fila-atual {
    background-color: #e8f5e9;
}
</style>
