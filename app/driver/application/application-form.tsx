"use client";

import { useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VEHICLE_CATEGORIES } from "@/lib/pricing/config";
import type { VehicleCategory } from "@/types/domain";
import { CheckCircle2 } from "lucide-react";

export function DriverApplicationForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory>("van");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleRegistration, setVehicleRegistration] = useState("");
  const [vehicleCapacityKg, setVehicleCapacityKg] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [availability, setAvailability] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/driver-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          vehicle_category: vehicleCategory,
          vehicle_make: vehicleMake,
          vehicle_model: vehicleModel,
          vehicle_registration: vehicleRegistration,
          vehicle_capacity_kg: parseFloat(vehicleCapacityKg) || 0,
          service_area: serviceArea,
          availability,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível submeter a candidatura.");
      setSubmitted(true);
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
        <CardTitle>Candidatura recebida.</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          A equipa Vai Já vai analisar os seus dados e entrar em contacto.
        </p>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="full_name">Nome</Label>
          <Input id="full_name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="vehicle_category">Categoria de veículo</Label>
            <Select
              id="vehicle_category"
              value={vehicleCategory}
              onChange={(e) => setVehicleCategory(e.target.value as VehicleCategory)}
            >
              {Object.values(VEHICLE_CATEGORIES).map((v) => (
                <option key={v.category} value={v.category}>
                  {v.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="vehicle_capacity">Capacidade (kg)</Label>
            <Input
              id="vehicle_capacity"
              type="number"
              min={1}
              required
              value={vehicleCapacityKg}
              onChange={(e) => setVehicleCapacityKg(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="vehicle_make">Marca</Label>
            <Input id="vehicle_make" required value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="vehicle_model">Modelo</Label>
            <Input id="vehicle_model" required value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} />
          </div>
        </div>

        <div>
          <Label htmlFor="vehicle_registration">Matrícula</Label>
          <Input
            id="vehicle_registration"
            required
            value={vehicleRegistration}
            onChange={(e) => setVehicleRegistration(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="service_area">Zona de operação</Label>
          <Input
            id="service_area"
            required
            placeholder="Ex: Porto, Braga e arredores"
            value={serviceArea}
            onChange={(e) => setServiceArea(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="availability">Disponibilidade</Label>
          <Input
            id="availability"
            required
            placeholder="Ex: dias úteis, das 9h às 18h"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "A enviar..." : "Submeter candidatura"}
        </Button>
      </form>
    </Card>
  );
}
