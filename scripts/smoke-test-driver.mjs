import { chromium } from "playwright";
import Database from "better-sqlite3";
import path from "node:path";

const BASE = "http://localhost:3100";
const DB_PATH = path.join(process.cwd(), "data", "demo.sqlite3");

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

function log(step) {
  console.log(`\n=== ${step} ===`);
}

try {
  // ---- 1. Cliente cria um pedido ----
  const customerCtx = await browser.newContext();
  const customerPage = await customerCtx.newPage();
  const customerEmail = `cliente_driver_test_${Date.now()}@example.com`;

  log("Cliente: registo e criação de pedido");
  await customerPage.goto(`${BASE}/register`);
  await customerPage.fill("#full_name", "Cliente Teste Motorista");
  await customerPage.fill("#email", customerEmail);
  await customerPage.fill("#phone", "912345678");
  await customerPage.fill("#password", "demo1234");
  await customerPage.click('button[type="submit"]');
  await customerPage.waitForURL(`${BASE}/dashboard`, { timeout: 10000 });

  await customerPage.goto(`${BASE}/request/new`);
  await customerPage.getByText("Transporte de materiais").click();
  await customerPage.getByRole("button", { name: /Seguinte/ }).click();
  await customerPage.fill("#pickup", "Porto");
  await customerPage.fill("#destination", "Braga");
  await customerPage.getByRole("button", { name: /Seguinte/ }).click();
  await customerPage.fill("#cargoDescription", "Materiais de obra");
  await customerPage.fill("#weight", "500");
  await customerPage.fill("#packages", "2");
  await customerPage.getByRole("button", { name: /Seguinte/ }).click();
  await customerPage.getByRole("button", { name: /Seguinte/ }).click(); // veículo (van sugerida)
  await customerPage.getByRole("button", { name: /Seguinte/ }).click(); // extras
  await customerPage.getByRole("button", { name: /Seguinte/ }).click(); // preço
  await customerPage.getByText("Numerário ao motorista").click();
  await customerPage.getByRole("button", { name: /Seguinte/ }).click(); // pagamento -> resumo
  await customerPage.getByRole("button", { name: /Confirmar pedido/ }).click();
  await customerPage.waitForURL(/\/orders\/.+/, { timeout: 10000 });
  const orderUrl = customerPage.url();
  const orderId = orderUrl.split("/").pop();
  console.log("Pedido criado:", orderId);

  // ---- 2. Candidatura de motorista (pública) ----
  log("Motorista: candidatura");
  const driverCtx = await browser.newContext();
  const driverPage = await driverCtx.newPage();
  const driverEmail = `motorista_teste_${Date.now()}@example.com`;
  await driverPage.goto(`${BASE}/driver/application`);
  await driverPage.fill("#full_name", "Motorista Teste");
  await driverPage.fill("#email", driverEmail);
  await driverPage.fill("#phone", "913000000");
  await driverPage.fill("#vehicle_capacity", "700");
  await driverPage.fill("#vehicle_make", "Ford");
  await driverPage.fill("#vehicle_model", "Transit");
  await driverPage.fill("#vehicle_registration", "AA-11-BB");
  await driverPage.fill("#service_area", "Porto e Braga");
  await driverPage.fill("#availability", "Dias úteis");
  await driverPage.click('button[type="submit"]');
  await driverPage.waitForSelector("text=Candidatura recebida.", { timeout: 10000 });
  console.log("Candidatura submetida:", driverEmail);

  // ---- 3. Admin aprova a candidatura ----
  log("Admin: aprovar candidatura");
  const db = new Database(DB_PATH, { readonly: true });
  const application = db.prepare("select id from driver_applications where email = ?").get(driverEmail);
  db.close();
  if (!application) throw new Error("Candidatura não encontrada na base de dados.");

  const adminCtx = await browser.newContext();
  const adminPage = await adminCtx.newPage();
  await adminPage.goto(`${BASE}/login`);
  await adminPage.fill("#email", "admin@vaija.pt");
  await adminPage.fill("#password", "admin1234");
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForTimeout(1500); // /admin ainda não existe (Fase 4) — esperar o redirect assentar

  const approveRes = await adminPage.request.post(`${BASE}/api/admin/driver-applications/${application.id}/approve`);
  const approveData = await approveRes.json();
  console.log("Resposta de aprovação:", approveRes.status(), approveData);
  if (!approveRes.ok()) throw new Error("Falha ao aprovar candidatura.");
  const temporaryPassword = approveData.temporaryPassword;

  // ---- 4. Motorista faz login e vê o painel ----
  log("Motorista: login após aprovação");
  await driverPage.goto(`${BASE}/login`);
  await driverPage.fill("#email", driverEmail);
  await driverPage.fill("#password", temporaryPassword);
  await driverPage.click('button[type="submit"]');
  await driverPage.waitForURL(`${BASE}/driver`, { timeout: 10000 });
  console.log("Login motorista OK, URL:", driverPage.url());

  const pendingMsg = await driverPage.locator("text=Candidatura em análise").isVisible().catch(() => false);
  console.log("Mensagem 'candidatura em análise' visível (deve ser false):", pendingMsg);

  await driverPage.getByRole("button", { name: "Disponível" }).click();
  await driverPage.waitForTimeout(500);

  const orderCard = await driverPage.locator(`text=Porto → Braga`).first().isVisible().catch(() => false);
  console.log("Pedido disponível visível no dashboard do motorista:", orderCard);

  // ---- 5. Motorista aceita e avança estados ----
  log("Motorista: aceitar e avançar estados");
  await driverPage.goto(`${BASE}/driver/orders/${orderId}`);
  await driverPage.getByRole("button", { name: "Aceitar pedido" }).waitFor({ state: "visible", timeout: 10000 });
  await driverPage.getByRole("button", { name: "Aceitar pedido" }).click();

  const statusSequence = ["A caminho", "Cheguei", "Carga recolhida", "Confirmar carga carregada", "Iniciar transporte", "Entregue"];
  for (const label of statusSequence) {
    const btn = driverPage.getByRole("button", { name: label });
    await btn.waitFor({ state: "visible", timeout: 10000 });
    await btn.click();
    console.log(`Avançado: ${label}`);
  }

  await driverPage.waitForTimeout(500);
  const driverStatusText = await driverPage.locator("[data-order-status]").first().textContent().catch(() => null);
  console.log("Estado final no motorista (badge):", driverStatusText);

  // ---- 6. Cliente vê a atualização (polling) ----
  log("Cliente: verificar atualização em tempo real (polling)");
  await customerPage.goto(orderUrl);
  await customerPage.locator("[data-order-status]").first().waitFor({ timeout: 5000 }).catch(() => {});
  const customerStatusText = await customerPage.locator("[data-order-status]").first().textContent().catch(() => null);
  console.log("Estado visto pelo cliente (badge):", customerStatusText);
  if (customerStatusText !== "Entregue") {
    // pode ainda não ter feito polling — esperar um ciclo (4s) e tentar de novo
    await customerPage.waitForTimeout(4500);
    const retry = await customerPage.locator("[data-order-status]").first().textContent().catch(() => null);
    console.log("Estado visto pelo cliente após novo polling:", retry);
  }

  console.log("\nSMOKE TEST MOTORISTA OK");
} catch (err) {
  console.error("SMOKE TEST FALHOU:", err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
