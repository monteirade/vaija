"use client";

import dynamic from "next/dynamic";
import type { OrderMapPoint } from "./order-map-inner";

// O Leaflet acede a `window`/`document` na importação, por isso o mapa tem
// de ser carregado exclusivamente no cliente (secção 8: camada de
// abstração de mapas — este é o único ponto que conhece o Leaflet).
const OrderMapInner = dynamic(() => import("./order-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[260px] w-full items-center justify-center rounded-xl border border-border bg-surface-2 text-sm text-muted-foreground">
      A carregar mapa...
    </div>
  ),
});

export interface OrderMapProps {
  pickup: OrderMapPoint;
  destination: OrderMapPoint;
  driver?: OrderMapPoint | null;
}

export function OrderMap(props: OrderMapProps) {
  return <OrderMapInner {...props} />;
}

export type { OrderMapPoint };
