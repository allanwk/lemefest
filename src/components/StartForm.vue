<template>
    <v-container fill-height fluid class="d-flex align-center justify-center" style="justify-content: space-around">
        <FullscreenLoader v-if="!loaded" />
        <div style="width: 100%" class="d-flex align-center justify-center">
            <v-card style="width: 100%" class="mt-n10" max-width="500">
                <v-card-title>
                    {{ cardTitle }}
                </v-card-title>
                <v-card-text>
                    <v-form ref='form' lazy-validation @submit.prevent="handleSubmit">
                        <template v-if="isStudentStep">
                            <p v-if="mesasBase > 0">Você poderá comprar até {{ mesasBase }} {{ mesasBase === 1 ? 'mesa' : 'mesas' }}, e mais 2 mesas para cada aluno identificado.</p>
                            <p v-else>Para cada aluno identificado, você poderá comprar até 2 mesas, sendo uma delas uma mesa de pista</p>
                            <v-row align="center" justify="center" no-gutters>
                                <v-col>
                                    <v-text-field label="RM do aluno" required
                                    :rules="validationEnabled ? [rules.required] : []" v-model="studentCode"
                                    clearable v-mask="'###########'" inputmode="numeric" pattern="[0-9]*"
                                    @keypress.enter.prevent="checkStudent"></v-text-field>
                                </v-col>
                                <v-col cols="auto" class="pl-2">
                                    <v-btn color="primary" outlined @click='checkStudent' :loading="loadingAddStudent">Adicionar</v-btn>
                                </v-col>
                            </v-row>

                            <p v-if="!students.length" class="text-center text--secondary mt-2 mb-0">
                                {{ informedStudentsText }}
                            </p>
                            <v-list v-else dense class="py-0">
                                <v-subheader class="px-0">Alunos identificados</v-subheader>
                                <template v-for="(student, index) in students">
                                    <v-list-item :key="student.studentId" class="px-0">
                                        <v-list-item-avatar size="36" color="secondary">
                                            <span class="black--text">{{ initials(student.name) }}</span>
                                        </v-list-item-avatar>
                                        <v-list-item-content>
                                            <v-list-item-title>{{ student.name }}</v-list-item-title>
                                        </v-list-item-content>
                                        <v-list-item-action>
                                            <v-btn icon color="accent" :loading="removingStudentId === student.studentId"
                                                @click="startRemoveStudent(student)" aria-label="Remover aluno">
                                                <v-icon>mdi-delete-outline</v-icon>
                                            </v-btn>
                                        </v-list-item-action>
                                    </v-list-item>
                                    <v-divider v-if="index < students.length - 1" :key="`d-${student.studentId}`"></v-divider>
                                </template>
                            </v-list>

                            <v-alert v-if="secondsUntilRelease > 0" dense text type="info" class="mt-4 mb-0">
                                A fila para compra abre em <b>{{ formattedCountdown }}</b>, mas você já pode deixar os alunos cadastrados.
                            </v-alert>
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
                    <v-btn v-if="isStudentStep && fromRestart" @click="exitConfirmationDialog = true" color="accent" outlined>Sair</v-btn>
                    <v-btn v-if="!isStudentStep" @click="startClearAction" color="accent">Limpar</v-btn>
                    <v-btn v-if="!isStudentStep" @click="handleAction" color="primary">Salvar</v-btn>
                    <v-btn v-else :disabled="enterQueueDisabled" @click="handleAction" :loading="handleNextLoading" color="primary">
                        {{ secondsUntilRelease > 0 ? 'Aguardando abertura' : 'Entrar na fila' }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </div>
        <v-dialog v-model="dataConfirmationDialog" max-width="400">
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
                    <v-btn outlined color="accent" @click="dataConfirmationDialog = false">Voltar</v-btn>
                    <v-btn color="primary" @click="confirmBasicData">Confirmar</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        <v-dialog v-model="dialog" max-width="400">
            <v-card>
                <v-card-title>
                    Aluno encontrado
                </v-card-title>
                <v-card-text>
                    Encontramos o aluno "{{ foundStudentName }}". Confirma a adição?
                </v-card-text>
                <v-card-actions>
                    <v-spacer/>
                    <v-btn outlined color="accent" @click="closeStudentDialog">Voltar</v-btn>
                    <v-btn color="primary" @click="confirmStudent">Confirmar</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        <v-dialog v-model="confirmationDialog" max-width="400">
            <v-card>
                <v-card-title>Confirmação</v-card-title>
                <v-card-text>
                    <p>{{ informedStudentsText }} Portanto você poderá escolher até <b style="color:#000084">{{ maxTables }} mesas</b><span v-if="maxPistaTables > 0">, sendo até <b style="color:#000084">{{ maxPistaTables }} {{ maxPistaTables === 1 ? 'mesa' : 'mesas' }} de pista</b></span> (considerando também mesas que já tenha comprado em passos anteriores).</p>
                    <p>Aviso: após confirmar, não será possível voltar.</p>
                </v-card-text>
                <v-card-actions>
                    <v-spacer/>
                    <v-btn outlined color="accent" @click="confirmationDialog = false">Voltar</v-btn>
                    <v-btn color="primary" @click="enterQueue">Confirmar</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        <v-dialog v-model="exchangeOnlyDialog" max-width="400">
            <v-card>
                <v-card-title class="keep-words">Atenção!</v-card-title>
                <v-card-text>
                    <p>Você já comprou a quantidade máxima de mesas para o número de alunos identificados ({{ maxTables }} mesas).</p>
                    <p>Você ainda pode entrar na fila para <b>trocar</b> mesas já compradas por outras livres. Não há reembolso automático.</p>
                    <p>Deseja continuar?</p>
                </v-card-text>
                <v-card-actions>
                    <v-spacer/>
                    <v-btn outlined color="accent" @click="exchangeOnlyDialog = false">Voltar</v-btn>
                    <v-btn color="primary" @click="confirmExchangeOnly">Sim, entrar na fila</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        <v-dialog v-model="exitConfirmationDialog" max-width="400">
            <v-card>
                <v-card-title>Confirmação</v-card-title>
                <v-card-text>
                    <p>Deseja realmente sair? Caso decida comprar mais mesas depois, basta voltar e entrar na fila novamente.</p>
                </v-card-text>
                <v-card-actions>
                    <v-spacer/>
                    <v-btn outlined color="accent" @click="exitConfirmationDialog = false">Voltar</v-btn>
                    <v-btn color="primary" @click="reloadPage">Sim, sair</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        <v-dialog v-model="clearConfirmationDialog" max-width="400">
            <v-card>
                <v-card-title>Confirmação</v-card-title>
                <v-card-text>
                    <p>Limpar campos preenchidos?</p>
                </v-card-text>
                <v-card-actions>
                    <v-spacer/>
                    <v-btn outlined color="accent" @click="clearConfirmationDialog = false">Voltar</v-btn>
                    <v-btn color="primary" @click="clear">Sim</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        <v-dialog v-model="removeConfirmationDialog" max-width="400">
            <v-card>
                <v-card-title>Remover aluno</v-card-title>
                <v-card-text>
                    <p>Deseja remover o aluno "{{ studentToRemove && studentToRemove.name }}"?</p>
                </v-card-text>
                <v-card-actions>
                    <v-spacer/>
                    <v-btn outlined color="accent" @click="removeConfirmationDialog = false">Voltar</v-btn>
                    <v-btn color="primary" @click="removeStudent">Remover</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        <v-dialog v-model="errorDialog" max-width="400">
            <v-card>
                <v-card-title class="keep-words">{{ errorDialogMessage }}</v-card-title>
                <v-card-actions>
                    <v-spacer/>
                    <v-btn outlined color="primary" @click="errorDialog = false">OK</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-container>
</template>


<script>
import { v4 as uuidv4 } from 'uuid';
import FullscreenLoader from './FullscreenLoader';
import stateStream from '../api/stateStream';

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
            mesasBase: 0,
            studentCode: null,
            foundStudentName: null,
            foundStudentId: null,
            foundStudentCode: null,
            dialog: false,
            confirmationDialog: false,
            clearConfirmationDialog: false,
            removeConfirmationDialog: false,
            exitConfirmationDialog: false,
            dataConfirmationDialog: false,
            exchangeOnlyDialog: false,
            loadingAddStudent: false,
            handleNextLoading: false,
            removingStudentId: null,
            studentToRemove: null,
            secondsUntilRelease: 0,
            releaseInterval: null,
            releaseTargetAt: null,
            errorDialog: false,
            errorDialogMessage: null,
            rules: {
                required: v => !!v && v.trim().length >= 3 || 'Digite ao menos 3 caracteres',
                validEmail: v => !!v && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(v.trim()) || 'E-mail inválido'
            }
        }
    },
    mounted: function () {
        document.addEventListener('visibilitychange', this.onVisibilityChange);
        this.load();
    },
    beforeDestroy: function () {
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
        this.clearReleaseInterval();
    },
    computed: {
        cardTitle: function () {
            if (this.isStudentStep) {
                return 'Informar Aluno(s)'
            }
            return 'Dados para pagamento'
        },
        enterQueueDisabled: function () {
            if (this.secondsUntilRelease > 0) {
                return true;
            }
            return !this.students.length && this.mesasBase === 0;
        },
        formattedCountdown: function () {
            const total = Math.max(0, this.secondsUntilRelease);
            const days = Math.floor(total / 86400);
            const hours = Math.floor((total % 86400) / 3600);
            const minutes = Math.floor((total % 3600) / 60);
            const seconds = total % 60;
            if (days > 0) {
                return `${days}d ${hours}h ${minutes}min`;
            }
            const pad = (n) => n.toString().padStart(2, '0');
            return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        },
        informedStudentsText: function () {
            if (!this.students.length) {
                if (this.mesasBase > 0) {
                    return "Você ainda não informou alunos. Você poderá comprar até " + this.mesasBase + (this.mesasBase === 1 ? " mesa." : " mesas.");
                }
                return "Identifique ao menos um aluno para continuar.";
            }
            if (this.students.length === 1) {
                return "Você informou o RM do aluno " + this.students.map(student => `"${student.name}"`).join(', ') + ".";
            }
            return "Você informou o RM dos alunos " + this.students.map(student => `"${student.name}"`).join(', ') + ".";
        },
        maxTables: function () {
            return this.mesasBase + this.students.length * 2;
        },
        maxPistaTables: function () {
            return this.students.length;
        },
    },
    methods: {
        load: async function () {
            await this.loadMesasBase();
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
            const token = sessionStorage.getItem("token");
            if (this.uuid && token) {
                let response;
                try {
                    response = await this.$axios.post('/user/get', {});
                } catch (e) {
                    if (e.response?.status === 401 || e.response?.status === 403) {
                        sessionStorage.removeItem("token");
                        localStorage.removeItem("bootstrapToken");
                    } else {
                        console.error(e);
                        this.$toasted.error("Não foi possível consultar o servidor");
                        return;
                    }
                }
                if (response?.data?.user?.id_etapa) {
                    this.$emit('gotoStep', response.data?.user?.id_etapa);
                    return;
                } else if (response?.data?.user) {
                    try {
                        await this.loadLinkedStudents();
                    } catch (e) {
                        console.error(e);
                    }
                    this.isStudentStep = true;
                    this.loaded = true;
                    return;
                }
            }
            const uuid = this.uuid || uuidv4();
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
                    sessionStorage.setItem("token", token);
                    localStorage.setItem("bootstrapToken", token);
                    stateStream.connect();

                    if (response.data.uuid_usuario) {
                        localStorage.setItem("uuid_usuario", response.data.uuid_usuario);
                        this.uuid = response.data.uuid_usuario;
                    }

                    if (response.data.login) {
                        this.$toasted.success('Bem-vindo de volta!');
                        this.validationEnabled = false;
                        await this.load();
                        return;
                    }

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
                await this.$axios.post('/user/enter-queue', {});
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
            await stateStream.refreshNow();
            this.$emit('next');
        },
        back: function () {
            this.isStudentStep = false;
        },
        clear: function () {
            this.identification = null;
            this.email = null;
            this.name = null;
            this.$refs.form.resetValidation();
            this.validationEnabled = false;
            this.clearConfirmationDialog = false;
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
        confirmStudent: async function () {
            this.loadingAddStudent = true;
            try {
                const response = await this.$axios.post('/student/link', { codigo_aluno: this.foundStudentCode });
                const aluno = response.data.aluno;
                this.students.push({ name: aluno.nome, studentId: aluno.id_aluno, studentCode: aluno.codigo });
                this.$toasted.success("Aluno adicionado!");
            } catch (e) {
                this.$toasted.error(e.response?.data?.message ?? "Não foi possível adicionar o aluno.");
                this.closeStudentDialog();
                return;
            } finally {
                this.loadingAddStudent = false;
            }
            this.$nextTick(() => {
                this.foundStudentId = null;
                this.studentCode = null;
                this.validationEnabled = false;
                this.closeStudentDialog();
            })
        },
        initials: function (name) {
            if (!name) {
                return '';
            }
            const parts = name.trim().split(/\s+/);
            const first = parts[0]?.charAt(0) ?? '';
            const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
            return (first + last).toUpperCase();
        },
        startRemoveStudent: function (student) {
            this.studentToRemove = student;
            this.removeConfirmationDialog = true;
        },
        removeStudent: async function () {
            const student = this.studentToRemove;
            this.removeConfirmationDialog = false;
            if (!student) {
                return;
            }
            this.removingStudentId = student.studentId;
            try {
                await this.$axios.post('/student/unlink', { id_aluno: student.studentId });
                this.students = this.students.filter(s => s.studentId !== student.studentId);
                this.$toasted.success("Aluno removido.");
            } catch (e) {
                this.$toasted.error(e.response?.data?.message ?? "Não foi possível remover o aluno.");
            } finally {
                this.removingStudentId = null;
                this.studentToRemove = null;
            }
        },
        loadMesasBase: async function () {
            try {
                const response = await this.$axios.post('/state/getStarted');
                this.mesasBase = parseInt(response.data?.quantidade_mesas_base ?? 0, 10);
                const seconds = response.data?.segundos_ate_liberacao;
                this.startReleaseCountdown(seconds == null ? 0 : parseInt(seconds, 10));
            } catch (e) {
                this.mesasBase = 0;
                this.startReleaseCountdown(0);
            }
        },
        startReleaseCountdown: function (seconds) {
            this.clearReleaseInterval();
            const safeSeconds = Math.max(0, seconds);
            this.secondsUntilRelease = safeSeconds;
            if (safeSeconds <= 0) {
                this.releaseTargetAt = null;
                return;
            }
            this.releaseTargetAt = Date.now() + safeSeconds * 1000;
            this.releaseInterval = setInterval(this.tickReleaseCountdown, 1000);
        },
        tickReleaseCountdown: function () {
            if (this.releaseTargetAt == null) {
                this.clearReleaseInterval();
                return;
            }
            this.secondsUntilRelease = Math.max(0, Math.ceil((this.releaseTargetAt - Date.now()) / 1000));
            if (this.secondsUntilRelease <= 0) {
                this.releaseTargetAt = null;
                this.clearReleaseInterval();
            }
        },
        clearReleaseInterval: function () {
            if (this.releaseInterval) {
                clearInterval(this.releaseInterval);
                this.releaseInterval = null;
            }
        },
        onVisibilityChange: async function () {
            if (document.visibilityState !== 'visible' || !this.isStudentStep) {
                return;
            }
            if (this.releaseTargetAt != null) {
                this.tickReleaseCountdown();
            }
            try {
                const response = await this.$axios.post('/state/getStarted');
                const seconds = response.data?.segundos_ate_liberacao;
                this.startReleaseCountdown(seconds == null ? 0 : parseInt(seconds, 10));
            } catch (e) {
                console.error(e);
            }
        },
        loadLinkedStudents: async function () {
            const response = await this.$axios.post('/student/linked');
            if (response.data?.alunos) {
                this.students = response.data.alunos.map(student => ({name: student.nome, studentId: student.id_aluno, studentCode: student.codigo}));
            }
        },
        startClearAction: function () {
            this.clearConfirmationDialog = true;
        },
        checkIfCanBuyMoreResources: async function () {
            this.handleNextLoading = true;
            try {
                const response = await this.$axios.post('/resource/booked');
                const bookedResources = response.data?.recursos;

                const maxResources = this.mesasBase + this.students.length * 2;
                if (bookedResources != null && bookedResources.length >= maxResources) {
                    this.exchangeOnlyDialog = true;
                    return;
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
        confirmExchangeOnly: function () {
            this.exchangeOnlyDialog = false;
            this.enterQueue();
        },
        showError: function (errorMessage) {
            this.errorDialogMessage = errorMessage;
            this.$nextTick(() => {
                this.errorDialog = true;
            })
        },
        reloadPage: function () {
            window.location.reload();
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