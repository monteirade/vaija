"use server";

import { redirect } from "next/navigation";
import { signIn, signUp, signOut, AuthError } from "./index";

export interface AuthFormState {
  error?: string;
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const next = String(formData.get("next") ?? "");

  try {
    const { profile } = await signIn(email, password);
    if (next && next.startsWith("/")) redirect(next);
    redirectForRole(profile.role);
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    if (isRedirectError(err)) throw err;
    return { error: "Ocorreu um erro inesperado. Tente novamente." };
  }
  return {};
}

export async function registerAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const full_name = String(formData.get("full_name") ?? "");
  const email = String(formData.get("email") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const password = String(formData.get("password") ?? "");

  if (password.length < 6) {
    return { error: "A password deve ter pelo menos 6 caracteres." };
  }

  try {
    await signUp({ full_name, email, phone, password, role: "customer" });
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    if (isRedirectError(err)) throw err;
    return { error: "Ocorreu um erro inesperado. Tente novamente." };
  }
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await signOut();
  redirect("/");
}

function redirectForRole(role: string): never {
  if (role === "admin") redirect("/admin");
  if (role === "driver") redirect("/driver");
  redirect("/dashboard");
}

function isRedirectError(err: unknown): boolean {
  if (typeof err !== "object" || err === null || !("digest" in err)) return false;
  return String((err as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");
}
