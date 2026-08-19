"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getRepository } from "@/lib/db";
import { approveDriverApplication } from "./onboarding";

export interface ApproveState {
  message?: string;
  temporaryPassword?: string | null;
  error?: string;
}

export async function approveDriverApplicationAction(_prev: ApproveState, formData: FormData): Promise<ApproveState> {
  await requireRole("admin");
  const applicationId = String(formData.get("applicationId") ?? "");
  try {
    const result = await approveDriverApplication(applicationId);
    // Nota: propositadamente SEM revalidatePath aqui. Se revalidássemos a
    // rota logo após a aprovação, a candidatura desapareceria da lista de
    // "pendentes" na mesma transição em que o useActionState devolve a
    // password temporária — desmontando o botão antes de o admin conseguir
    // ler/copiar a password. A lista "Motoristas ativos" atualiza-se
    // naturalmente na próxima visita/refresh manual da página.
    return {
      message: result.createdNewAccount ? "Candidatura aprovada e conta criada." : "Candidatura aprovada.",
      temporaryPassword: result.temporaryPassword,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro inesperado." };
  }
}

export async function suspendDriverAction(formData: FormData): Promise<void> {
  await requireRole("admin");
  const driverProfileId = String(formData.get("driverProfileId") ?? "");
  const repo = getRepository();
  await repo.updateDriverProfile(driverProfileId, { status: "suspended" });
  revalidatePath("/admin/drivers");
}

export async function reactivateDriverAction(formData: FormData): Promise<void> {
  await requireRole("admin");
  const driverProfileId = String(formData.get("driverProfileId") ?? "");
  const repo = getRepository();
  await repo.updateDriverProfile(driverProfileId, { status: "approved" });
  revalidatePath("/admin/drivers");
}
