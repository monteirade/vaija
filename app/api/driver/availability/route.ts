import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getRepository } from "@/lib/db";
import type { DriverAvailability } from "@/types/domain";

export async function PATCH(request: Request) {
  const user = await requireRole("driver").catch(() => null);
  if (!user) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const availability = body?.availability as DriverAvailability | undefined;
  if (!availability || !["offline", "available", "busy"].includes(availability)) {
    return NextResponse.json({ error: "availability inválida." }, { status: 400 });
  }

  const repo = getRepository();
  const driverProfile = await repo.getDriverProfileByUserId(user.profile.id);
  if (!driverProfile) return NextResponse.json({ error: "Perfil de motorista não encontrado." }, { status: 404 });

  const updated = await repo.updateDriverProfile(driverProfile.id, { availability_status: availability });
  return NextResponse.json({ driverProfile: updated });
}
