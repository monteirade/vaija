import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getRepository } from "@/lib/db";
import { createChangeRequestSchema } from "@/lib/validation/order";

export async function POST(request: Request) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (user.profile.role !== "customer") {
    return NextResponse.json({ error: "Só clientes podem submeter pedidos de mudança." }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createChangeRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  const repo = getRepository();
  const changeRequest = await repo.createChangeRequest({
    customer_id: user.profile.id,
    pickup_address: input.pickupAddress,
    destination_address: input.destinationAddress,
    scheduled_at: input.scheduledAt ?? null,
    description: input.description,
    helpers_count: input.helpersCount,
  });

  for (const photo of input.photos) {
    await repo.addChangeRequestPhoto(changeRequest.id, photo.storagePath);
  }

  await repo.createNotification(
    user.profile.id,
    "system",
    "Pedido de mudança recebido",
    "A equipa Vai Já irá analisar o pedido."
  );

  return NextResponse.json({ changeRequest });
}
