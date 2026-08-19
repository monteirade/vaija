import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente Supabase com privilégios de service role, usado apenas no
// servidor (API routes / server actions) para operações que precisam de
// contornar RLS de forma controlada (ex: admin). Operações normais devem
// idealmente usar um cliente autenticado com o token do utilizador para
// que a RLS definida em supabase/migrations/0001_init.sql seja aplicada.

let cachedClient: SupabaseClient | null = null;

export function getSupabaseServiceClient(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE não configurado: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local"
    );
  }
  cachedClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedClient;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
