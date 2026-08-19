import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getRepository } from "@/lib/db";
import type { ChangeRequestStatus } from "@/types/domain";

const VALID_STATUSES: ChangeRequestStatus[] = ["pending_review", "contacted", "quoted", "confirmed", "cancelled"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("admin").catch(() => null);
  if (!user) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = body?.status as ChangeRequestStatus | undefined;
  const notes = body?.notes as string | undefined;
  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "status inválido." }, { status: 400 });
  }

  const repo = getRepository();
  const updated = await repo.updateChangeRequestStatus(id, status, notes);
  return NextResponse.json({ changeRequest: updated });
}
