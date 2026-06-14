<template>
    <v-container fluid fill-height class="d-flex justify-center align-start py-4">
        <FullscreenLoader v-if="!loaded" />

        <div v-else class="ficha-wrapper">
            <!-- Tela: catálogo -->
            <v-card v-if="tela === 'catalogo'" class="mb-4">
                <v-card-title class="keep-words">{{ modoTroca ? 'Trocar fichas' : 'Pré-venda de fichas' }}</v-card-title>
                <v-card-text>
                    <!-- Saldo de crédito -->
                    <v-sheet v-if="saldoCredito > 0" color="background" rounded class="pa-3 mb-4 d-flex justify-space-between align-center">
                        <span class="text-subtitle-2 font-weight-bold">Crédito disponível</span>
                        <span class="text-subtitle-1 font-weight-bold primary--text">R${{ saldoCredito.toFixed(2) }}</span>
                    </v-sheet>

                    <!-- Minhas fichas / catálogo de devolução -->
                    <v-sheet v-if="minhasCompras.length" color="background" rounded class="pa-3 mb-4">
                        <div class="d-flex justify-space-between align-center mb-2">
                            <div class="text-subtitle-2 font-weight-bold">{{ modoTroca ? 'Devolver fichas' : 'Minhas fichas' }}</div>
                            <v-btn v-if="!modoTroca" small text color="accent" @click="entrarModoTroca">
                                <v-icon left small>mdi-swap-horizontal</v-icon>
                                Trocar fichas
                            </v-btn>
                            <v-btn v-else small text color="accent" @click="sairModoTroca">
                                Cancelar troca
                            </v-btn>
                        </div>

                        <!-- Resumo (modo normal) -->
                        <template v-if="!modoTroca">
                            <div v-for="compra in minhasCompras" :key="`mc-${compra.id_ficha}`"
                                class="d-flex justify-space-between text-body-2">
                                <span>{{ compra.nome }}</span>
                                <span class="font-weight-medium">× {{ compra.quantidade }}</span>
                            </div>
                        </template>

                        <!-- Catálogo de devolução (modo troca) -->
                        <template v-else>
                            <v-list class="py-0" color="transparent">
                                <template v-for="(compra, index) in minhasCompras">
                                    <v-list-item :key="`dv-${compra.id_ficha}`" class="px-0">
                                        <v-list-item-content>
                                            <v-list-item-title class="font-weight-medium">{{ compra.nome }}</v-list-item-title>
                                            <v-list-item-subtitle>Possui {{ compra.quantidade }}</v-list-item-subtitle>
                                        </v-list-item-content>
                                        <v-list-item-action class="ma-0">
                                            <div class="d-flex align-center">
                                                <v-btn icon small color="accent" :disabled="(devolucoes[compra.id_ficha] || 0) <= 0"
                                                    @click="changeDevolucao(compra, -5)" aria-label="Diminuir 5">
                                                    <v-icon>mdi-numeric-5-circle-outline</v-icon>
                                                </v-btn>
                                                <v-btn icon small color="accent" :disabled="(devolucoes[compra.id_ficha] || 0) <= 0"
                                                    @click="changeDevolucao(compra, -1)" aria-label="Diminuir">
                                                    <v-icon>mdi-minus-circle-outline</v-icon>
                                                </v-btn>
                                                <v-text-field :value="devolucoes[compra.id_ficha] || 0"
                                                    @input="setDevolucao(compra, $event)"
                                                    @keypress="blockNonNumeric"
                                                    type="text" inputmode="numeric" pattern="[0-9]*"
                                                    hide-details dense single-line
                                                    class="mx-1 quantidade-input" aria-label="Quantidade a devolver"></v-text-field>
                                                <v-btn icon small color="primary"
                                                    :disabled="(devolucoes[compra.id_ficha] || 0) >= Number(compra.quantidade)"
                                                    @click="changeDevolucao(compra, 1)" aria-label="Aumentar">
                                                    <v-icon>mdi-plus-circle-outline</v-icon>
                                                </v-btn>
                                                <v-btn icon small color="primary"
                                                    :disabled="(devolucoes[compra.id_ficha] || 0) >= Number(compra.quantidade)"
                                                    @click="changeDevolucao(compra, 5)" aria-label="Aumentar 5">
                                                    <v-icon>mdi-numeric-5-circle-outline</v-icon>
                                                </v-btn>
                                            </div>
                                        </v-list-item-action>
                                    </v-list-item>
                                    <v-divider v-if="index < minhasCompras.length - 1" :key="`dvd-${compra.id_ficha}`"></v-divider>
                                </template>
                            </v-list>
                        </template>
                    </v-sheet>

                    <div v-if="modoTroca" class="text-subtitle-2 font-weight-bold mb-1">Comprar novas fichas</div>

                    <v-alert v-if="!preVendaAberta" dense text type="info" class="mb-2">
                        A pré-venda de fichas está encerrada.
                    </v-alert>
                    <p v-else-if="!fichas.length" class="text-center text--secondary mb-0">
                        Nenhuma ficha disponível no momento.
                    </p>

                    <v-list v-else class="py-0">
                        <template v-for="(ficha, index) in fichas">
                            <v-list-item :key="ficha.id_ficha" class="px-0">
                                <v-list-item-content>
                                    <v-list-item-title class="font-weight-medium" :class="{ 'text--disabled': ficha.esgotado }">{{ ficha.nome }}</v-list-item-title>
                                    <v-list-item-subtitle>R${{ Number(ficha.valor_unitario).toFixed(2) }}</v-list-item-subtitle>
                                </v-list-item-content>
                                <v-list-item-action class="ma-0">
                                    <v-chip v-if="ficha.esgotado" small color="accent" outlined>Esgotado</v-chip>
                                    <div v-else class="d-flex align-center">
                                        <v-btn icon small color="accent" :disabled="(quantidades[ficha.id_ficha] || 0) <= 0"
                                            @click="changeQuantity(ficha.id_ficha, -5)" aria-label="Diminuir 5">
                                            <v-icon>mdi-numeric-5-circle-outline</v-icon>
                                        </v-btn>
                                        <v-btn icon small color="accent" :disabled="(quantidades[ficha.id_ficha] || 0) <= 0"
                                            @click="changeQuantity(ficha.id_ficha, -1)" aria-label="Diminuir">
                                            <v-icon>mdi-minus-circle-outline</v-icon>
                                        </v-btn>
                                        <v-text-field :value="quantidades[ficha.id_ficha] || 0"
                                            @input="setQuantity(ficha.id_ficha, $event)"
                                            @keypress="blockNonNumeric"
                                            type="text" inputmode="numeric" pattern="[0-9]*"
                                            hide-details dense single-line
                                            class="mx-1 quantidade-input" aria-label="Quantidade"></v-text-field>
                                        <v-btn icon small color="primary"
                                            @click="changeQuantity(ficha.id_ficha, 1)" aria-label="Aumentar">
                                            <v-icon>mdi-plus-circle-outline</v-icon>
                                        </v-btn>
                                        <v-btn icon small color="primary"
                                            @click="changeQuantity(ficha.id_ficha, 5)" aria-label="Aumentar 5">
                                            <v-icon>mdi-numeric-5-circle-outline</v-icon>
                                        </v-btn>
                                    </div>
                                </v-list-item-action>
                            </v-list-item>
                            <v-divider v-if="index < fichas.length - 1" :key="`d-${ficha.id_ficha}`"></v-divider>
                        </template>
                    </v-list>

                    <!-- Resumo da compra normal -->
                    <template v-if="!modoTroca && totalItens > 0">
                        <v-sheet v-if="creditoAplicadoCompra > 0" color="background" rounded class="pa-3 mt-4">
                            <div class="d-flex justify-space-between text-body-2">
                                <span>Subtotal</span>
                                <span class="font-weight-medium">R${{ totalValor.toFixed(2) }}</span>
                            </div>
                            <div class="d-flex justify-space-between text-body-2 primary--text">
                                <span>Crédito aplicado</span>
                                <span class="font-weight-medium">- R${{ creditoAplicadoCompra.toFixed(2) }}</span>
                            </div>
                            <v-divider class="my-2" />
                            <div class="d-flex justify-space-between text-subtitle-1 font-weight-bold">
                                <span>Total a pagar</span>
                                <span>R${{ totalAPagarCompra.toFixed(2) }}</span>
                            </div>
                        </v-sheet>
                        <div v-else class="d-flex justify-space-between mt-4 text-subtitle-1 font-weight-bold">
                            <span>Total</span>
                            <span>R${{ totalValor.toFixed(2) }}</span>
                        </div>
                    </template>

                    <!-- Carregando simulação da troca -->
                    <v-sheet v-if="modoTroca && simulando" color="background" rounded class="pa-3 mt-4 d-flex align-center justify-center">
                        <v-progress-circular indeterminate color="primary" size="22" width="2" class="mr-2"></v-progress-circular>
                        <span class="text-body-2 text--secondary">Calculando troca...</span>
                    </v-sheet>

                    <!-- Resumo da troca -->
                    <v-sheet v-else-if="modoTroca && simulacao" color="background" rounded class="pa-3 mt-4">
                        <div class="d-flex justify-space-between text-body-2">
                            <span>Devolvido</span>
                            <span class="font-weight-medium">R${{ Number(simulacao.valor_devolvido).toFixed(2) }}</span>
                        </div>
                        <div class="d-flex justify-space-between text-body-2">
                            <span>Novas fichas</span>
                            <span class="font-weight-medium">R${{ Number(simulacao.valor_novas).toFixed(2) }}</span>
                        </div>
                        <div v-if="Number(simulacao.credito_usado) > 0" class="d-flex justify-space-between text-body-2">
                            <span>Crédito utilizado</span>
                            <span class="font-weight-medium">R${{ Number(simulacao.credito_usado).toFixed(2) }}</span>
                        </div>
                        <v-divider class="my-2" />
                        <div v-if="Number(simulacao.valor_a_pagar) > 0" class="d-flex justify-space-between text-subtitle-1 font-weight-bold">
                            <span>A pagar</span>
                            <span>R${{ Number(simulacao.valor_a_pagar).toFixed(2) }}</span>
                        </div>
                        <div v-else class="d-flex justify-space-between text-subtitle-1 font-weight-bold primary--text">
                            <span>Crédito gerado</span>
                            <span>R${{ Number(simulacao.credito_gerado).toFixed(2) }}</span>
                        </div>
                    </v-sheet>
                </v-card-text>

                <!-- Ações: compra normal -->
                <v-card-actions v-if="!modoTroca" class="flex-column px-4 pb-4">
                    <v-btn color="primary" block :disabled="totalItens === 0 || !preVendaAberta"
                        :loading="comprando" @click="comprar" class="mb-2">
                        {{ totalItens > 0 && totalAPagarCompra <= 0 ? 'Usar crédito' : 'Comprar fichas' }}
                    </v-btn>
                    <v-btn color="accent" outlined block @click="$emit('exit')">Voltar</v-btn>
                </v-card-actions>

                <!-- Ações: troca -->
                <v-card-actions v-else class="flex-column px-4 pb-4">
                    <v-btn color="primary" block :disabled="!trocaValida || !preVendaAberta || simulando"
                        :loading="comprando" @click="confirmarTroca" class="mb-2">
                        Confirmar troca
                    </v-btn>
                    <v-btn color="accent" outlined block @click="sairModoTroca">Cancelar troca</v-btn>
                </v-card-actions>
            </v-card>

            <!-- Tela: pagamento (QR) -->
            <v-card v-else-if="tela === 'pagamento'">
                <v-card-title class="keep-words justify-center">
                    Pague R${{ valorTotal.toFixed(2) }} via PIX
                </v-card-title>
                <v-card-text class="text-center">
                    <div class="mb-2">Escaneie o código QR:</div>
                    <v-img v-if="qrCodeBase64" :src="`data:image/png;base64,${qrCodeBase64}`" class="mx-auto" max-width="280"></v-img>

                    <v-divider class="my-3" />
                    <div class="mb-2">Ou use o código abaixo:</div>
                    <v-text-field id="fichaTextToCopy" readonly :value="qrCode" append-icon="mdi-content-copy" @click:append="copyCode" />
                    <v-btn color="primary" block @click="copyCode" class="mb-2">Copiar código</v-btn>
                    <p class="text--secondary mb-0">Você será redirecionado automaticamente assim que o pagamento for aprovado.</p>
                </v-card-text>
            </v-card>

            <!-- Tela: sucesso -->
            <v-card v-else-if="tela === 'sucesso'">
                <v-card-title class="keep-words justify-center">
                    <v-icon color="primary" large class="mr-2">mdi-check-circle-outline</v-icon>
                    {{ sucessoTroca ? 'Troca concluída!' : 'Compra concluída!' }}
                </v-card-title>
                <v-card-text class="text-center">
                    <p>Suas fichas foram garantidas. Apresente seu comprovante no evento.</p>
                    <v-sheet v-if="creditoGeradoSucesso > 0" color="background" rounded class="pa-3 mt-2">
                        <div class="text-subtitle-2 font-weight-bold">Crédito gerado</div>
                        <div class="text-subtitle-1 font-weight-bold primary--text">R${{ creditoGeradoSucesso.toFixed(2) }}</div>
                        <div class="text-caption text--secondary">Use em uma próxima compra de fichas.</div>
                    </v-sheet>
                </v-card-text>
                <v-card-actions class="flex-column px-4 pb-4">
                    <v-btn color="primary" block @click="comprarMais" class="mb-2">Voltar às fichas</v-btn>
                    <v-btn color="accent" outlined block @click="$emit('exit')">Voltar ao início</v-btn>
                </v-card-actions>
            </v-card>
        </div>
    </v-container>
