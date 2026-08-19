import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getRepository } from "@/lib/db";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const repo = getRepository();
  // Confirmar que a notificação pertence ao utilizador antes de a marcar como lida.
  const owned = (await repo.listNotificationsForUser(user.profile.id)).some((n) => n.id === id);
  if (!owned) return NextResponse.json({ error: "Não encontrada." }, { status: 404 });

  await repo.markNotificationRead(id);
  return NextResponse.json({ ok: true });
}
