<template>
    <v-container fill-height fluid class="d-flex align-center justify-center">
        <FullscreenLoader v-if="!loaded" />
        <v-card style="width: 100%" class="mt-n10">
            <v-card-title>
                Bem vindo!
            </v-card-title>
            <v-card-text>
                <v-form ref='form' lazy-validation>
                    <v-text-field label="Nome" required :rules="validationEnabled ? [rules.required] : []"
                        v-model="name" clearable></v-text-field>
                    <v-text-field label="CPF" required :rules="validationEnabled ? [rules.required, isValidCPF] : []"
                        v-model="identification" clearable v-mask="'###.###.###-##'"></v-text-field>
                    <v-text-field label="Email" required
                        :rules="validationEnabled ? [rules.required, rules.validEmail] : []" v-model="email"
                        clearable></v-text-field>
                </v-form>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn @click="clear" color="accent" outlined>Limpar</v-btn>
                <v-btn @click="saveUser" color="primary">Enviar</v-btn>
            </v-card-actions>
        </v-card>
    </v-container>
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
            validationEnabled: false,
            rules: {
                required: v => !!v && v.trim().length >= 3 || 'Digite ao menos 3 caracteres',
                validEmail: v => !!v && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(v) || 'E-mail inválido'
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
        saveUser: function () {
            this.validationEnabled = true;
            this.$nextTick(async () => {
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
            })
        },
        clear: function () {
            this.identification = null;
            this.email = null;
            this.name = null;
            this.$refs.form.resetValidation();
            this.validationEnabled = false;
        },
        isValidCPF: function (value) {
            if (value == null) {
                return 'CPF inválido';
            }
            const cpf = value.replace(/[^\d]+/g, '');

            if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return 'CPF inválido';

            let sum = 0;
            for (let i = 0; i < 9; i++) {
                sum += parseInt(cpf.charAt(i)) * (10 - i);
            }

            let remainder = (sum * 10) % 11;
            if (remainder === 10 || remainder === 11) remainder = 0;
            if (remainder !== parseInt(cpf.charAt(9))) return 'CPF inválido';

            sum = 0;
            for (let i = 0; i < 10; i++) {
                sum += parseInt(cpf.charAt(i)) * (11 - i);
            }

            remainder = (sum * 10) % 11;
            if (remainder === 10 || remainder === 11) remainder = 0;
            if (remainder !== parseInt(cpf.charAt(10))) return 'CPF inválido';

            return true;
        }
    }
}
</script>