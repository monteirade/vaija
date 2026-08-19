import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getRepository } from "@/lib/db";
import { createOrderSchema } from "@/lib/validation/order";
import { geocodeAddress, calculateDistanceKm } from "@/lib/maps";
import { calculatePrice } from "@/lib/pricing/calculate";
import { findVehicleCategoryForWeight, UNCOVERED_WEIGHT_RANGE } from "@/lib/pricing/config";

export async function POST(request: Request) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (user.profile.role !== "customer") {
    return NextResponse.json({ error: "Só clientes podem criar pedidos." }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  // Validação de servidor da faixa de peso não coberta (secção 12): nunca
  // confiar apenas na validação do cliente.
  if (
    input.cargoWeightKg > UNCOVERED_WEIGHT_RANGE.min &&
    input.cargoWeightKg < UNCOVERED_WEIGHT_RANGE.max &&
    !findVehicleCategoryForWeight(input.cargoWeightKg)
  ) {
    return NextResponse.json(
      { error: "Este peso não está coberto pelas categorias automáticas. Contacte a equipa Vai Já." },
      { status: 422 }
    );
  }

  const pickup = geocodeAddress(input.pickupAddress);
  const destination = geocodeAddress(input.destinationAddress);
  const distanceKm = calculateDistanceKm(pickup, destination);

  const price = calculatePrice({
    vehicleCategory: input.vehicleCategory,
    distanceKm,
    needsHelpers: input.needsHelpers,
    helpersCount: input.helpersCount,
    helperHours: input.helperHours,
    passenger: input.passenger,
  });

  const paymentStatus = input.paymentMethod === "cash" ? "PAY_ON_DELIVERY" : "DEMO_PAID";

  const repo = getRepository();
  const order = await repo.createOrder({
    customer_id: user.profile.id,
    service_type: input.serviceType,
    timing_type: input.timingType,
    scheduled_at: input.timingType === "scheduled" ? input.scheduledAt ?? null : null,
    pickup_address: input.pickupAddress,
    pickup_lat: pickup.lat,
    pickup_lng: pickup.lng,
    destination_address: input.destinationAddress,
    destination_lat: destination.lat,
    destination_lng: destination.lng,
    distance_km: distanceKm,
    cargo_description: input.cargoDescription,
    cargo_weight_kg: input.cargoWeightKg,
    package_count: input.packageCount,
    vehicle_category: input.vehicleCategory,
    needs_helpers: input.needsHelpers,
    helpers_count: input.needsHelpers ? input.helpersCount : 0,
    helper_hours: input.needsHelpers ? input.helperHours : 0,
    passenger: input.passenger,
    payment_method: input.paymentMethod,
    payment_status: paymentStatus,
    base_price: price.basePrice,
    distance_price: price.distancePrice,
    helper_price: price.helperPrice,
    tolls: price.tolls,
    total_price: price.totalPrice,
    notes: input.notes ?? null,
  });

  for (const photo of input.photos) {
    await repo.addOrderPhoto(order.id, photo.storagePath);
  }

  await repo.createNotification(
    user.profile.id,
    "order_status",
    "Pedido criado",
    `O seu pedido ${order.public_order_number} foi criado e estamos a procurar um motorista.`
  );

  return NextResponse.json({ order });
}