</template>

<script>
    import FullscreenLoader from './FullscreenLoader';

    const POLL_INTERVAL_MS = 4000;
    const SIM_DEBOUNCE_MS = 500;

    export default {
        name: 'FichaFlow',
        components: {
            FullscreenLoader,
        },
        data: function () {
            return {
                loaded: false,
                tela: 'catalogo',
                fichas: [],
                quantidades: {},
                minhasCompras: [],
                preVendaAberta: false,
                comprando: false,
                qrCode: null,
                qrCodeBase64: null,
                valorTotal: 0,
                paidBefore: 0,
                pollTimer: null,
                saldoCredito: 0,
                modoTroca: false,
                devolucoes: {},
                simulacao: null,
                simTimer: null,
                simulando: false,
                sucessoTroca: false,
                creditoGeradoSucesso: 0,
            }
        },
        computed: {
            totalItens: function () {
                return Object.values(this.quantidades).reduce((sum, q) => sum + (q || 0), 0);
            },
            totalValor: function () {
                return this.fichas.reduce((sum, ficha) => {
                    return sum + (this.quantidades[ficha.id_ficha] || 0) * Number(ficha.valor_unitario);
                }, 0);
            },
            totalDevolucao: function () {
                return Object.values(this.devolucoes).reduce((sum, q) => sum + (q || 0), 0);
            },
            trocaValida: function () {
                return this.totalItens > 0 && this.totalDevolucao > 0;
            },
            creditoAplicadoCompra: function () {
                return Math.min(this.saldoCredito, this.totalValor);
            },
            totalAPagarCompra: function () {
                return Math.max(0, this.totalValor - this.creditoAplicadoCompra);
            }
        },
        mounted: function () {
            this.loadFichas();
        },
        beforeDestroy: function () {
            this.stopPolling();
            this.clearSimTimer();
        },
        methods: {
            loadFichas: async function () {
                try {
                    const [listResponse] = await Promise.all([
                        this.$axios.post('/ficha/list'),
                        this.loadMinhasCompras(),
                        this.loadCredito(),
                    ]);
                    this.fichas = listResponse.data.fichas || [];
                    this.preVendaAberta = !!listResponse.data.pre_venda_aberta;
                    const quantidades = {};
                    for (const ficha of this.fichas) {
                        quantidades[ficha.id_ficha] = 0;
                    }
                    this.quantidades = quantidades;
                } catch (e) {
                    this.$toasted.error('Erro ao carregar as fichas. Por favor recarregue a página.');
                } finally {
                    this.loaded = true;
                }
            },
            loadMinhasCompras: async function () {
                try {
                    const response = await this.$axios.post('/ficha/minhas-compras');
                    this.minhasCompras = response.data.compras || [];
                } catch (e) {
                    this.minhasCompras = [];
                }
            },
            loadCredito: async function () {
                try {
                    const response = await this.$axios.post('/ficha/credito');
                    this.saldoCredito = Number(response.data.saldo) || 0;
                } catch (e) {
                    this.saldoCredito = 0;
                }
            },
            changeQuantity: function (idFicha, delta) {
                this.$set(this.quantidades, idFicha, Math.max(0, (this.quantidades[idFicha] || 0) + delta));
                this.scheduleSimulacao();
            },
            blockNonNumeric: function (event) {
                if (!/[0-9]/.test(event.key)) {
                    event.preventDefault();
                }
            },
            setQuantity: function (idFicha, value) {
                const digits = String(value).replace(/\D/g, '');
                const parsed = parseInt(digits, 10);
                this.$set(this.quantidades, idFicha, Number.isNaN(parsed) ? 0 : Math.max(0, parsed));
                this.scheduleSimulacao();
            },
            changeDevolucao: function (compra, delta) {
                const max = Number(compra.quantidade);
                const novo = Math.min(max, Math.max(0, (this.devolucoes[compra.id_ficha] || 0) + delta));
                this.$set(this.devolucoes, compra.id_ficha, novo);
                this.scheduleSimulacao();
            },
            setDevolucao: function (compra, value) {
                const max = Number(compra.quantidade);
                const digits = String(value).replace(/\D/g, '');
                const parsed = parseInt(digits, 10);
                const novo = Number.isNaN(parsed) ? 0 : Math.min(max, Math.max(0, parsed));
                this.$set(this.devolucoes, compra.id_ficha, novo);
                this.scheduleSimulacao();
            },
            entrarModoTroca: function () {
                this.modoTroca = true;
                const devolucoes = {};
                for (const compra of this.minhasCompras) {
                    devolucoes[compra.id_ficha] = 0;
                }
                this.devolucoes = devolucoes;
                this.simulacao = null;
            },
            sairModoTroca: function () {
                this.modoTroca = false;
                this.devolucoes = {};
                this.simulacao = null;
                this.simulando = false;
                this.clearSimTimer();
            },
            buildItensNovos: function () {
                return this.fichas
                    .filter(ficha => (this.quantidades[ficha.id_ficha] || 0) > 0)
                    .map(ficha => ({ id_ficha: ficha.id_ficha, quantidade: this.quantidades[ficha.id_ficha] }));
            },
            buildItensDevolucao: function () {
                return this.minhasCompras
                    .filter(compra => (this.devolucoes[compra.id_ficha] || 0) > 0)
                    .map(compra => ({ id_ficha: compra.id_ficha, quantidade: this.devolucoes[compra.id_ficha] }));
            },
            clearSimTimer: function () {
                if (this.simTimer) {
                    window.clearTimeout(this.simTimer);
                    this.simTimer = null;
                }
            },
            scheduleSimulacao: function () {
                if (!this.modoTroca) {
                    return;
                }
                this.clearSimTimer();
                if (!this.trocaValida) {
                    this.simulando = false;
                    this.simulacao = null;
                    return;
                }
                this.simulando = true;
                this.simTimer = window.setTimeout(this.simularTroca, SIM_DEBOUNCE_MS);
            },
            simularTroca: async function () {
                if (!this.trocaValida) {
                    this.simulando = false;
                    this.simulacao = null;
                    return;
                }
                this.simulando = true;
                try {
                    const response = await this.$axios.post('/ficha/troca/simular', {
                        itens_devolucao: this.buildItensDevolucao(),
                        itens_novos: this.buildItensNovos(),
                    });
                    this.simulacao = response.data;
                } catch (e) {
                    this.simulacao = null;
                    const message = e.response?.data?.message;
                    if (message) {
                        this.$toasted.error(message);
                    }
                } finally {
                    this.simulando = false;
                }
            },
            comprar: async function () {
                const itens = this.buildItensNovos();

                if (!itens.length) {
                    return;
                }

                this.comprando = true;
                try {
                    const response = await this.$axios.post('/ficha/comprar', { itens }, { timeout: 30000 });
                    if (response.data.instantaneo) {
                        this.handleInstantaneo(response.data, false);
                        return;
                    }
                    this.qrCode = response.data.qr_code;
                    this.qrCodeBase64 = response.data.qr_code_base64;
                    this.valorTotal = Number(response.data.valor);
                    this.sucessoTroca = false;
                    this.paidBefore = await this.fetchComprasSignature();
                    this.tela = 'pagamento';
                    this.startPolling();
                } catch (e) {
                    const message = e.response?.data?.message || 'Não foi possível gerar o pagamento. Tente novamente.';
                    this.$toasted.error(message);
                } finally {
                    this.comprando = false;
                }
            },
            confirmarTroca: async function () {
                if (!this.trocaValida) {
                    return;
                }

                this.comprando = true;
                try {
                    const response = await this.$axios.post('/ficha/troca', {
                        itens_devolucao: this.buildItensDevolucao(),
                        itens_novos: this.buildItensNovos(),
                    }, { timeout: 30000 });

                    if (response.data.instantaneo) {
                        this.handleInstantaneo(response.data, true);
                        return;
                    }
                    this.qrCode = response.data.qr_code;
                    this.qrCodeBase64 = response.data.qr_code_base64;
                    this.valorTotal = Number(response.data.valor);
                    this.sucessoTroca = true;
                    this.paidBefore = await this.fetchComprasSignature();
                    this.tela = 'pagamento';
                    this.startPolling();
                } catch (e) {
                    const message = e.response?.data?.message || 'Não foi possível realizar a troca. Tente novamente.';
                    this.$toasted.error(message);
                } finally {
                    this.comprando = false;
                }
            },
            handleInstantaneo: function (data, isTroca) {
                this.sucessoTroca = isTroca;
                this.creditoGeradoSucesso = Number(data.credito_gerado) || 0;
                this.tela = 'sucesso';
            },
            fetchComprasSignature: async function () {
                const response = await this.$axios.post('/ficha/minhas-compras');
                const compras = response.data.compras || [];
                return compras
                    .map(compra => `${compra.id_ficha}:${compra.quantidade}`)
                    .sort()
                    .join('|');
            },
            startPolling: function () {
                this.stopPolling();
                this.pollTimer = window.setInterval(this.checkPayment, POLL_INTERVAL_MS);
            },
            stopPolling: function () {
                if (this.pollTimer) {
                    window.clearInterval(this.pollTimer);
                    this.pollTimer = null;
                }
            },
            checkPayment: async function () {
                try {
                    const signature = await this.fetchComprasSignature();
                    if (signature !== this.paidBefore) {
                        this.stopPolling();
                        this.creditoGeradoSucesso = 0;
                        this.tela = 'sucesso';
                    }
                } catch (e) {
                    // erro transitório de rede; o polling tenta novamente
                }
            },
            comprarMais: function () {
                this.qrCode = null;
                this.qrCodeBase64 = null;
                this.valorTotal = 0;
                this.sucessoTroca = false;
                this.creditoGeradoSucesso = 0;
                this.modoTroca = false;
                this.devolucoes = {};
                this.simulacao = null;
                this.tela = 'catalogo';
                this.loaded = false;
                this.loadFichas();
            },
            copyCode: function () {
                try {
                    const copyText = document.querySelector('#fichaTextToCopy');
                    copyText.select();
                    document.execCommand('copy');
                    this.$toasted.success('Código copiado!');
                } catch (e) {
                    this.$toasted.error('Não foi possível copiar o código');
                }
            }
        }
    }
</script>

<style scoped>
    .ficha-wrapper {
        width: 100%;
        max-width: min(100vw, 420px);
    }

    .keep-words {
        word-wrap: break-word;
        overflow-wrap: break-word;
        word-break: keep-all;
    }

    .quantidade-input {
        width: 44px;
        flex: 0 0 auto;
    }

    .quantidade-input >>> .v-input__slot::before,
    .quantidade-input >>> .v-input__slot::after {
        display: none;
    }

    .quantidade-input >>> input {
        text-align: center;
        font-weight: 600;
        padding: 0;
    }
</style>
