export const STEP = {
  QUEUE: 1,
  SELECTION: 2,
  PAYMENT: 3,
  PAID: 4,
  SELECTION_EXPIRED: 5,
  PAYMENT_EXPIRED: 6,
  CANCELED: 7,
};

export const STEP_INFO = {
  [STEP.QUEUE]: { label: 'Na fila', color: 'grey', icon: 'mdi-account-multiple' },
  [STEP.SELECTION]: { label: 'Escolhendo', color: 'green', icon: 'mdi-cursor-default-click' },
  [STEP.PAYMENT]: { label: 'Pagamento', color: 'orange', icon: 'mdi-cash' },
  [STEP.PAID]: { label: 'Pago', color: 'green darken-2', icon: 'mdi-check-circle' },
  [STEP.SELECTION_EXPIRED]: { label: 'Seleção expirada', color: 'red', icon: 'mdi-timer-off' },
  [STEP.PAYMENT_EXPIRED]: { label: 'Pagamento expirado', color: 'red', icon: 'mdi-cash-remove' },
  [STEP.CANCELED]: { label: 'Cancelado', color: 'grey darken-2', icon: 'mdi-close-circle' },
};

export function stepInfo(id) {
  return STEP_INFO[id] || { label: '—', color: 'grey lighten-1', icon: 'mdi-help-circle' };
}
