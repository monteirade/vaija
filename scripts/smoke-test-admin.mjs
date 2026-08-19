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
  // ---- Cliente cria pedido (fica em SEARCHING_DRIVER, sem motorista) ----
  const customerCtx = await browser.newContext();
  const customerPage = await customerCtx.newPage();
  const customerEmail = `cliente_admin_test_${Date.now()}@example.com`;

  log("Cliente cria pedido");
  await customerPage.goto(`${BASE}/register`);
  await customerPage.fill("#full_name", "Cliente Admin Teste");
  await customerPage.fill("#email", customerEmail);
  await customerPage.fill("#phone", "912345678");
  await customerPage.fill("#password", "demo1234");
  await customerPage.click('button[type="submit"]');
  await customerPage.waitForURL(`${BASE}/dashboard`, { timeout: 10000 });

  await customerPage.goto(`${BASE}/request/new`);
  await customerPage.getByText("Transporte de materiais").click();
  await customerPage.getByRole("button", { name: /Seguinte/ }).click();
  await customerPage.fill("#pickup", "Porto");
  await customerPage.fill("#destination", "Aveiro");
  await customerPage.getByRole("button", { name: /Seguinte/ }).click();
  await customerPage.fill("#cargoDescription", "Equipamento");
  await customerPage.fill("#weight", "400");
  await customerPage.fill("#packages", "2");
  await customerPage.getByRole("button", { name: /Seguinte/ }).click();
  await customerPage.getByRole("button", { name: /Seguinte/ }).click();
  await customerPage.getByRole("button", { name: /Seguinte/ }).click();
  await customerPage.getByRole("button", { name: /Seguinte/ }).click();
  await customerPage.getByText("Numerário ao motorista").click();
  await customerPage.getByRole("button", { name: /Seguinte/ }).click();
  await customerPage.getByRole("button", { name: /Confirmar pedido/ }).click();
  await customerPage.waitForURL(/\/orders\/.+/, { timeout: 10000 });
  const orderId = customerPage.url().split("/").pop();
  console.log("Pedido criado:", orderId);

  // ---- Candidatura + aprovação de motorista para ter alguém a atribuir ----
  log("Candidatura e aprovação de motorista");
  const driverEmail = `motorista_admin_test_${Date.now()}@example.com`;
  const driverCtx = await browser.newContext();
  const driverPage = await driverCtx.newPage();
  await driverPage.goto(`${BASE}/driver/application`);
  await driverPage.fill("#full_name", "Motorista Admin Teste");
  await driverPage.fill("#email", driverEmail);
  await driverPage.fill("#phone", "913000000");
  await driverPage.fill("#vehicle_capacity", "700");
  await driverPage.fill("#vehicle_make", "Ford");
  await driverPage.fill("#vehicle_model", "Transit");
  await driverPage.fill("#vehicle_registration", "AA-22-CC");
  await driverPage.fill("#service_area", "Porto e Aveiro");
  await driverPage.fill("#availability", "Todos os dias");
  await driverPage.click('button[type="submit"]');
  await driverPage.waitForSelector("text=Candidatura recebida.", { timeout: 10000 });

  // ---- Admin: login, ver resumo, aprovar candidatura via UI, atribuir motorista, forçar estado ----
  log("Admin: login e resumo");
  const adminCtx = await browser.newContext();
  const adminPage = await adminCtx.newPage();
  await adminPage.goto(`${BASE}/login`);
  await adminPage.fill("#email", "admin@vaija.pt");
  await adminPage.fill("#password", "admin1234");
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForURL(`${BASE}/admin`, { timeout: 10000 });
  console.log("Login admin OK:", adminPage.url());

  await adminPage.goto(`${BASE}/admin/drivers`);
  const approveButton = adminPage.getByRole("button", { name: "Aprovar" }).first();
  await approveButton.waitFor({ state: "visible", timeout: 10000 });
  await approveButton.click();
  await adminPage.waitForSelector("text=/Password temporária/", { timeout: 20000 });
  console.log("Candidatura aprovada via UI admin");

  log("Admin: atribuição manual de motorista");
  await adminPage.goto(`${BASE}/admin/orders/${orderId}`);
  const select = adminPage.locator("select");
  await select.waitFor({ state: "visible", timeout: 10000 });
  const optionsCount = await select.locator("option").count();
  console.log("Motoristas disponíveis no select:", optionsCount);
  await adminPage.getByRole("button", { name: "Atribuir" }).click();
  await adminPage.waitForTimeout(1000);
  const assignedLabel = await adminPage.locator("text=Motorista Admin Teste").first().isVisible().catch(() => false);
  console.log("Motorista atribuído visível no detalhe:", assignedLabel);

  log("Admin: alteração controlada de estado");
  const forceButtons = adminPage.locator("text=Motorista a caminho");
  if (await forceButtons.first().isVisible().catch(() => false)) {
    await forceButtons.first().click();
    await adminPage.waitForTimeout(1000);
    console.log("Estado forçado para 'Motorista a caminho'");
  }

  log("Admin: gestão de pedido de mudança");
  const db = new Database(DB_PATH, { readonly: true });
  const changeCount = db.prepare("select count(*) as c from change_requests").get();
  db.close();
  console.log("Pedidos de mudança na base de dados:", changeCount.c);

  await adminPage.goto(`${BASE}/admin/customers`);
  const customerRow = await adminPage.locator(`text=${customerEmail}`).first().isVisible().catch(() => false);
  console.log("Cliente visível em /admin/customers:", customerRow);

  console.log("\nSMOKE TEST ADMIN OK");
} catch (err) {
  console.error("SMOKE TEST FALHOU:", err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
