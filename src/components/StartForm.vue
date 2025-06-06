<template>
    <v-container fill-height fluid class="d-flex align-center" style="justify-content: space-around">
        <FullscreenLoader v-if="!loaded" />
        <div style="width: 100%">
        <v-card style="width: 100%" class="mt-n10">
            <v-card-title>
                {{ cardTitle }}
            </v-card-title>
            <v-card-text>
                <v-form ref='form' lazy-validation @submit.prevent="handleSubmit">
                    <template v-if="isStudentStep">
                        <p>Para cada aluno identificado, você poderá comprar até 2 mesas</p>
                        <v-row align="center" justify="center">
                            <v-col>
                                <v-text-field label="RM do aluno" required
                                :rules="validationEnabled ? [rules.required] : []" v-model="studentCode"
                                clearable v-mask="'###########'" inputmode="numeric" pattern="[0-9]*"></v-text-field>
                            </v-col>
                            <v-col cols="5">
                                <v-btn color="primary" outlined @click='checkStudent' :loading="loadingAddStudent">Adicionar</v-btn>
                            </v-col>
                        </v-row>
                        <v-divider></v-divider>
                        <p class="mt-4">{{ informedStudentsText }}</p>
                    </template>
                    <template v-else>
                        <p>Por favor preencha corretamente. Precisamos desses dados para processar o pagamento via PIX.</p>
                        <v-text-field label="Nome Completo" required :rules="validationEnabled ? [rules.required] : []"
                            v-model="name" clearable></v-text-field>
                        <v-text-field label="CPF" required :rules="validationEnabled ? [rules.required, isValidCPF] : []"
                            v-model="identification" clearable v-mask="'###.###.###-##'" inputmode="numeric" pattern="[0-9]*"></v-text-field>
                        <v-text-field label="Email" type="email" required
                            :rules="validationEnabled ? [rules.required, rules.validEmail] : []" v-model="email"
                            clearable autocapitalize="off" style="text-transform: none" @keypress.enter.prevent="handleSubmit"></v-text-field>
                    </template>
                </v-form>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn @click="startClearAction" color="accent">Limpar</v-btn>
                <v-btn v-if="!isStudentStep" @click="handleAction" color="primary">Salvar</v-btn>
                <v-btn v-else :disabled="isStudentStep && !students.length" @click="handleAction" :loading="handleNextLoading" color="primary">Próximo</v-btn>
            </v-card-actions>
        </v-card>
        </div>
        <v-dialog v-model="dataConfirmationDialog">
            <v-card>
                <v-card-title>Os dados estão corretos?</v-card-title>
                <v-card-text>
                    <p>Nome: {{ name }}</p>
                    <p>CPF: {{ identification }}</p>
                    <p>E-mail: {{ email }}</p>
                    <b>Verifique com cuidado, você não poderá alterá-los depois!</b>
                </v-card-text>
                <v-card-actions>
                    <v-spacer/>
                    <v-btn outline color="accent" @click="dataConfirmationDialog = false">Voltar</v-btn>
                    <v-btn color="primary" @click="confirmBasicData">Confirmar</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
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
                    <p>{{ informedStudentsText }} Portanto você poderá escolher até <b style="color:#000084">{{ maxTables }} mesas</b> (considerando também mesas que já tenha comprado em passos anteriores).</p>
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
        <v-dialog v-model="errorDialog">
            <v-card>
                <v-card-title class="keep-words">{{ errorDialogMessage }}</v-card-title>
                <v-card-actions>
                    <v-spacer/>
                    <v-btn outline color="primary" @click="errorDialog = false">OK</v-btn>
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
    props: {
        fromRestart: {
            type: Boolean,
            default: false,
        }
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
            dataConfirmationDialog: false,
            loadingAddStudent: false,
            handleNextLoading: false,
            errorDialog: false,
            errorDialogMessage: null,
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
            if (this.fromRestart) {
                try {
                    await this.loadLinkedStudents();
                    this.isStudentStep = true;
                    this.loaded = true;
                } catch (e) {
                    console.error(e);
                    this.$toasted.error("Erro ao consultar os alunos.");
                }
                return;
            }

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
        handleSubmit: function () {
            console.log("handleSubmit")
            if (this.isStudentStep) {
                this.validationEnabled = true;
                this.$nextTick(async () => {
                    if (!this.$refs.form.validate()) {
                        return;
                    }
                    this.checkStudent();
                });
            } else {
                this.handleAction();
            }
        },
        handleAction: function () {
            if (!this.isStudentStep) {
                this.validationEnabled = true;
                this.$nextTick(async () => {
                    if (!this.$refs.form.validate()) {
                        return;
                    }
                    this.dataConfirmationDialog = true;
                })
            } else {
                this.checkIfCanBuyMoreResources();
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
                    this.showError("Você já adicionou esse aluno.");
                    return;
                }
                this.loadingAddStudent = true;
                let response;
                try {
                    response = await this.$axios.post('/student/get', { codigo_aluno: this.studentCode.trim() })
                } catch (errorResponse) {
                    if (errorResponse.status === 404) {
                        return this.showError("Aluno não encontrado, por favor revise o código digitado.");
                    } else if (errorResponse.status === 400) {
                        return this.showError("O aluno informado já está vinculado a outro usuário.");
                    }
                    return this.showError("Erro inesperado ao consultar aluno.");
                } finally {
                    this.loadingAddStudent = false;
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
        loadLinkedStudents: async function () {
            const response = await this.$axios.post('/student/linked');
            if (response.data?.alunos) {
                this.students = response.data.alunos.map(student => ({name: student.nome, studentId: student.id_aluno, studentCode: student.codigo}));
            }
        },
        startClearAction: function () {
            if (this.fromRestart) {
                return this.$toasted.error("Como você já comprou alguma mesa, não é possível remover os alunos identificados. Caso tenha adicionado um aluno incorretamente, por favor recarregue a página.")
            }
            this.clearConfirmationDialog = true;
        },
        checkIfCanBuyMoreResources: async function () {
            this.handleNextLoading = true;
            try {
                const response = await this.$axios.post('/resource/booked');
                const bookedResources = response.data?.recursos;

                const maxResources = this.students.length * 2;
                if (bookedResources != null && bookedResources.length >= maxResources) {
                    return this.$toasted.error("Você já comprou a quantidade máxima de mesas para o número de alunos identificados. Para comprar mais mesas, é necessário informar o código de mais alunos.");
                }

                this.confirmationDialog = true;
            } catch (e) {
                this.$toasted.error("Erro inesperado!");
            } finally {
                this.handleNextLoading = false;
            }
        },
        confirmBasicData: async function () {
            this.dataConfirmationDialog = false;
            await this.registerUser();
        },
        showError: function (errorMessage) {
            this.errorDialogMessage = errorMessage;
            this.$nextTick(() => {
                this.errorDialog = true;
            })
        }
    }
}
</script>

<style>
    .keep-words {
        word-wrap: break-word;
        overflow-wrap: break-word;
        word-break: keep-all;
    }
</style>