import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getRepository } from "@/lib/db";

// Publicação de localização do motorista (secção 8 e 15): o browser envia
// atualizações throttled enquanto o dashboard/pedido do motorista estiver
// aberto e houver um pedido ativo. Não há tracking em background — isso é
// uma limitação de webapp assumida e documentada (fora de âmbito, secção 28).
export async function POST(request: Request) {
  const user = await requireRole("driver").catch(() => null);
  if (!user) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  const accuracy = body?.accuracy != null ? Number(body.accuracy) : null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng inválidos." }, { status: 400 });
  }

  const repo = getRepository();
  const driverProfile = await repo.getDriverProfileByUserId(user.profile.id);
  if (!driverProfile) return NextResponse.json({ error: "Perfil de motorista não encontrado." }, { status: 404 });

  const location = await repo.recordDriverLocation(driverProfile.id, lat, lng, accuracy);
  return NextResponse.json({ location });
}
