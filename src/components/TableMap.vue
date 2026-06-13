<template>
    <div class="table-map">
        <div style="grid-area: 1 / 14 / span 1 / span 7; display: grid; place-items: center;">
            <h1>Cantina e bar</h1>
        </div>
        <div style="grid-area: 3 / 21 / span 9 / span 1; display: grid; place-items: center;">
            <h1 style="writing-mode: vertical-rl">Palco da quadra / caixa</h1>
        </div>
        <div class="border" style="grid-area: 2 / 1 / 11 / 21; margin:-10px"></div>
        <NumberToggle v-for="item in resources" :key="item.id_recurso"
            :value="item.id_recurso" :model-value="value" @change="onChange"
            :number="parseInt(item.nome_recurso_short, 10)"
            :state="resourceState(item)" :readonly="readonly" :style="getItemStyle(item)"
            :title="itemTitle ? itemTitle(item) : null"/>
        <div class="palco palco-border">
            <div style="grid-area: 1 / 1 / span 1 / span 9; display: grid; place-items: center; text-align: center;">
                <span style="color: #d32f2f; font-weight: 500;">Valor da mesa c/ 04 cadeiras: R$ 70,00</span>
            </div>
            <div style="grid-area: 2 / 1 / span 2 / span 9; display: grid; place-items: center; text-align: center;">
                <div>
                    <span>Para garantirmos um maior distanciamento entre as mesas,</span>
                    <span style="color: #d32f2f; font-weight: 700;"> NÃO VENDEREMOS CADEIRAS AVULSAS.</span>
                </div>
            </div>
            <div style="grid-area: 4 / 1 / span 2 / span 9; display: grid; place-items: center;">
                <h1 class="apresentacoes-title">APRESENTAÇÕES</h1>
            </div>
        </div>
        <div style="grid-area: 11 / 1 / 11 / 7">
            <h1 style="text-align: left;">Entrada</h1>
            <v-icon style="transform: scaleX(4) scaleY(1); transform-origin:left; color: #f0c000;">mdi-arrow-right-bold</v-icon>
        </div>
        <div style="grid-area: 11 / 6 / 11 / 9; display: grid; justify-items: center; align-items: end;">
            <v-icon style="transform: translateY(8px) scaleX(4) scaleY(1); color: #f0c000;">mdi-arrow-right-bold</v-icon>
        </div>
        <div style="grid-area: 11 / 10 / 11 / 12; display: grid; place-items: center;">
            <v-icon style="transform: scaleX(2) scaleY(2); color: #f0c000;">mdi-arrow-up-right-bold</v-icon>
        </div>
        <div style="grid-area: 12 / 1 / 12 / 21; display: grid; place-items: center;">
            <h1 style="text-align: left;">Arquibancada</h1>
        </div>
    </div>
</template>

<script>
import NumberToggle from './NumberToggle';

export default {
    name: 'TableMap',
    components: {
        NumberToggle,
    },
    model: {
        prop: 'value',
        event: 'input',
    },
    props: {
        resources: {
            type: Array,
            default: () => [],
        },
        resourceState: {
            type: Function,
            required: true,
        },
        readonly: {
            type: Boolean,
            default: false,
        },
        value: {
            type: Array,
            default: () => [],
        },
        itemTitle: {
            type: Function,
            default: null,
        },
    },
    methods: {
        onChange(newValue) {
            this.$emit('input', newValue);
        },
        getItemStyle(item) {
            if (item.row_start == null || item.row_end == null || item.column_start == null || item.column_end == null) {
                return null;
            }

            return {
                "grid-row": item.row_start + 1 + " / span " + (item.row_end - item.row_start + 1),
                "grid-column": item.column_start + " / span " + (item.column_end - item.column_start + 1)
            };
        },
    },
};
</script>

<style scoped>
.table-map {
    display: grid;
    grid-template-columns: repeat(21, 40px);
    grid-template-rows: repeat(12, 40px);
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
    grid-area: 2 / 6 / span 5 / span 9;
    display: grid;
    grid-template-columns: repeat(9, 1fr);
    grid-template-rows: repeat(5, 1fr);
}

.border {
    border: 2px solid #ccc;
    border-radius: 4px;
}

.palco-border {
    border: 3px solid #f0c000;
    border-radius: 4px;
}

.apresentacoes-title {
    font-size: 2.4rem;
    font-weight: 700;
    letter-spacing: 2px;
    color: #555;
}
</style>
