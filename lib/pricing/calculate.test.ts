import { describe, it, expect } from "vitest";
import { calculatePrice } from "./calculate";
import { VEHICLE_CATEGORIES, HELPER_PRICE_PER_HOUR, findVehicleCategoryForWeight, UNCOVERED_WEIGHT_RANGE } from "./config";

// Fase 7 — testes unitários do motor de preço (secção 27 da especificação:
// "cálculo de preço; preço de ajudantes; distância").

describe("calculatePrice — preço base e distância", () => {
  it("cobra apenas o preço base quando a distância está dentro do incluído (van, 10km <= 15km incluídos)", () => {
    const result = calculatePrice({
      vehicleCategory: "van",
      distanceKm: 10,
      needsHelpers: false,
      helpersCount: 0,
      helperHours: 0,
      passenger: false,
    });
    expect(result.basePrice).toBe(25);
    expect(result.distancePrice).toBe(0);
    expect(result.totalPrice).toBe(25);
  });

  it("cobra exatamente no limite dos km incluídos (van, 15km == 15km incluídos)", () => {
    const result = calculatePrice({
      vehicleCategory: "van",
      distanceKm: 15,
      needsHelpers: false,
      helpersCount: 0,
      helperHours: 0,
      passenger: false,
    });
    expect(result.distancePrice).toBe(0);
    expect(result.totalPrice).toBe(25);
  });

  it("cobra km extra acima do incluído (van, 25km = 15 incluídos + 10km extra a €0.65/km)", () => {
    const result = calculatePrice({
      vehicleCategory: "van",
      distanceKm: 25,
      needsHelpers: false,
      helpersCount: 0,
      helperHours: 0,
      passenger: false,
    });
    expect(result.distancePrice).toBe(6.5); // 10 * 0.65
    expect(result.totalPrice).toBe(31.5); // 25 + 6.5
  });

  it("aplica o preço por km extra correto de cada categoria de veículo", () => {
    const van = calculatePrice({ vehicleCategory: "van", distanceKm: 115, needsHelpers: false, helpersCount: 0, helperHours: 0, passenger: false });
    const smallTruck = calculatePrice({ vehicleCategory: "small_truck", distanceKm: 115, needsHelpers: false, helpersCount: 0, helperHours: 0, passenger: false });
    const largeTruck = calculatePrice({ vehicleCategory: "large_truck", distanceKm: 115, needsHelpers: false, helpersCount: 0, helperHours: 0, passenger: false });

    // 115km - 15km incluídos = 100km extra em todas as categorias
    expect(van.distancePrice).toBe(65); // 100 * 0.65
    expect(smallTruck.distancePrice).toBe(95); // 100 * 0.95
    expect(largeTruck.distancePrice).toBe(150); // 100 * 1.5

    expect(van.basePrice).toBe(VEHICLE_CATEGORIES.van.basePrice);
    expect(smallTruck.basePrice).toBe(VEHICLE_CATEGORIES.small_truck.basePrice);
    expect(largeTruck.basePrice).toBe(VEHICLE_CATEGORIES.large_truck.basePrice);
  });

  it("rejeita categoria de veículo desconhecida", () => {
    expect(() =>
      calculatePrice({
        // @ts-expect-error -- valor inválido deliberado para testar a validação
        vehicleCategory: "moto",
        distanceKm: 10,
        needsHelpers: false,
        helpersCount: 0,
        helperHours: 0,
        passenger: false,
      })
    ).toThrow();
  });

  it("rejeita distância negativa", () => {
    expect(() =>
      calculatePrice({
        vehicleCategory: "van",
        distanceKm: -5,
        needsHelpers: false,
        helpersCount: 0,
        helperHours: 0,
        passenger: false,
      })
    ).toThrow();
  });
});

