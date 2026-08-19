import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getRepository } from "@/lib/db";

export async function GET() {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const repo = getRepository();
  const notifications = await repo.listNotificationsForUser(user.profile.id);
  return NextResponse.json({ notifications });
}
