<template>
    <v-container fluid fill-height>
        <FullscreenLoader v-if="!bookedResources.length" />
        <v-card style="width:100%">
            <v-card-title>
                Compra finalizada
            </v-card-title>
            <v-card-text>
                <p>{{ getBookedResourcesText }}</p>
            </v-card-text>
        </v-card>
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
                bookedResources: [],
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
        methods: {
            loadBookedResources: async function () {
                const response = await this.$axios.post('/resource/booked');
                if (response.data.recursos && response.data.recursos.length) {
                    this.bookedResources = response.data.recursos;
                } else {
                    window.setTimeout(this.loadBookedResources, 1000);
                }
            }
        }
    }
</script>