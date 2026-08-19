import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Fase 8 — teste unitário do guard de produção do AUTH_SECRET
// (lib/auth/session.ts): garantir que a app se recusa a assinar/verificar
// cookies de sessão com o segredo de desenvolvimento por omissão quando
// NODE_ENV=production, para não expor sessões forjáveis num deploy real
// por esquecimento de configurar a variável de ambiente.
//
// `next/headers` só existe dentro do runtime do Next — é mockado aqui
// para permitir testar a lógica pura de `session.ts` em Node/Vitest.
const cookieStore = {
  set: vi.fn(),
  delete: vi.fn(),
  get: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

// `session.ts` importa "server-only" (marcador que só resolve para um
// módulo vazio dentro do bundler de servidor do Next, via a condição de
// exports "react-server"). Fora desse bundler — como aqui em Vitest/Node —
// resolve para a versão que lança sempre um erro, por isso é mockado.
vi.mock("server-only", () => ({}));

const originalNodeEnv = process.env.NODE_ENV;
const originalAuthSecret = process.env.AUTH_SECRET;

beforeEach(() => {
  vi.resetModules();
  cookieStore.set.mockReset();
  cookieStore.delete.mockReset();
  cookieStore.get.mockReset();
});

afterEach(() => {
  vi.stubEnv("NODE_ENV", originalNodeEnv ?? "test");
  if (originalAuthSecret === undefined) {
    delete process.env.AUTH_SECRET;
  } else {
    process.env.AUTH_SECRET = originalAuthSecret;
  }
});

describe("session — AUTH_SECRET em produção", () => {
  it("recusa criar uma sessão em produção sem AUTH_SECRET definido", async () => {
    delete process.env.AUTH_SECRET;
    vi.stubEnv("NODE_ENV", "production");
    const { createSessionCookie } = await import("./session");
    await expect(
      createSessionCookie({ sub: "user-1", role: "customer", email: "teste@vaija.pt" })
    ).rejects.toThrow(/AUTH_SECRET/);
  });

  it("recusa criar uma sessão em produção com o valor de exemplo do .env.example", async () => {
    process.env.AUTH_SECRET = "troque-este-valor-em-producao";
    vi.stubEnv("NODE_ENV", "production");
    const { createSessionCookie } = await import("./session");
    await expect(
      createSessionCookie({ sub: "user-1", role: "customer", email: "teste@vaija.pt" })
    ).rejects.toThrow(/AUTH_SECRET/);
  });

  it("cria a sessão normalmente em produção com um AUTH_SECRET real definido", async () => {
    process.env.AUTH_SECRET = "um-segredo-suficientemente-aleatorio-para-o-teste";
    vi.stubEnv("NODE_ENV", "production");
    const { createSessionCookie } = await import("./session");
    await expect(
      createSessionCookie({ sub: "user-1", role: "customer", email: "teste@vaija.pt" })
    ).resolves.toBeUndefined();
    expect(cookieStore.set).toHaveBeenCalledOnce();
  });

  it("continua a funcionar em desenvolvimento sem AUTH_SECRET definido (modo demo)", async () => {
    delete process.env.AUTH_SECRET;
    vi.stubEnv("NODE_ENV", "development");
    const { createSessionCookie } = await import("./session");
    await expect(
      createSessionCookie({ sub: "user-1", role: "customer", email: "teste@vaija.pt" })
    ).resolves.toBeUndefined();
  });
});
