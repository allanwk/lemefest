import Vue from 'vue';
import api from './axios';

const FALLBACK_INTERVAL = 5000;
const FALLBACK_RETRY_SSE = 30000;
const MAX_ERROR_STREAK = 3;

const state = Vue.observable({ usuario: null, recursos: [], connected: false });
const subscribers = new Set();

let es = null;
let fallbackTimer = null;
let retrySseTimer = null;
let errorStreak = 0;
let visibilityBound = false;

function notify(data) {
    subscribers.forEach((cb) => {
        try {
            cb(data);
        } catch (e) {
            console.error('stateStream subscriber falhou', e);
        }
    });
}

function applyState(data) {
    if (!data) return;
    if (data.usuario) state.usuario = data.usuario;
    if ('recursos' in data) state.recursos = data.recursos || [];
    notify(data);
}

function stopFallback() {
    if (fallbackTimer) {
        clearInterval(fallbackTimer);
        fallbackTimer = null;
    }
    if (retrySseTimer) {
        clearTimeout(retrySseTimer);
        retrySseTimer = null;
    }
}

async function pollOnce() {
    try {
        const { data } = await api.post('/state');
        applyState(data);
    } catch (e) {
        // silencioso: o interceptor do axios já trata 401/403
    }
}

function startFallback() {
    if (fallbackTimer) return;
    pollOnce();
    fallbackTimer = setInterval(pollOnce, FALLBACK_INTERVAL);
    retrySseTimer = setTimeout(() => {
        if (fallbackTimer) connect();
    }, FALLBACK_RETRY_SSE);
}

function closeStream() {
    if (es) {
        es.close();
        es = null;
    }
}

function isStreamHealthy() {
    return es != null && es.readyState !== EventSource.CLOSED;
}

async function onVisibilityChange() {
    if (document.visibilityState !== 'visible') {
        return;
    }
    // Mobile suspende a aba em background: o EventSource pode ter sido encerrado
    // sem disparar onerror, e os timers JS ficam defasados. Ao voltar, ressincroniza
    // o estado real do servidor e garante que o stream esteja vivo.
    await refreshNow();
    if (!fallbackTimer && !isStreamHealthy()) {
        connect();
    }
}

async function connect() {
    closeStream();
    if (!visibilityBound) {
        document.addEventListener('visibilitychange', onVisibilityChange);
        visibilityBound = true;
    }

    // Garante o cookie HttpOnly (sse_session) antes de abrir o EventSource. O cookie
    // só nasce em /user/create e /user/claim-session; sessões já existentes não o têm.
    // refresh-cookie usa o header Authorization (que o axios manda) para re-emitir o
    // cookie de 30d. É uma chamada por carga de página — NÃO por reconexão (o cookie
    // persiste, então o auto-reconnect do EventSource segue funcionando sem rede extra).
    try {
        await api.post('/user/refresh-cookie');
    } catch (e) {
        // sem cookie não dá pra abrir o stream — cai pro polling (que usa header)
        startFallback();
        return;
    }

    // Auth via cookie HttpOnly (sse_session) — withCredentials anexa o cookie na
    // requisição cross-origin. Sem token na URL.
    const url = `${api.defaults.baseURL}/state/stream`;
    es = new EventSource(url, { withCredentials: true });

    es.onopen = () => {
        state.connected = true;
        errorStreak = 0;
        stopFallback();
    };

    es.onmessage = (event) => {
        try {
            applyState(JSON.parse(event.data));
        } catch (e) {
            console.error('stateStream: erro ao processar frame SSE', e);
        }
    };

    es.addEventListener('session-invalidated', () => {
        closeStream();
        sessionStorage.removeItem('token');
        localStorage.removeItem('bootstrapToken');
        window.location.reload();
    });

    es.onerror = () => {
        state.connected = false;
        // CLOSED: recusa terminal do servidor (ex.: 401 por sessão invalidada). O
        // EventSource nativo NÃO reconecta nesse caso — cair no fallback já, nunca travar.
        if (es && es.readyState === EventSource.CLOSED) {
            closeStream();
            startFallback();
            return;
        }
        // CONNECTING: erro transitório, o EventSource tenta reconectar sozinho (cookie
        // ainda válido). Conta como salvaguarda; após MAX_ERROR_STREAK, promove ao polling.
        errorStreak += 1;
        if (errorStreak >= MAX_ERROR_STREAK) {
            closeStream();
            startFallback();
        }
    };
}

function stop() {
    closeStream();
    stopFallback();
    if (visibilityBound) {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        visibilityBound = false;
    }
    state.connected = false;
}

function subscribe(cb) {
    subscribers.add(cb);
    return () => subscribers.delete(cb);
}

async function refreshNow() {
    await pollOnce();
}

export default { state, connect, stop, subscribe, refreshNow };
