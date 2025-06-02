<template>
    <v-container fill-height fluid class="d-flex align-center" style="justify-content: space-around">
        <FullscreenLoader v-if="!loaded" />
        <div style="width: 100%">
        <v-card style="width: 100%" class="mt-n10">
            <v-card-title>
                {{ cardTitle }}
            </v-card-title>
            <v-card-text>
                <v-form ref='form' lazy-validation>
                    <template v-if="isStudentStep">
                        <p>Para cada aluno identificado, você poderá comprar até 2 mesas</p>
                        <v-row align="center" justify="center">
                            <v-col>
                                <v-text-field label="RM do aluno" required
                                :rules="validationEnabled ? [rules.required] : []" v-model="studentCode"
                                clearable v-mask="'###########'"></v-text-field>
                            </v-col>
                            <v-col cols="5">
                                <v-btn color="primary" outlined @click='checkStudent'>Adicionar</v-btn>
                            </v-col>
                        </v-row>
                        <v-divider></v-divider>
                        <p class="mt-4">{{ informedStudentsText }}</p>
                    </template>
                    <template v-else>
                        <p>Por favor preencha corretamente. Precisamos desses dados para gerar a cobrança via PIX.</p>
                        <v-text-field label="Nome" required :rules="validationEnabled ? [rules.required] : []"
                            v-model="name" clearable></v-text-field>
                        <v-text-field label="CPF" required :rules="validationEnabled ? [rules.required, isValidCPF] : []"
                            v-model="identification" clearable v-mask="'###.###.###-##'"></v-text-field>
                        <v-text-field label="Email" required
                            :rules="validationEnabled ? [rules.required, rules.validEmail] : []" v-model="email"
                            clearable></v-text-field>
                    </template>
                </v-form>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn @click="clearConfirmationDialog = true" color="accent">Limpar</v-btn>
                <v-btn v-if="!isStudentStep" @click="handleAction" color="primary">Salvar</v-btn>
                <v-btn v-else :disabled="isStudentStep && !students.length" @click="handleAction" color="primary">Próximo</v-btn>
            </v-card-actions>
        </v-card>
        </div>
        <v-dialog v-model="dialog">
            <v-card>
                <v-card-title>
                    Aluno encontrado
                </v-card-title>
                <v-card-text>
                    Encontramos o aluno "{{ foundStudentName }}". Confirma a adição?
                </v-card-text>
                <v-card-actions>
                    <v-spacer/>
                    <v-btn outline color="accent" @click="closeStudentDialog">Voltar</v-btn>
                    <v-btn color="primary" @click="confirmStudent">Confirmar</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        <v-dialog v-model="confirmationDialog">
            <v-card>
                <v-card-title>Confirmação</v-card-title>
                <v-card-text>
                    <p>{{ informedStudentsText }} Portanto você poderá escolher até <b style="color:#000084">{{ maxTables }} mesas.</b></p>
                    <p>Aviso: após confirmar, não será possível voltar.</p>
                </v-card-text>
                <v-card-actions>
                    <v-spacer/>
                    <v-btn outline color="accent" @click="confirmationDialog = false">Voltar</v-btn>
                    <v-btn color="primary" @click="enterQueue">Confirmar</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        <v-dialog v-model="clearConfirmationDialog">
            <v-card>
                <v-card-title>Confirmação</v-card-title>
                <v-card-text>
                    <p v-if="isStudentStep">Remover alunos selecionados?</p>
                    <p v-else>Limpar campos preenchidos?</p>
                </v-card-text>
                <v-card-actions>
                    <v-spacer/>
                    <v-btn outline color="accent" @click="clearConfirmationDialog = false">Voltar</v-btn>
                    <v-btn color="primary" @click="clear">Sim</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
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
            isStudentStep: false,
            students: [],
            studentCode: null,
            foundStudentName: null,
            foundStudentId: null,
            foundStudentCode: null,
            dialog: false,
            confirmationDialog: false,
            clearConfirmationDialog: false,
            rules: {
                required: v => !!v && v.trim().length >= 3 || 'Digite ao menos 3 caracteres',
                validEmail: v => !!v && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(v.trim()) || 'E-mail inválido'
            }
        }
    },
    mounted: function () {
        this.load();
    },
    computed: {
        cardTitle: function () {
            if (this.isStudentStep) {
                return 'Informar Aluno(s)'
            }
            return 'Dados para pagamento'
        },
        informedStudentsText: function () {
            if (!this.students.length) {
                return "Identifique ao menos um aluno para continuar.";
            }
            if (this.students.length === 1) {
                return "Você informou o RM do aluno " + this.students.map(student => `"${student.name}"`).join(', ') + ".";
            }
            return "Você informou o RM dos alunos " + this.students.map(student => `"${student.name}"`).join(', ') + ".";
        },
        maxTables: function () {
            return this.students.length * 2;
        },
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
                } else if (response.data?.user) {
                    this.isStudentStep = true;
                    this.loaded = true;
                    return;
                }
            }
            const uuid = uuidv4();
            localStorage.setItem("uuid_usuario", uuid);
            this.uuid = uuid;
            this.loaded = true;
        },
        handleAction: function () {
            if (!this.isStudentStep) {
                this.validationEnabled = true;
                this.$nextTick(async () => {
                    if (!this.$refs.form.validate()) {
                        return;
                    }
                    await this.registerUser();
                })
            } else {
                this.confirmationDialog = true;
            }
        },
        registerUser: async function () {
            this.loaded = false;
            try {
                    const response = await this.$axios.post('/user/create', {
                        uuid_usuario: this.uuid,
                        numero_identificacao: this.identification.trim(),
                        tipo_identificacao: 'CPF',
                        email: this.email.trim(),
                        nome: this.name.trim(),
                    });
                    const token = response.data.token;
                    localStorage.setItem("token", token);

                    this.$toasted.success('Usuário cadastrado');

                    this.isStudentStep = true;
                    if (this.$refs.form) {
                        this.$refs.form.resetValidation();
                    }
                    this.validationEnabled = false;
            } catch (e) {
                if (e.response?.data?.message != null) {
                    this.$toasted.error(e.response.data.message);
                } else {
                    this.$toasted.error('Ocorreu um erro inesperado!');
                }
                return;
            } finally {
                this.loaded = true;
            }
        },
        enterQueue: async function () {
            this.loaded = false;
            try {
                await this.$axios.post('/user/enter-queue', {
                    codigos_alunos: this.students.map(student => student.studentCode),
                });
            } catch (e) {
                if (e.response?.data?.message != null) {
                    this.$toasted.error(e.response.data.message);
                } else {
                    this.$toasted.error('Ocorreu um erro inesperado!');
                }
                return;
            } finally {
                this.loaded = true;
            }
            this.$emit('next');
        },
        back: function () {
            this.isStudentStep = false;
        },
        clear: function () {
            if (this.isStudentStep) {
                this.students = [];
                this.studentCode = null;
                this.clearConfirmationDialog = false;
            } else {
                this.identification = null;
                this.email = null;
                this.name = null;
                this.$refs.form.resetValidation();
                this.validationEnabled = false;
                this.clearConfirmationDialog = false;
            }
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
        },
        checkStudent: async function () {
            this.validationEnabled = true;
            this.$nextTick(async () => {
                if (!this.$refs.form.validate()) {
                    return;
                }
                if (this.students.find(student => student.studentCode === this.studentCode.trim())) {
                    this.$toasted.error("Você já adicionou esse aluno");
                    return;
                }

                let response;
                try {
                    response = await this.$axios.post('/student/get', { codigo_aluno: this.studentCode.trim() })
                } catch (errorResponse) {
                    if (errorResponse.status === 404) {
                        return this.$toasted.error("Aluno não encontrado, por favor revise o código digitado.");
                    } else if (errorResponse.status === 400) {
                        return this.$toasted.error("O aluno informado já está vinculado a outro usuário.");
                    }
                    console.error(errorResponse);
                    return this.$toasted.error("Erro inesperado ao consultar aluno");
                }
                this.foundStudentName = response.data.aluno.nome;
                this.foundStudentId = response.data.aluno.id_aluno;
                this.foundStudentCode = response.data.aluno.codigo;
                this.dialog = true;
            })
        },
        closeStudentDialog: function () {
            this.dialog = false;
            this.$nextTick(() => {
                this.foundStudentName = null;
                this.foundStudentCode = null;
            })
        },
        confirmStudent: function () {
            this.students.push({ name: this.foundStudentName, studentId: this.foundStudentId, studentCode: this.foundStudentCode });
            this.$nextTick(() => {
                this.foundStudentId = null;
                this.studentCode = null;
                this.validationEnabled = false;
                this.closeStudentDialog();
                this.$toasted.success("Aluno adicionado!");
            })
        },
    }
}
</script>