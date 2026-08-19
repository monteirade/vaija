import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { approveDriverApplication, OnboardingError } from "@/lib/drivers/onboarding";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("admin").catch(() => null);
  if (!user) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { id } = await params;
  try {
    const result = await approveDriverApplication(id);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof OnboardingError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
