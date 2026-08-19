"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { getValidNextStatuses, ORDER_STATUS_LABELS } from "@/lib/orders/state-machine";
import type { Order, OrderStatus } from "@/types/domain";

interface DriverOption {
  driverProfileId: string;
  name: string;
  availability: string;
}

export function AdminOrderControls({ order, drivers }: { order: Order; drivers: DriverOption[] }) {
  const router = useRouter();
  const [selectedDriver, setSelectedDriver] = useState(drivers[0]?.driverProfileId ?? "");
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextStatuses = getValidNextStatuses(order.status);

  async function assign() {
    if (!selectedDriver) return;
    setAssigning(true);
    setError(null);
    const res = await fetch(`/api/admin/orders/${order.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverProfileId: selectedDriver }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Não foi possível atribuir.");
      setAssigning(false);
      return;
    }
    router.refresh();
    setAssigning(false);
  }

  async function forceStatus(status: OrderStatus) {
    setError(null);
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Não foi possível alterar o estado.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {!order.driver_id && (
        <div>
          <p className="mb-1.5 text-sm font-medium">Atribuição manual de motorista</p>
          {drivers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem motoristas aprovados disponíveis.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)} className="max-w-xs">
                {drivers.map((d) => (
                  <option key={d.driverProfileId} value={d.driverProfileId}>
                    {d.name} ({d.availability})
                  </option>
                ))}
              </Select>
              <Button size="sm" onClick={assign} disabled={assigning}>
                {assigning ? "A atribuir..." : "Atribuir"}
              </Button>
            </div>
          )}
        </div>
      )}

      {nextStatuses.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-medium">Alteração controlada de estado</p>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((status) => (
              <Button key={status} size="sm" variant={status === "CANCELLED" ? "danger" : "secondary"} onClick={() => forceStatus(status)}>
                {ORDER_STATUS_LABELS[status]}
              </Button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
