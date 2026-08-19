import type { ServiceType, PaymentMethod, PaymentStatus, ChangeRequestStatus } from "@/types/domain";

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  materials: "Transporte de materiais",
  debris: "Transporte de entulho",
  team_with_tools: "Transporte de equipa + ferramentas",
  moving: "Mudança / transporte de bens",
  other: "Outro",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: "Cartão",
  mbway: "MB WAY",
  cash: "Numerário ao motorista",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  DEMO_PAID: "Pago (demo)",
  PAY_ON_DELIVERY: "A pagar na entrega",
};

export const CHANGE_REQUEST_STATUS_LABELS: Record<ChangeRequestStatus, string> = {
  pending_review: "Por rever",
  contacted: "Contactado",
  quoted: "Orçamentado",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
};
