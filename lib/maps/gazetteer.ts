// Gazetteer demo — localidades do mercado inicial da Vai Já (Norte de
// Portugal, aproximadamente até Aveiro; secção 1 da especificação).
//
// Isto é o fallback "experiência de mapa demo" previsto na secção 8: sem
// credencial de um serviço de geocoding pago, a app usa esta lista local
// para converter moradas em coordenadas aproximadas. Ver lib/maps/index.ts.

export interface Locality {
  name: string;
  lat: number;
  lng: number;
}

export const LOCALITIES: Locality[] = [
  { name: "Porto", lat: 41.1579, lng: -8.6291 },
  { name: "Vila Nova de Gaia", lat: 41.1239, lng: -8.6118 },
  { name: "Matosinhos", lat: 41.1815, lng: -8.6871 },
  { name: "Braga", lat: 41.5454, lng: -8.4265 },
  { name: "Guimarães", lat: 41.4425, lng: -8.2918 },
  { name: "Aveiro", lat: 40.6405, lng: -8.6538 },
  { name: "Viana do Castelo", lat: 41.6932, lng: -8.8329 },
  { name: "Vila Nova de Famalicão", lat: 41.4076, lng: -8.5205 },
  { name: "Barcelos", lat: 41.5388, lng: -8.6151 },
  { name: "Póvoa de Varzim", lat: 41.3809, lng: -8.7631 },
  { name: "Santo Tirso", lat: 41.3427, lng: -8.4778 },
  { name: "Penafiel", lat: 41.2072, lng: -8.2836 },
  { name: "Amarante", lat: 41.2733, lng: -8.0793 },
  { name: "Santa Maria da Feira", lat: 40.9257, lng: -8.5486 },
  { name: "Espinho", lat: 41.0072, lng: -8.6413 },
  { name: "Vila do Conde", lat: 41.3517, lng: -8.7444 },
  { name: "Paredes", lat: 41.2081, lng: -8.3311 },
  { name: "Valongo", lat: 41.1877, lng: -8.4998 },
  { name: "Maia", lat: 41.2350, lng: -8.6203 },
  { name: "Gondomar", lat: 41.1436, lng: -8.5286 },
  { name: "Ovar", lat: 40.8583, lng: -8.6259 },
  { name: "Fafe", lat: 41.4536, lng: -8.1596 },
  { name: "Vizela", lat: 41.3831, lng: -8.3033 },
];

/** Coordenadas usadas quando a morada não corresponde a nenhuma localidade
 * conhecida (sede provisória: centro do Porto). */
export const FALLBACK_LOCATION: Locality = LOCALITIES[0];

export function findLocalityInAddress(address: string): Locality | null {
  const normalized = normalize(address);
  let best: Locality | null = null;
  for (const locality of LOCALITIES) {
    if (normalized.includes(normalize(locality.name))) {
      if (!best || locality.name.length > best.name.length) best = locality;
    }
  }
  return best;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