describe("calculatePrice — preço de ajudantes", () => {
  it("não cobra ajudantes quando needsHelpers é false, mesmo com helpersCount/helperHours preenchidos", () => {
    const result = calculatePrice({
      vehicleCategory: "van",
      distanceKm: 10,
      needsHelpers: false,
      helpersCount: 2,
      helperHours: 3,
      passenger: false,
    });
    expect(result.helperPrice).toBe(0);
  });

  it("calcula o preço de ajudantes como helpersCount * helperHours * preço/hora", () => {
    const result = calculatePrice({
      vehicleCategory: "van",
      distanceKm: 10,
      needsHelpers: true,
      helpersCount: 2,
      helperHours: 3,
      passenger: false,
    });
    expect(result.helperPrice).toBe(2 * 3 * HELPER_PRICE_PER_HOUR); // 150
    expect(result.totalPrice).toBe(25 + 150);
  });

  it("trata valores negativos de ajudantes/horas como zero (nunca desconta)", () => {
    const result = calculatePrice({
      vehicleCategory: "van",
      distanceKm: 10,
      needsHelpers: true,
      helpersCount: -1,
      helperHours: 2,
      passenger: false,
    });
    expect(result.helperPrice).toBe(0);
  });
});

describe("calculatePrice — passageiro e portagens", () => {
  it("preço de passageiro é €0 em modo demo (TBD comercial, secção 31)", () => {
    const result = calculatePrice({
      vehicleCategory: "van",
      distanceKm: 10,
      needsHelpers: false,
      helpersCount: 0,
      helperHours: 0,
      passenger: true,
    });
    expect(result.passengerPrice).toBe(0);
  });

  it("usa portagens = 0 por omissão quando não especificadas", () => {
    const result = calculatePrice({
      vehicleCategory: "van",
      distanceKm: 10,
      needsHelpers: false,
      helpersCount: 0,
      helperHours: 0,
      passenger: false,
    });
    expect(result.tolls).toBe(0);
  });

  it("soma portagens explícitas ao total", () => {
    const result = calculatePrice({
      vehicleCategory: "van",
      distanceKm: 10,
      needsHelpers: false,
      helpersCount: 0,
      helperHours: 0,
      passenger: false,
      tolls: 4.5,
    });
    expect(result.tolls).toBe(4.5);
    expect(result.totalPrice).toBe(29.5);
  });

  it("soma todas as componentes no total (base + distância + ajudantes + passageiro + portagens)", () => {
    const result = calculatePrice({
      vehicleCategory: "small_truck",
      distanceKm: 40,
      needsHelpers: true,
      helpersCount: 1,
      helperHours: 2,
      passenger: true,
      tolls: 3,
    });
    const expectedDistance = (40 - 15) * 0.95; // 23.75
    const expectedHelper = 1 * 2 * HELPER_PRICE_PER_HOUR; // 50
    expect(result.totalPrice).toBe(round2(55 + expectedDistance + expectedHelper + 0 + 3));
  });
});

describe("findVehicleCategoryForWeight — faixas de peso", () => {
  it("devolve van para peso dentro da capacidade da van", () => {
    expect(findVehicleCategoryForWeight(500)?.category).toBe("van");
    expect(findVehicleCategoryForWeight(800)?.category).toBe("van");
  });

  it("devolve small_truck para peso acima da van até ao limite", () => {
    expect(findVehicleCategoryForWeight(801)?.category).toBe("small_truck");
    expect(findVehicleCategoryForWeight(3500)?.category).toBe("small_truck");
  });

  it("devolve large_truck para peso a partir do mínimo definido", () => {
    expect(findVehicleCategoryForWeight(10000)?.category).toBe("large_truck");
    expect(findVehicleCategoryForWeight(20000)?.category).toBe("large_truck");
  });

  it("devolve null na faixa não coberta entre small_truck e large_truck", () => {
    expect(findVehicleCategoryForWeight(UNCOVERED_WEIGHT_RANGE.min + 1)).toBeNull();
    expect(findVehicleCategoryForWeight(UNCOVERED_WEIGHT_RANGE.max - 1)).toBeNull();
  });
});

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
