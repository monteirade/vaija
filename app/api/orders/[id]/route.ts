import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getRepository } from "@/lib/db";
import { canAccessOrder } from "@/lib/orders/access";
import { canTransition, ORDER_STATUS_LABELS } from "@/lib/orders/state-machine";
import type { OrderStatus } from "@/types/domain";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const repo = getRepository();
  const order = await repo.getOrderById(id);
  if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  if (!(await canAccessOrder(user, order))) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const [history, driverProfile, driverLocation] = await Promise.all([
    repo.listOrderStatusHistory(order.id),
    order.driver_id ? repo.getDriverProfileById(order.driver_id) : Promise.resolve(null),
    order.driver_id ? repo.getLatestDriverLocation(order.driver_id) : Promise.resolve(null),
  ]);

  const driverUserProfile = driverProfile ? await repo.getProfileById(driverProfile.user_id) : null;

  return NextResponse.json({
    order,
    history,
    driver: driverUserProfile ? { full_name: driverUserProfile.full_name, phone: driverUserProfile.phone } : null,
    driverLocation,
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const repo = getRepository();
  const order = await repo.getOrderById(id);
  if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  if (!(await canAccessOrder(user, order))) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const nextStatus = body?.status as OrderStatus | undefined;
  if (!nextStatus) return NextResponse.json({ error: "status em falta." }, { status: 400 });

  // Regras de quem pode pedir cada transição (independente da máquina de
  // estados, que valida a transição em si):
  // - customer: só pode cancelar o próprio pedido.
  // - driver: só pode avançar estados do pedido que lhe está atribuído (nunca cancelar em nome do cliente).
  // - admin: pode forçar qualquer transição válida.
  const isOwner = order.customer_id === user.profile.id;
  const isAdmin = user.profile.role === "admin";
  const isAssignedDriver =
    user.profile.role === "driver" &&
    (await repo.getDriverProfileByUserId(user.profile.id))?.id === order.driver_id;

  const allowed =
    isAdmin ||
    (isOwner && nextStatus === "CANCELLED") ||
    (isAssignedDriver && nextStatus !== "CANCELLED");

  if (!allowed) return NextResponse.json({ error: "Sem permissão para esta transição." }, { status: 403 });
  if (!canTransition(order.status, nextStatus)) {
    return NextResponse.json({ error: `Transição inválida: ${order.status} -> ${nextStatus}` }, { status: 422 });
  }

  const updated = await repo.updateOrderStatus(id, nextStatus, user.profile.id);

  // Notificação operacional para o cliente em mudanças de estado relevantes
  // (secção 21). Quem mudou o estado (motorista/admin) não precisa de ser
  // notificado da própria ação.
  if (order.customer_id !== user.profile.id) {
    await repo.createNotification(
      order.customer_id,
      "order_status",
      `Pedido ${order.public_order_number}: ${ORDER_STATUS_LABELS[nextStatus]}`,
      nextStatus === "DELIVERED" ? "O seu pedido foi entregue." : nextStatus === "CANCELLED" ? "O pedido foi cancelado." : null
    );
  }

  return NextResponse.json({ order: updated });
}
