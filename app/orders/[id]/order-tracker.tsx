"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ORDER_STATUS_LABELS, ORDER_STATUSES, isTerminalStatus } from "@/lib/orders/state-machine";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, SERVICE_TYPE_LABELS } from "@/lib/orders/labels";
import type { Order, OrderStatusHistoryEntry, DriverLocation } from "@/types/domain";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrderMap } from "@/components/maps/order-map";

interface OrderTrackerProps {
  orderId: string;
  initialOrder: Order;
  initialHistory: OrderStatusHistoryEntry[];
  initialDriver: { full_name: string; phone: string | null } | null;
  canCancel: boolean;
}

// Acompanhamento do pedido "em tempo real". Em modo demo, isto é feito por
// polling curto (sem custo, sem credenciais); em modo Supabase, substituir
// por uma subscrição a Supabase Realtime sem alterar a UI — só a fonte da
// atualização muda (ver docs/ARCHITECTURE.md).
export function OrderTracker({ orderId, initialOrder, initialHistory, initialDriver, canCancel }: OrderTrackerProps) {
  const [order, setOrder] = useState(initialOrder);
  const [history, setHistory] = useState(initialHistory);
  const [driver, setDriver] = useState(initialDriver);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setOrder(data.order);
    setHistory(data.history);
    setDriver(data.driver);
    setDriverLocation(data.driverLocation ?? null);
  }, [orderId]);

  useEffect(() => {
    if (isTerminalStatus(order.status)) return;
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [order.status, refresh]);

  async function handleCancel() {
    setCancelling(true);
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    await refresh();
    setCancelling(false);
  }

  const flowStatuses = ORDER_STATUSES.filter((s): s is Exclude<Order["status"], "CANCELLED"> => s !== "CANCELLED");
  const currentIndex = flowStatuses.indexOf(order.status as Exclude<Order["status"], "CANCELLED">);

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <CardTitle>{order.public_order_number}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {order.pickup_address} → {order.destination_address}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {order.status === "CANCELLED" ? (
          <p className="text-sm text-danger">Este pedido foi cancelado.</p>
        ) : (
          <ol className="flex flex-wrap items-center gap-2">
            {flowStatuses.map((status, i) => (
              <li key={status} className="flex items-center gap-2">
                {i <= currentIndex ? (
                  <CheckCircle2 className="size-4 text-brand-yellow" />
                ) : (
                  <Circle className="size-4 text-muted-foreground" />
                )}
                <span className={cn("text-xs", i <= currentIndex ? "text-foreground" : "text-muted-foreground")}>
                  {ORDER_STATUS_LABELS[status]}
                </span>
                {i < flowStatuses.length - 1 && <span className="text-muted-foreground">→</span>}
              </li>
            ))}
          </ol>
        )}

        {!isTerminalStatus(order.status) && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> A atualizar automaticamente...
          </p>
        )}

        {canCancel && !isTerminalStatus(order.status) && (
          <Button variant="danger" size="sm" className="mt-4" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? "A cancelar..." : "Cancelar pedido"}
          </Button>
        )}
      </Card>

      {driver && (
        <Card>
          <CardTitle className="mb-2">Motorista</CardTitle>
          <p className="text-sm">{driver.full_name}</p>
          {driver.phone && <p className="text-sm text-muted-foreground">{driver.phone}</p>}
        </Card>
      )}

      {order.pickup_lat != null && order.pickup_lng != null && order.destination_lat != null && order.destination_lng != null && (
        <Card>
          <CardTitle className="mb-3">Mapa</CardTitle>
          <OrderMap
            pickup={{ lat: order.pickup_lat, lng: order.pickup_lng, label: order.pickup_address }}
            destination={{ lat: order.destination_lat, lng: order.destination_lng, label: order.destination_address }}
            driver={driverLocation ? { lat: driverLocation.lat, lng: driverLocation.lng, label: "Motorista" } : null}
          />
          {driver && !driverLocation && (
            <p className="mt-2 text-xs text-muted-foreground">
              O motorista ainda não partilhou a localização.
            </p>
          )}
        </Card>
      )}

      <Card>
        <CardTitle className="mb-3">Detalhes</CardTitle>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Detail label="Serviço" value={SERVICE_TYPE_LABELS[order.service_type]} />
          <Detail label="Veículo" value={order.vehicle_category} />
          <Detail label="Carga" value={order.cargo_description ?? "—"} />
          <Detail label="Peso" value={order.cargo_weight_kg ? `${order.cargo_weight_kg} kg` : "—"} />
          <Detail label="Distância" value={order.distance_km ? `${order.distance_km} km` : "—"} />
          <Detail label="Pagamento" value={PAYMENT_METHOD_LABELS[order.payment_method]} />
          <Detail label="Estado do pagamento" value={PAYMENT_STATUS_LABELS[order.payment_status]} />
          <Detail label="Total" value={`€${order.total_price.toFixed(2)}`} />
        </dl>
      </Card>

      <Card>
        <CardTitle className="mb-3">Histórico</CardTitle>
        <ul className="space-y-2 text-sm">
          {history.map((h) => (
            <li key={h.id} className="flex items-center justify-between text-muted-foreground">
              <span className="text-foreground">{ORDER_STATUS_LABELS[h.status]}</span>
              <span>{new Date(h.created_at).toLocaleString("pt-PT")}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: Order["status"] }) {
  const variant = status === "DELIVERED" ? "success" : status === "CANCELLED" ? "danger" : "brand";
  return (
    <Badge data-order-status variant={variant as "success" | "danger" | "brand"}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/60 py-1.5 sm:block sm:border-0 sm:py-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
