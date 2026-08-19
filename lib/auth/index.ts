import "server-only";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { getRepository, isDemoMode } from "@/lib/db";
import { getDemoDb } from "@/lib/db/demo/connection";
import { createSessionCookie, destroySessionCookie, readSessionCookie } from "./session";
import type { Profile, Role } from "@/types/domain";

export class AuthError extends Error {}

export interface CurrentUser {
  profile: Profile;
}

/**
 * Autenticação — modo demo.
 *
 * Em modo demo, as credenciais (email + password hash) vivem na mesma
 * tabela `profiles` do SQLite local (ver lib/db/demo/schema.sql), para
 * manter o protótipo simples e autocontido. Isto é uma simplificação
 * DELIBERADA e documentada (docs/TODO.md): num ambiente Supabase real,
 * a autenticação passa a ser feita inteiramente por `supabase.auth`
 * (Supabase Auth), que gere as credenciais separadamente em `auth.users`,
 * e este módulo passaria a delegar nele em vez de validar localmente.
 */

export async function signUp(params: {
  full_name: string;
  email: string;
  phone?: string;
  password: string;
  role?: Role;
}): Promise<CurrentUser> {
  if (!isDemoMode()) {
    throw new AuthError(
      "Registo em modo Supabase real ainda não está implementado neste protótipo — usar supabase.auth.signUp no cliente."
    );
  }
  const repo = getRepository();
  const existing = await repo.getProfileByEmail(params.email);
  if (existing) throw new AuthError("Já existe uma conta com este email.");

  const id = randomUUID();
  const password_hash = await bcrypt.hash(params.password, 10);

  const profile = await repo.createProfile({
    id,
    role: params.role ?? "customer",
    full_name: params.full_name,
    email: params.email,
    phone: params.phone ?? null,
    password_hash,
  });

  await createSessionCookie({ sub: profile.id, role: profile.role, email: profile.email });
  return { profile };
}

export async function signIn(email: string, password: string): Promise<CurrentUser> {
  if (!isDemoMode()) {
    throw new AuthError(
      "Login em modo Supabase real ainda não está implementado neste protótipo — usar supabase.auth.signInWithPassword no cliente."
    );
  }
  const repo = getRepository();
  const profile = await repo.getProfileByEmail(email);
  if (!profile) throw new AuthError("Email ou password inválidos.");

  const db = getDemoDb();
  const row = db
    .prepare("select password_hash from profiles where email = ?")
    .get(email.toLowerCase()) as { password_hash: string } | undefined;
  const valid = row && (await bcrypt.compare(password, row.password_hash));
  if (!valid) throw new AuthError("Email ou password inválidos.");

  await createSessionCookie({ sub: profile.id, role: profile.role, email: profile.email });
  return { profile };
}

export async function signOut(): Promise<void> {
  await destroySessionCookie();
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await readSessionCookie();
  if (!session) return null;
  const repo = getRepository();
  const profile = await repo.getProfileById(session.sub);
  if (!profile) return null;
  return { profile };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Não autenticado.");
  return user;
}

export async function requireRole(role: Role | Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(user.profile.role)) {
    throw new AuthError("Sem permissão para aceder a este recurso.");
  }
  return user;
}
