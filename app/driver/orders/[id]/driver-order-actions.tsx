"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DRIVER_ACTION_LABELS, getNextDriverStatus, isTerminalStatus } from "@/lib/orders/state-machine";
import type { Order } from "@/types/domain";
import { Loader2 } from "lucide-react";

export function DriverOrderActions({ order, isMine, isAvailable }: { order: Order; isMine: boolean; isAvailable: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/driver/orders/${order.id}/accept`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Não foi possível aceitar o pedido.");
      setPending(false);
      return;
    }
    router.refresh();
    setPending(false);
  }

  async function advance() {
    const next = getNextDriverStatus(order.status);
    if (!next) return;
    setPending(true);
    setError(null);
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Não foi possível avançar o estado.");
      setPending(false);
      return;
    }
    router.refresh();
    setPending(false);
  }

  if (isAvailable) {
    return (
      <div>
        <Button onClick={accept} disabled={pending} size="lg">
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {pending ? "A aceitar..." : "Aceitar pedido"}
        </Button>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>
    );
  }

  if (isMine && !isTerminalStatus(order.status)) {
    const label = DRIVER_ACTION_LABELS[order.status] ?? "Avançar";
    return (
      <div>
        <Button onClick={advance} disabled={pending} size="lg">
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {pending ? "A atualizar..." : label}
        </Button>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>
    );
  }

  return null;
}
