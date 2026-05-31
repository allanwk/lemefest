<template>
    <v-container fluid fill-height class="d-flex justify-center">
        <FullscreenLoader v-if="loading" />
        <v-card v-else style="width:100%" max-width="500">
            <v-card-title>
                Compra cancelada
            </v-card-title>
            <v-card-text>
                <p>Você cancelou a seleção / compra das mesas e saiu da fila. Clique no botão abaixo para entrar na fila novamente.</p>
                <template v-if="bookedResources.length">
                    <p>Não se preocupe, as mesas que você já tinha comprado antes continuam reservadas para você.</p>
                    <p>{{ getBookedResourcesText }}</p>
                </template>
            </v-card-text>
            <v-card-actions>
                <v-spacer/>
                <v-btn color="primary" @click="$emit('restart')">Voltar para comprar mesas</v-btn>
            </v-card-actions>
        </v-card>
    </v-container>
</template>

<script>
    import FullscreenLoader from './FullscreenLoader';

    export default {
        name: 'SelectionCancelled',
        components: {
            FullscreenLoader
        },
        data: function () {
            return {
                bookedResources: [],
                loading: true,
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
        methods: {
            loadBookedResources: async function () {
                try {
                    const response = await this.$axios.post('/resource/booked');
                    this.bookedResources = response.data.recursos || [];
                } finally {
                    this.loading = false;
                }
            },
        }
    }
</script>
