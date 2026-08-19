"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { PhotoUploader, type UploadedPhoto } from "@/components/forms/photo-uploader";
import { AlertTriangle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import type { ServiceType, TimingType, VehicleCategory, PaymentMethod } from "@/types/domain";
import { SERVICE_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/orders/labels";
import { VEHICLE_CATEGORIES, findVehicleCategoryForWeight, UNCOVERED_WEIGHT_RANGE } from "@/lib/pricing/config";
import { calculatePrice } from "@/lib/pricing/calculate";
import { geocodeAddress, calculateDistanceKm } from "@/lib/maps";
import { cn } from "@/lib/utils";

const STEPS = ["Serviço", "Percurso", "Carga", "Veículo", "Extras", "Preço", "Pagamento", "Resumo"] as const;

const SERVICE_TYPES: ServiceType[] = ["materials", "debris", "team_with_tools", "moving", "other"];

export function RequestWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [timingType, setTimingType] = useState<TimingType>("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("materials");

  const [pickupAddress, setPickupAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");

  const [cargoDescription, setCargoDescription] = useState("");
  const [cargoWeightKg, setCargoWeightKg] = useState("");
  const [packageCount, setPackageCount] = useState("1");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);

  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory>("van");
  const [vehicleTouched, setVehicleTouched] = useState(false);

  const [needsHelpers, setNeedsHelpers] = useState(false);
  const [helpersCount, setHelpersCount] = useState(1);
  const [helperHours, setHelperHours] = useState(1);
  const [passenger, setPassenger] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mbway");
  const [mbwayPhone, setMbwayPhone] = useState("");
  const [mbwayConfirmed, setMbwayConfirmed] = useState(false);
  const [cardNumber, setCardNumber] = useState("");

  const weightKg = parseFloat(cargoWeightKg) || 0;
  const autoCategory = useMemo(() => findVehicleCategoryForWeight(weightKg), [weightKg]);
  const isUncoveredWeight =
    weightKg > UNCOVERED_WEIGHT_RANGE.min && weightKg < UNCOVERED_WEIGHT_RANGE.max && !autoCategory;

  const pickupGeo = useMemo(() => (pickupAddress ? geocodeAddress(pickupAddress) : null), [pickupAddress]);
  const destinationGeo = useMemo(
    () => (destinationAddress ? geocodeAddress(destinationAddress) : null),
    [destinationAddress]
  );
  const distanceKm = useMemo(
    () => (pickupGeo && destinationGeo ? calculateDistanceKm(pickupGeo, destinationGeo) : 0),
    [pickupGeo, destinationGeo]
  );

  const price = useMemo(
    () =>
      calculatePrice({
        vehicleCategory,
        distanceKm,
        needsHelpers,
        helpersCount,
        helperHours,
        passenger,
      }),
    [vehicleCategory, distanceKm, needsHelpers, helpersCount, helperHours, passenger]
  );

  function goNext() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function effectiveVehicleCategory(): VehicleCategory {
    if (vehicleTouched) return vehicleCategory;
    return autoCategory?.category ?? vehicleCategory;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timingType,
          scheduledAt: timingType === "scheduled" ? scheduledAt : null,
          serviceType,
          pickupAddress,
          destinationAddress,
          cargoDescription,
          cargoWeightKg: weightKg,
          packageCount: parseInt(packageCount, 10) || 1,
          photos: photos.map((p) => ({ storagePath: p.storagePath })),
          vehicleCategory: effectiveVehicleCategory(),
          needsHelpers,
          helpersCount,
          helperHours,
          passenger,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível criar o pedido.");
      router.push(`/orders/${data.order.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro inesperado.");
      setSubmitting(false);
    }
  }

  const canProceed = (() => {
    switch (step) {
      case 0:
        return Boolean(serviceType) && (timingType === "now" || Boolean(scheduledAt));
      case 1:
        return pickupAddress.trim().length > 2 && destinationAddress.trim().length > 2;
      case 2:
        return cargoDescription.trim().length > 0 && weightKg > 0 && !isUncoveredWeight;
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        return true;
      case 6:
        return paymentMethod === "card"
          ? cardNumber.trim().length >= 12
          : paymentMethod === "mbway"
            ? mbwayPhone.trim().length >= 9 && mbwayConfirmed
            : true;
      default:
        return true;
    }
  })();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <ol className="mb-8 flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li key={label}>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                i === step
                  ? "bg-brand-yellow text-brand-yellow-foreground"
                  : i < step
                    ? "bg-surface-2 text-foreground"
                    : "bg-surface text-muted-foreground"
              )}
            >
              {i + 1}. {label}
            </span>
          </li>
        ))}
      </ol>

      <Card className="min-h-[360px]">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <Label>Quando precisa do transporte?</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setTimingType("now")}
                  className={cn(
                    "flex-1 rounded-lg border px-4 py-3 text-sm font-medium",
                    timingType === "now" ? "border-brand-yellow bg-brand-yellow/10" : "border-border"
                  )}
                >
                  Agora
                </button>
                <button
                  type="button"
                  onClick={() => setTimingType("scheduled")}
                  className={cn(
                    "flex-1 rounded-lg border px-4 py-3 text-sm font-medium",
                    timingType === "scheduled" ? "border-brand-yellow bg-brand-yellow/10" : "border-border"
                  )}
                >
                  Agendar
                </button>
              </div>
            </div>
            {timingType === "scheduled" && (
              <div>
                <Label htmlFor="scheduledAt">Data e hora</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            )}
            <div>
              <Label>Tipo de serviço</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SERVICE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setServiceType(type)}
                    className={cn(
                      "rounded-lg border px-4 py-3 text-left text-sm",
                      serviceType === type ? "border-brand-yellow bg-brand-yellow/10" : "border-border"
                    )}
                  >
                    {SERVICE_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <CardTitle>Recolha e destino</CardTitle>
            <div>
              <Label htmlFor="pickup">Morada de recolha</Label>
              <Input
                id="pickup"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="Ex: Rua Central, Braga"
              />
              {pickupGeo?.approximate && pickupAddress.length > 2 && (
                <p className="mt-1 flex items-center gap-1 text-xs text-warning">
                  <AlertTriangle className="size-3.5" /> Localidade não reconhecida — a usar posição aproximada.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="destination">Morada de destino</Label>
              <Input
                id="destination"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="Ex: Avenida Central, Guimarães"
              />
              {destinationGeo?.approximate && destinationAddress.length > 2 && (
                <p className="mt-1 flex items-center gap-1 text-xs text-warning">
                  <AlertTriangle className="size-3.5" /> Localidade não reconhecida — a usar posição aproximada.
                </p>
              )}
            </div>
            {distanceKm > 0 && (
              <p className="text-sm text-muted-foreground">Distância estimada: {distanceKm} km</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <CardTitle>Descrição da carga</CardTitle>
            <div>
              <Label htmlFor="cargoDescription">O que vai transportar?</Label>
              <Textarea
                id="cargoDescription"
                value={cargoDescription}
                onChange={(e) => setCargoDescription(e.target.value)}
                placeholder="Ex: sofá de 3 lugares e 5 caixas"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weight">Peso aproximado (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  min={1}
                  value={cargoWeightKg}
                  onChange={(e) => setCargoWeightKg(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="packages">Número de volumes</Label>
                <Input
                  id="packages"
                  type="number"
                  min={1}
                  value={packageCount}
                  onChange={(e) => setPackageCount(e.target.value)}
                />
              </div>
            </div>
            {isUncoveredWeight && (
              <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                Este peso ({weightKg} kg) está entre as categorias Small Truck e Large Truck e não tem atribuição
                automática. Contacte a equipa Vai Já para uma avaliação manual.
              </p>
            )}
            <PhotoUploader photos={photos} onChange={setPhotos} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <CardTitle>Escolha o veículo</CardTitle>
            {autoCategory && !vehicleTouched && (
              <p className="text-sm text-muted-foreground">
                Sugerido para {weightKg} kg: <span className="text-brand-yellow">{VEHICLE_CATEGORIES[autoCategory.category].label}</span>
              </p>
            )}
            <div className="grid grid-cols-1 gap-3">
              {(Object.values(VEHICLE_CATEGORIES)).map((v) => (
                <button
                  key={v.category}
                  type="button"
                  onClick={() => {
                    setVehicleCategory(v.category);
                    setVehicleTouched(true);
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-4 py-3 text-left",
                    effectiveVehicleCategory() === v.category ? "border-brand-yellow bg-brand-yellow/10" : "border-border"
                  )}
                >
                  <span>
                    <span className="block font-medium">{v.label}</span>
                    <span className="block text-xs text-muted-foreground">{v.description}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">desde €{v.basePrice}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <CardTitle>Ajudantes e passageiro</CardTitle>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium">Precisa de ajudantes?</p>
                <p className="text-sm text-muted-foreground">€25/hora por ajudante</p>
              </div>
              <input
                type="checkbox"
                className="size-5 accent-[var(--brand-yellow)]"
                checked={needsHelpers}
                onChange={(e) => setNeedsHelpers(e.target.checked)}
              />
            </div>
            {needsHelpers && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="helpersCount">Número de ajudantes</Label>
                  <Input
                    id="helpersCount"
                    type="number"
                    min={1}
                    max={10}
                    value={helpersCount}
                    onChange={(e) => setHelpersCount(parseInt(e.target.value, 10) || 1)}
                  />
                </div>
                <div>
                  <Label htmlFor="helperHours">Duração estimada (horas)</Label>
                  <Input
                    id="helperHours"
                    type="number"
                    min={1}
                    max={24}
                    value={helperHours}
                    onChange={(e) => setHelperHours(parseFloat(e.target.value) || 1)}
                  />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium">Vai viajar com a carga?</p>
                <p className="text-sm text-muted-foreground">Sente-se no veículo do motorista</p>
              </div>
              <input
                type="checkbox"
                className="size-5 accent-[var(--brand-yellow)]"
                checked={passenger}
                onChange={(e) => setPassenger(e.target.checked)}
              />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <CardTitle>Distância e preço</CardTitle>
            <p className="text-sm text-muted-foreground">
              {pickupAddress} → {destinationAddress} · {distanceKm} km
            </p>
            <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
              <PriceRow label="Preço base" value={price.basePrice} />
              <PriceRow label="Distância adicional" value={price.distancePrice} />
              {needsHelpers && <PriceRow label="Ajudantes" value={price.helperPrice} />}
              <PriceRow label="Portagens" value={price.tolls} />
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
                <span>Total</span>
                <span className="text-brand-yellow">€{price.totalPrice.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Preços provisórios de protótipo (secção 7 da especificação). Distância calculada por aproximação em
              modo demo.
            </p>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <CardTitle>Pagamento (simulado)</CardTitle>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(["mbway", "card", "cash"] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-sm font-medium",
                    paymentMethod === method ? "border-brand-yellow bg-brand-yellow/10" : "border-border"
                  )}
                >
                  {PAYMENT_METHOD_LABELS[method]}
                </button>
              ))}
            </div>

            {paymentMethod === "card" && (
              <div className="space-y-3 rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">
                  Simulação — nenhum dado de cartão real é enviado ou armazenado.
                </p>
                <Input placeholder="Número do cartão (demo)" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Validade MM/AA" />
                  <Input placeholder="CVC" />
                </div>
                <Input placeholder="Nome no cartão" />
              </div>
            )}

            {paymentMethod === "mbway" && (
              <div className="space-y-3 rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">Ambiente de demonstração — nenhum pagamento real é processado.</p>
                <Input
                  placeholder="Número de telemóvel MB WAY"
                  value={mbwayPhone}
                  onChange={(e) => setMbwayPhone(e.target.value)}
                />
                <Button type="button" variant={mbwayConfirmed ? "secondary" : "primary"} onClick={() => setMbwayConfirmed(true)}>
                  {mbwayConfirmed ? "Pagamento confirmado ✓" : "Confirmar pagamento"}
                </Button>
              </div>
            )}

            {paymentMethod === "cash" && (
              <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                Paga o valor de €{price.totalPrice.toFixed(2)} diretamente ao motorista, em numerário, na entrega.
              </p>
            )}
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4">
            <CardTitle>Resumo do pedido</CardTitle>
            <div className="space-y-1 text-sm">
              <SummaryRow label="Serviço" value={SERVICE_TYPE_LABELS[serviceType]} />
              <SummaryRow label="Quando" value={timingType === "now" ? "Agora" : scheduledAt} />
              <SummaryRow label="Recolha" value={pickupAddress} />
              <SummaryRow label="Destino" value={destinationAddress} />
              <SummaryRow label="Carga" value={`${cargoDescription} · ${weightKg} kg · ${packageCount} volume(s)`} />
              <SummaryRow label="Veículo" value={VEHICLE_CATEGORIES[effectiveVehicleCategory()].label} />
              <SummaryRow label="Ajudantes" value={needsHelpers ? `${helpersCount} × ${helperHours}h` : "Não"} />
              <SummaryRow label="Passageiro" value={passenger ? "Sim" : "Não"} />
              <SummaryRow label="Pagamento" value={PAYMENT_METHOD_LABELS[paymentMethod]} />
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-base font-semibold">
                <span>Total</span>
                <span className="text-brand-yellow">€{price.totalPrice.toFixed(2)}</span>
              </div>
            </div>
            {submitError && <p className="text-sm text-danger">{submitError}</p>}
            <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {submitting ? "A criar pedido..." : "Confirmar pedido"}
            </Button>
          </div>
        )}
      </Card>

      {step < 7 && (
        <div className="mt-5 flex items-center justify-between">
          <Button variant="outline" onClick={goBack} disabled={step === 0}>
            <ArrowLeft className="size-4" /> Voltar
          </Button>
          <Button onClick={goNext} disabled={!canProceed}>
            Seguinte <ArrowRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function PriceRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span>€{value.toFixed(2)}</span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
