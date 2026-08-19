// Configuração central de preços — Vai Já (PROTÓTIPO).
// Todos os valores aqui são PROVISÓRIOS e configuráveis (ver secção 7 e 31
// da especificação). Nenhuma regra de pricing deve ser duplicada noutro
// ficheiro: importar sempre a partir daqui.
//
// Numa fase futura, esta configuração pode passar a viver numa tabela
// `pricing_config` no Supabase, gerível pelo admin. A interface abaixo foi
// desenhada para tornar essa migração simples (ver lib/pricing/calculate.ts).

import type { VehicleCategory } from "@/types/domain";

export interface VehicleCategoryConfig {
  category: VehicleCategory;
  label: string;
  maxCapacityKg: number | null; // null = sem limite superior definido (large_truck)
  minCapacityKg: number;
  basePrice: number;
  includedKm: number;
  pricePerExtraKm: number;
  description: string;
}

export const VEHICLE_CATEGORIES: Record<VehicleCategory, VehicleCategoryConfig> = {
  van: {
    category: "van",
    label: "Van",
    minCapacityKg: 0,
    maxCapacityKg: 800,
    basePrice: 25,
    includedKm: 15,
    pricePerExtraKm: 0.65,
    description: "Até 800 kg — desde €25",
  },
  small_truck: {
    category: "small_truck",
    label: "Small Truck",
    minCapacityKg: 800,
    maxCapacityKg: 3500,
    basePrice: 55,
    includedKm: 15,
    pricePerExtraKm: 0.95,
    description: "Até 3.500 kg — desde €55",
  },
  large_truck: {
    category: "large_truck",
    label: "Large Truck",
    minCapacityKg: 10000,
    maxCapacityKg: null,
    basePrice: 110,
    includedKm: 15,
    pricePerExtraKm: 1.5,
    description: "10.000 kg+ — desde €110",
  },
};

export const HELPER_PRICE_PER_HOUR = 25;

// TBD — ver secção 31 do documento de especificação. Mantidos a 0 em modo
// demo até existir decisão comercial definitiva.
export const PASSENGER_PRICE = 0;
export const DEFAULT_TOLLS = 0;

// Faixa "cinzenta" entre small_truck (até 3.500 kg) e large_truck (10.000 kg+).
// Pedidos nesta faixa não têm categoria automática: o utilizador deve ser
// avisado e encaminhado para contacto/admin (secção 12).
export const UNCOVERED_WEIGHT_RANGE = { min: 3500, max: 10000 };

export function findVehicleCategoryForWeight(
  weightKg: number
): VehicleCategoryConfig | null {
  if (weightKg <= VEHICLE_CATEGORIES.van.maxCapacityKg!) return VEHICLE_CATEGORIES.van;
  if (weightKg <= VEHICLE_CATEGORIES.small_truck.maxCapacityKg!) return VEHICLE_CATEGORIES.small_truck;
  if (weightKg >= VEHICLE_CATEGORIES.large_truck.minCapacityKg) return VEHICLE_CATEGORIES.large_truck;
  return null; // faixa não coberta — ver UNCOVERED_WEIGHT_RANGE
}
