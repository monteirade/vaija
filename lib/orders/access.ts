import type { CurrentUser } from "@/lib/auth";
import { getRepository } from "@/lib/db";
import type { Order } from "@/types/domain";

// Verificação de autorização ao nível da aplicação (usada em modo demo,
// sem RLS do Postgres). Em modo Supabase, a RLS de
// supabase/migrations/0001_init.sql é a linha de defesa principal — isto é
// uma segunda camada, nunca a única (secção 6 da especificação).
export async function canAccessOrder(user: CurrentUser, order: Order): Promise<boolean> {
  if (user.profile.role === "admin") return true;
  if (order.customer_id === user.profile.id) return true;
  if (user.profile.role === "driver") {
    const repo = getRepository();
    const driverProfile = await repo.getDriverProfileByUserId(user.profile.id);
    if (driverProfile && order.driver_id === driverProfile.id) return true;
  }
  return false;
}
