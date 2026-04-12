<template>
    <v-container fluid fill-height class="d-flex justify-center">
        <v-card style="width:100%" max-width="500">
            <v-card-title>
                Compra cancelada
            </v-card-title>
            <v-card-text>
                <p>Você cancelou a seleção / compra das mesas e saiu da fila. Clique no botão abaixo para entrar na fila novamente.</p>
            </v-card-text>
            <v-card-actions>
                <v-spacer/>
                <v-btn color="primary" @click="$emit('restart')">Voltar para comprar mesas</v-btn>
            </v-card-actions>
        </v-card>
    </v-container>
</template>

<script>
    export default {
        name: 'SelectionCancelled',
    }
</script>
