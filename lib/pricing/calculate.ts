// Motor de cálculo de preço — única implementação da fórmula de pricing.
// transport_price = base_price + max(0, distance_km - included_km) * price_per_km
// helper_price     = helpers_count * helper_hours * HELPER_PRICE_PER_HOUR
// total            = transport_price + helper_price + tolls + passenger_price

import {
  VEHICLE_CATEGORIES,
  HELPER_PRICE_PER_HOUR,
  PASSENGER_PRICE,
  DEFAULT_TOLLS,
} from "./config";
import type { VehicleCategory } from "@/types/domain";

export interface PriceInput {
  vehicleCategory: VehicleCategory;
  distanceKm: number;
  needsHelpers: boolean;
  helpersCount: number;
  helperHours: number;
  passenger: boolean;
  tolls?: number;
}

export interface PriceBreakdown {
  basePrice: number;
  distancePrice: number;
  helperPrice: number;
  passengerPrice: number;
  tolls: number;
  totalPrice: number;
}

export function calculatePrice(input: PriceInput): PriceBreakdown {
  const config = VEHICLE_CATEGORIES[input.vehicleCategory];
  if (!config) {
    throw new Error(`Categoria de veículo desconhecida: ${input.vehicleCategory}`);
  }
  if (input.distanceKm < 0) {
    throw new Error("distanceKm não pode ser negativo");
  }

  const basePrice = config.basePrice;
  const extraKm = Math.max(0, input.distanceKm - config.includedKm);
  const distancePrice = round2(extraKm * config.pricePerExtraKm);

  const helperPrice = input.needsHelpers
    ? round2(
        Math.max(0, input.helpersCount) *
          Math.max(0, input.helperHours) *
          HELPER_PRICE_PER_HOUR
      )
    : 0;

  const passengerPrice = input.passenger ? PASSENGER_PRICE : 0;
  const tolls = input.tolls ?? DEFAULT_TOLLS;

  const totalPrice = round2(
    basePrice + distancePrice + helperPrice + passengerPrice + tolls
  );

  return {
    basePrice,
    distancePrice,
    helperPrice,
    passengerPrice,
    tolls,
    totalPrice,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
