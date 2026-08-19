import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getRepository } from "@/lib/db";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("driver").catch(() => null);
  if (!user) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { id } = await params;
  const repo = getRepository();
  const driverProfile = await repo.getDriverProfileByUserId(user.profile.id);
  if (!driverProfile || driverProfile.status !== "approved") {
    return NextResponse.json({ error: "Conta de motorista ainda não aprovada." }, { status: 403 });
  }

  const order = await repo.getOrderById(id);
  if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  if (order.status !== "SEARCHING_DRIVER" || order.driver_id) {
    return NextResponse.json({ error: "Este pedido já não está disponível." }, { status: 409 });
  }

  const updated = await repo.assignDriverToOrder(id, driverProfile.id, user.profile.id);
  await repo.createNotification(
    order.customer_id,
    "driver_assigned",
    "Motorista atribuído",
    `${user.profile.full_name} aceitou o seu pedido ${order.public_order_number}.`
  );
  return NextResponse.json({ order: updated });
}
