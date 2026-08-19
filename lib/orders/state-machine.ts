// Máquina de estados central dos pedidos (secção 9 da especificação).
// Toda a lógica de transição de estado da aplicação deve passar por aqui —
// nunca comparar/definir order.status diretamente fora deste módulo.

import type { OrderStatus } from "@/types/domain";

export const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "SEARCHING_DRIVER",
  "DRIVER_ASSIGNED",
  "DRIVER_ARRIVING",
  "DRIVER_ARRIVED",
  "CARGO_LOADING",
  "CARGO_LOADED",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pendente",
  SEARCHING_DRIVER: "A procurar motorista",
  DRIVER_ASSIGNED: "Motorista atribuído",
  DRIVER_ARRIVING: "Motorista a caminho",
  DRIVER_ARRIVED: "Motorista chegou",
  CARGO_LOADING: "A carregar",
  CARGO_LOADED: "Carga carregada",
  IN_TRANSIT: "Em transporte",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

// Transições válidas. Cancelamento é permitido a partir de qualquer estado
// não-terminal (decisão provisória — ver docs/TODO.md, "regras de
// cancelamento" está marcado como TBD na especificação).
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["SEARCHING_DRIVER", "CANCELLED"],
  SEARCHING_DRIVER: ["DRIVER_ASSIGNED", "CANCELLED"],
  DRIVER_ASSIGNED: ["DRIVER_ARRIVING", "CANCELLED"],
  DRIVER_ARRIVING: ["DRIVER_ARRIVED", "CANCELLED"],
  DRIVER_ARRIVED: ["CARGO_LOADING", "CANCELLED"],
  CARGO_LOADING: ["CARGO_LOADED", "CANCELLED"],
  CARGO_LOADED: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

// Rótulo do botão que o motorista vê para avançar para o próximo estado
// (secção 15: "Botões de estado devem aparecer de acordo com a máquina de
// estados e não todos ao mesmo tempo").
export const DRIVER_ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  DRIVER_ASSIGNED: "A caminho",
  DRIVER_ARRIVING: "Cheguei",
  DRIVER_ARRIVED: "Carga recolhida",
  CARGO_LOADING: "Confirmar carga carregada",
  CARGO_LOADED: "Iniciar transporte",
  IN_TRANSIT: "Entregue",
};

export function isTerminalStatus(status: OrderStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

export function getValidNextStatuses(status: OrderStatus): OrderStatus[] {
  return TRANSITIONS[status] ?? [];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return getValidNextStatuses(from).includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Transição inválida: ${from} -> ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertValidTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}

// Próximo estado "natural" no fluxo normal do motorista (ignora cancelamento).
export function getNextDriverStatus(status: OrderStatus): OrderStatus | null {
  const next = getValidNextStatuses(status).filter((s) => s !== "CANCELLED");
  return next[0] ?? null;
}
