import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@/types/domain";

const COOKIE_NAME = "vaija_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 dias

const DEFAULT_DEV_SECRET = "troque-este-valor-em-producao";

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || DEFAULT_DEV_SECRET;
  // Em produção, nunca assinar sessões com o segredo de desenvolvimento
  // por omissão — falhar cedo e alto é preferível a emitir cookies de
  // sessão assinados com um segredo público e previsível (secção 28,
  // preparação de deploy).
  if (process.env.NODE_ENV === "production" && secret === DEFAULT_DEV_SECRET) {
    throw new Error(
      "AUTH_SECRET não está definido (ou está com o valor por omissão) em produção. " +
        "Definir uma variável de ambiente AUTH_SECRET aleatória antes do deploy — ver .env.example."
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string; // profile id
  role: Role;
  email: string;
}

export async function createSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ role: payload.role, email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS)
    .sign(getSecretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function destroySessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function readSessionCookie(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return {
      sub: payload.sub as string,
      role: payload.role as Role,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}
