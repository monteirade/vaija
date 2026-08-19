"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PhotoUploader, type UploadedPhoto } from "@/components/forms/photo-uploader";
import { CheckCircle2 } from "lucide-react";

export function ChangeRequestForm() {
  const router = useRouter();
  const [pickupAddress, setPickupAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [description, setDescription] = useState("");
  const [helpersCount, setHelpersCount] = useState(0);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/change-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupAddress,
          destinationAddress,
          scheduledAt: scheduledAt || null,
          description,
          helpersCount,
          photos: photos.map((p) => ({ storagePath: p.storagePath })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível submeter o pedido.");
      setSubmitted(true);
      setTimeout(() => router.push("/dashboard"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <CheckCircle2 className="mx-auto mb-3 size-10 text-brand-yellow" />
        <CardTitle>Pedido recebido.</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">A equipa Vai Já irá analisar o pedido.</p>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="pickup">Origem</Label>
          <Input id="pickup" required value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="destination">Destino</Label>
          <Input id="destination" required value={destinationAddress} onChange={(e) => setDestinationAddress(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="scheduledAt">Data/hora pretendida</Label>
          <Input id="scheduledAt" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="description">Descrição da mudança</Label>
          <Textarea id="description" required value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="helpersCount">Número de ajudantes</Label>
          <Input
            id="helpersCount"
            type="number"
            min={0}
            max={10}
            value={helpersCount}
            onChange={(e) => setHelpersCount(parseInt(e.target.value, 10) || 0)}
          />
        </div>
        <PhotoUploader photos={photos} onChange={setPhotos} label="Fotografias (opcional)" />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "A enviar..." : "Submeter pedido de mudança"}
        </Button>
      </form>
    </Card>
  );
}
