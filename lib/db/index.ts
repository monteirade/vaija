import "server-only";
import type { DataRepository } from "./repository";
import { DemoRepository } from "./demo/store";
import { SupabaseRepository } from "./supabase/store";

// Ponto único de seleção do adaptador de dados. Se existirem credenciais
// Supabase no ambiente, usa Postgres real (com RLS). Caso contrário, usa o
// adaptador demo local (SQLite), que implementa exatamente a mesma
// interface. Nenhum código de página/rota deve importar diretamente os
// adaptadores concretos — importar sempre `getRepository()` a partir daqui.

let cached: DataRepository | null = null;

export function getRepository(): DataRepository {
  if (cached) return cached;

  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  cached = hasSupabase ? new SupabaseRepository() : new DemoRepository();

  return cached!;
}

export function isDemoMode(): boolean {
  return !(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export * from "./repository";
