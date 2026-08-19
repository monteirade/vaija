"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CHANGE_REQUEST_STATUS_LABELS } from "@/lib/orders/labels";
import type { ChangeRequestStatus } from "@/types/domain";

const OPTIONS: ChangeRequestStatus[] = ["pending_review", "contacted", "quoted", "confirmed", "cancelled"];

export function ChangeStatusControl({ id, current }: { id: string; current: ChangeRequestStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(status: ChangeRequestStatus) {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/admin/change-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Não foi possível atualizar.");
      setPending(false);
      return;
    }
    router.refresh();
    setPending(false);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={status === current ? "primary" : status === "cancelled" ? "danger" : "secondary"}
            disabled={pending || status === current}
            onClick={() => setStatus(status)}
          >
            {CHANGE_REQUEST_STATUS_LABELS[status]}
          </Button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
