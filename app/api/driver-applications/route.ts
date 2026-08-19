import { NextResponse } from "next/server";
import { getRepository } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { driverApplicationSchema } from "@/lib/validation/driver";

// Página pública "Quero ser motorista" (secção 16) — não exige login. Se o
// utilizador já tiver sessão iniciada, associamos a candidatura ao seu
// user_id para facilitar a aprovação mais tarde.
export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = driverApplicationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }

  const user = await getCurrentUser();
  const repo = getRepository();
  const application = await repo.createDriverApplication({
    user_id: user?.profile.id ?? null,
    ...parsed.data,
  });

  return NextResponse.json({ application });
}
