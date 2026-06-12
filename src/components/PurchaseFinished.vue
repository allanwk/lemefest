<template>
    <v-container fluid fill-height class="d-flex justify-center">
        <FullscreenLoader v-if="!bookedResources.length" />
        <v-card style="width:100%" max-width="500">
            <v-card-title>
                Compra finalizada
            </v-card-title>
            <v-card-text>
                <p>{{ getBookedResourcesText }}</p>
            </v-card-text>
            <v-card-actions style="flex-wrap: wrap; gap: 5px">
                <v-btn color="primary" outlined @click="changeTables" style="width: 100%; margin: 0 !important">Trocar mesas</v-btn>
                <v-btn color="primary" @click="buyMore" style="width: 100%; margin: 0 !important">Comprar mais mesas</v-btn>
            </v-card-actions>
        </v-card>
        <v-dialog v-model="changeTablesDialog" max-width="400">
            <v-card>
                <v-card-title>Atenção!</v-card-title>
                <v-card-text>Não há reembolso automático - só é possível trocar mesas compradas por outras livres. Para realizar a troca, será necessário entrar na fila novamente. Deseja continuar?</v-card-text>
                <v-card-actions style="flex-wrap: wrap; gap: 5px">
                    <v-btn @click="changeTablesDialog = false" style="width: 100%; margin: 0 !important">Cancelar</v-btn>
                    <v-btn color="primary" @click="confirmChangeTables" style="width: 100%; margin: 0 !important">Sim, voltar para a fila</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-container>
</template>

<script>
    import FullscreenLoader from './FullscreenLoader';

    export default {
        name: 'PurchaseFinished',
        components: {
            FullscreenLoader
        },
        data: function () {
            return {
                changeTablesDialog: false,
                bookedResources: [],
                loadAttempts: 0,
                loadTimeout: null,
                headers: [{
                    text: 'Nome',
                    value: 'nome_recurso'
                }],
            }
        },
        computed: {
            getBookedResourcesText: function () {
                if (this.bookedResources.length > 1) {
                    return "Mesas reservadas para você: " + this.bookedResources.map(resource => resource.nome_recurso_short).join(", ");
                }
                return "Mesa reservada para você: " + this.bookedResources.map(resource => resource.nome_recurso_short).join(", ");
            }
        },
        mounted: function () {
            this.loadBookedResources();
        },
        beforeDestroy: function () {
            if (this.loadTimeout) {
                window.clearTimeout(this.loadTimeout);
            }
        },
        methods: {
            loadBookedResources: async function () {
                try {
                    const response = await this.$axios.post('/resource/booked');
                    if (response.data.recursos && response.data.recursos.length) {
                        this.loadAttempts = 0;
                        this.bookedResources = response.data.recursos;
                        return;
                    }
                } catch (e) {
                    console.error(e);
                }

                const delay = Math.min(1000 * Math.pow(2, this.loadAttempts), 30000);
                this.loadAttempts += 1;
                this.loadTimeout = window.setTimeout(this.loadBookedResources, delay);
            },
            buyMore: function () {
                this.$emit('restart');
            },
            changeTables: function () {
                this.changeTablesDialog = true;
            },
            confirmChangeTables: function () {
                this.$emit('restart');
            }
        }
    }
</script>