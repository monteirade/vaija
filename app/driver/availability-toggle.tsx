"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { DriverAvailability } from "@/types/domain";

const OPTIONS: { value: DriverAvailability; label: string }[] = [
  { value: "offline", label: "Offline" },
  { value: "available", label: "Disponível" },
  { value: "busy", label: "Ocupado" },
];

export function AvailabilityToggle({ initial }: { initial: DriverAvailability }) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function update(next: DriverAvailability) {
    setValue(next);
    await fetch("/api/driver/availability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability: next }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="inline-flex rounded-lg border border-border p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={pending}
          onClick={() => update(opt.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            value === opt.value ? "bg-brand-yellow text-brand-yellow-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
