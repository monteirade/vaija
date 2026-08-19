// Camada de abstração de mapas/geocoding (secção 8 da especificação).
// O domínio da aplicação nunca deve depender diretamente de um
// fornecedor concreto — importar sempre a partir daqui.

import { LOCALITIES, FALLBACK_LOCATION, findLocalityInAddress } from "./gazetteer";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  matchedLocality: string | null;
  approximate: boolean;
}

export interface AddressSuggestion {
  label: string;
  lat: number;
  lng: number;
}

/**
 * Geocoding — modo demo.
 *
 * Sem credencial de um fornecedor pago (secção 8: "preferir opção
 * gratuita/free-tier... permitir fallback para uma experiência de mapa
 * demo"), este módulo resolve a morada através de um gazetteer local do
 * mercado inicial (lib/maps/gazetteer.ts). Se nenhuma localidade
 * conhecida for encontrada no texto, devolve a localização de referência
 * (Porto) marcada como `approximate: true`, para que a UI possa avisar o
 * utilizador. Um fornecedor real (Nominatim, Mapbox, etc.) pode substituir
 * esta função sem alterar quem a chama.
 */
export function geocodeAddress(address: string): GeocodeResult {
  const locality = findLocalityInAddress(address);
  if (locality) {
    return { lat: locality.lat, lng: locality.lng, matchedLocality: locality.name, approximate: false };
  }
  return { ...FALLBACK_LOCATION, matchedLocality: null, approximate: true };
}

export function suggestAddresses(query: string): AddressSuggestion[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return LOCALITIES.filter((l) => l.name.toLowerCase().includes(normalized))
    .slice(0, 6)
    .map((l) => ({ label: l.name, lat: l.lat, lng: l.lng }));
}

/**
 * Distância — modo demo.
 *
 * Sem uma API de routing paga, calcula-se a distância em linha reta
 * (fórmula de Haversine) e aplica-se um fator de correção (1.3x) para
 * aproximar a distância real por estrada. É uma aproximação DELIBERADA e
 * documentada (docs/TODO.md) — um fornecedor de routing real substituiria
 * apenas esta função.
 */
const ROAD_DISTANCE_FACTOR = 1.3;

export function calculateDistanceKm(a: LatLng, b: LatLng): number {
  const straightLineKm = haversineKm(a, b);
  const roadDistance = straightLineKm * ROAD_DISTANCE_FACTOR;
  return Math.round(roadDistance * 10) / 10;
}

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
