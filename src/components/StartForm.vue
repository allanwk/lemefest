<template>
    <div>
        <FullscreenLoader v-if="!loaded" />
        <v-form ref='form'>
            <v-text-field label="Nome" required :rules="[rules.required]" v-model="name"></v-text-field> 
           <v-text-field label="CPF" required :rules="[rules.required]" v-model="identification"></v-text-field> 
           <v-text-field label="Email" required :rules="[rules.required]" v-model="email"></v-text-field> 
        </v-form>
        <v-btn @click="saveUser">Enviar</v-btn>
    </div>
</template>


<script>
import { v4 as uuidv4 } from 'uuid';
import FullscreenLoader from './FullscreenLoader';

export default {
    name: 'StartForm',
    components: {
        FullscreenLoader
    },
    data: function () {
        return {
            name: null,
            identification: null,
            email: null,
            uuid: null,
            loaded: false,
            rules: {
                required: v => !!v || 'Obrigatório'
            }
        }
    },
    mounted: function () {
        this.load();
    },
    methods: {
        load: async function () {
            this.uuid = localStorage.getItem("uuid_usuario");
            if (this.uuid) {
                let response;
                try {
                    response = await this.$axios.post('/user/get', { uuid_usuario: this.uuid });
                } catch (e) {
                    console.error(e);
                    this.$toasted.error("Não foi possível consultar o servidor");
                    return;
                }
                if (response.data?.user?.id_etapa) {
                    this.$emit('gotoStep', response.data?.user?.id_etapa);
                    return;
                }
            } 
            const uuid = uuidv4();
            localStorage.setItem("uuid_usuario", uuid);
            this.uuid = uuid;
            this.loaded = true;
        },
        saveUser: async function () {
            if (!this.$refs.form.validate()) {
                return;
            }

            this.loaded = false;
            try {
                await this.$axios.post('/user/create', {
                    uuid_usuario: this.uuid,
                    numero_identificacao: this.identification,
                    tipo_identificacao: 'CPF',
                    email: this.email,
                    nome: this.name
                });

                this.$toasted.success('Dados salvos com sucesso!');
            } catch (e) {
                this.$toasted.error('Ocorreu um erro inesperado!');
            } finally {
                this.loaded = true;
            }

            this.$emit('next');
        }
    }
}
</script>