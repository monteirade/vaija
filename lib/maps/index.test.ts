import { describe, it, expect } from "vitest";
import { calculateDistanceKm, geocodeAddress, suggestAddresses } from "./index";

// Fase 7 — testes unitários de distância/geocoding em modo demo (secção 27
// da especificação: "distância").

describe("calculateDistanceKm", () => {
  it("devolve 0 para o mesmo ponto", () => {
    const point = { lat: 41.1579, lng: -8.6291 }; // Porto
    expect(calculateDistanceKm(point, point)).toBe(0);
  });

  it("aplica o fator de correção de estrada (1.3x) sobre a distância em linha reta", () => {
    // Porto -> Braga, ~46km em linha reta (haversine); com fator 1.3 fica bem
    // acima da distância direta e é consistente entre execuções.
    const porto = { lat: 41.1579, lng: -8.6291 };
    const braga = { lat: 41.5454, lng: -8.4265 };
    const result = calculateDistanceKm(porto, braga);
    const straightLine = haversineKm(porto, braga);
    expect(result).toBeGreaterThan(straightLine);
    expect(result).toBeCloseTo(straightLine * 1.3, 0);
  });

  it("é simétrica (distância A->B igual a B->A)", () => {
    const porto = { lat: 41.1579, lng: -8.6291 };
    const guimaraes = { lat: 41.4425, lng: -8.2918 };
    expect(calculateDistanceKm(porto, guimaraes)).toBe(calculateDistanceKm(guimaraes, porto));
  });
});

describe("geocodeAddress — gazetteer local (sem rede, ver docs/TODO.md)", () => {
  it("resolve uma localidade conhecida do gazetteer sem marcar approximate", () => {
    const result = geocodeAddress("Rua Central, Braga");
    expect(result.matchedLocality).toBe("Braga");
    expect(result.approximate).toBe(false);
  });

  it("cai na localização de referência (Porto) e marca approximate quando não encontra nenhuma localidade conhecida", () => {
    const result = geocodeAddress("Rua Inexistente XPTO 12345, Marte");
    expect(result.matchedLocality).toBeNull();
    expect(result.approximate).toBe(true);
  });
});

describe("suggestAddresses", () => {
  it("devolve lista vazia para consulta vazia", () => {
    expect(suggestAddresses("")).toEqual([]);
    expect(suggestAddresses("   ")).toEqual([]);
  });

  it("filtra localidades pelo texto, sem distinguir maiúsculas/minúsculas", () => {
    const results = suggestAddresses("brag");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.label.toLowerCase().includes("brag"))).toBe(true);
  });
});

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}
