import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getRepository } from "@/lib/db";

// Atribuição manual de motorista pelo admin (secção 18).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("admin").catch(() => null);
  if (!user) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const driverProfileId = body?.driverProfileId as string | undefined;
  if (!driverProfileId) return NextResponse.json({ error: "driverProfileId em falta." }, { status: 400 });

  const repo = getRepository();
  const order = await repo.getOrderById(id);
  if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });

  const driverProfile = await repo.getDriverProfileById(driverProfileId);
  if (!driverProfile || driverProfile.status !== "approved") {
    return NextResponse.json({ error: "Motorista inválido ou não aprovado." }, { status: 422 });
  }

  const updated = await repo.assignDriverToOrder(id, driverProfileId, user.profile.id);
  await repo.createNotification(
    order.customer_id,
    "driver_assigned",
    "Motorista atribuído",
    `Um motorista foi atribuído ao seu pedido ${order.public_order_number}.`
  );
  return NextResponse.json({ order: updated });
}
