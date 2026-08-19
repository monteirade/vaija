"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Ícones do Leaflet servidos por CDN (unpkg) em vez de assets locais — evita
// os problemas conhecidos de resolução de caminhos de imagem do Leaflet com
// bundlers como o Turbopack/Webpack. Não foi possível validar o
// carregamento real dos tiles do OpenStreetMap neste ambiente de build
// (sem acesso à internet) — testar num ambiente com rede antes de dar como
// validado (ver docs/TODO.md).
const ICON_BASE = "https://unpkg.com/leaflet@1.9.4/dist/images";

function makeIcon(color: "blue" | "yellow" | "red") {
  const hue: Record<string, string> = { blue: "", yellow: "-gold", red: "-red" };
  return new L.Icon({
    iconUrl: `${ICON_BASE}/marker-icon${hue[color] ?? ""}.png`,
    iconRetinaUrl: `${ICON_BASE}/marker-icon${hue[color] ?? ""}.png`,
    shadowUrl: `${ICON_BASE}/marker-shadow.png`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

const pickupIcon = makeIcon("blue");
const destinationIcon = makeIcon("red");
const driverIcon = makeIcon("yellow");

export interface OrderMapPoint {
  lat: number;
  lng: number;
  label: string;
}

interface OrderMapInnerProps {
  pickup: OrderMapPoint;
  destination: OrderMapPoint;
  driver?: OrderMapPoint | null;
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 12);
      return;
    }
    map.fitBounds(points, { padding: [40, 40] });
  }, [map, points]);
  return null;
}

export default function OrderMapInner({ pickup, destination, driver }: OrderMapInnerProps) {
  const points: [number, number][] = [
    [pickup.lat, pickup.lng],
    [destination.lat, destination.lng],
    ...(driver ? [[driver.lat, driver.lng] as [number, number]] : []),
  ];

  return (
    <MapContainer
      center={[pickup.lat, pickup.lng]}
      zoom={11}
      scrollWheelZoom={false}
      style={{ height: "260px", width: "100%", borderRadius: "0.75rem" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
        <Popup>Recolha: {pickup.label}</Popup>
      </Marker>
      <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
        <Popup>Destino: {destination.label}</Popup>
      </Marker>
      {driver && (
        <Marker position={[driver.lat, driver.lng]} icon={driverIcon}>
          <Popup>Motorista</Popup>
        </Marker>
      )}
      <FitBounds points={points} />
    </MapContainer>
  );
}
