import "server-only";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { getRepository, isDemoMode } from "@/lib/db";
import type { DriverApplication } from "@/types/domain";

export class OnboardingError extends Error {}

export interface DriverOnboardingResult {
  driverProfileId: string;
  userId: string;
  createdNewAccount: boolean;
  temporaryPassword: string | null;
}

/**
 * Aprova uma candidatura de motorista e ativa a conta correspondente
 * (secção 16: "A candidatura entra no admin como pending"). Chamado pelo
 * dashboard admin (Fase 4). Construído já na Fase 3 porque é a peça que
 * liga uma candidatura aprovada a uma conta de motorista funcional — sem
 * isto não há como testar o dashboard do motorista de ponta a ponta.
 *
 * Em modo demo, se a candidatura não estiver associada a um utilizador já
 * registado, cria-se uma conta nova com uma password temporária
 * determinística (documentada aqui e em docs/TODO.md) — não há envio de
 * email/SMS real (fora de âmbito, secção 28), por isso a password é
 * devolvida à interface admin para ser partilhada manualmente com o
 * candidato.
 */
export async function approveDriverApplication(applicationId: string): Promise<DriverOnboardingResult> {
  const repo = getRepository();
  const application = await repo.getDriverApplicationById(applicationId);
  if (!application) throw new OnboardingError("Candidatura não encontrada.");
  if (application.status === "approved") throw new OnboardingError("Candidatura já foi aprovada.");

  const { userId, createdNewAccount, temporaryPassword } = await ensureDriverUser(application);

  let driverProfile = await repo.getDriverProfileByUserId(userId);
  if (!driverProfile) {
    driverProfile = await repo.createDriverProfile(userId, application.service_area);
  }
  driverProfile = await repo.updateDriverProfile(driverProfile.id, { status: "approved" });

  const existingVehicles = await repo.listVehiclesByDriver(driverProfile.id);
  if (existingVehicles.length === 0) {
    await repo.createVehicle(driverProfile.id, {
      category: application.vehicle_category,
      make: application.vehicle_make,
      model: application.vehicle_model,
      registration: application.vehicle_registration,
      capacity_kg: application.vehicle_capacity_kg,
    });
  }

  await repo.updateDriverApplicationStatus(applicationId, "approved");
  await repo.createNotification(
    userId,
    "system",
    "Candidatura aprovada",
    "A sua candidatura de motorista foi aprovada. Já pode aceder ao seu painel."
  );

  return { driverProfileId: driverProfile.id, userId, createdNewAccount, temporaryPassword };
}

async function ensureDriverUser(
  application: DriverApplication
): Promise<{ userId: string; createdNewAccount: boolean; temporaryPassword: string | null }> {
  const repo = getRepository();

  if (application.user_id) {
    await repo.updateProfile(application.user_id, { role: "driver" });
    return { userId: application.user_id, createdNewAccount: false, temporaryPassword: null };
  }

  const existingByEmail = await repo.getProfileByEmail(application.email);
  if (existingByEmail) {
    await repo.updateProfile(existingByEmail.id, { role: "driver" });
    return { userId: existingByEmail.id, createdNewAccount: false, temporaryPassword: null };
  }

  if (!isDemoMode()) {
    throw new OnboardingError(
      "Criação de conta em modo Supabase real ainda não está implementada — criar o utilizador em supabase.auth.admin primeiro."
    );
  }

  const temporaryPassword = generateTemporaryPassword();
  const id = randomUUID();
  await repo.createProfile({
    id,
    role: "driver",
    full_name: application.full_name,
    email: application.email,
    phone: application.phone,
    password_hash: await bcrypt.hash(temporaryPassword, 10),
  });

  return { userId: id, createdNewAccount: true, temporaryPassword };
}

function generateTemporaryPassword(): string {
  return `vaija-${Math.random().toString(36).slice(2, 8)}`;
}
