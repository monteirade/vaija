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
  // ---- Cliente cria pedido ----
  const customerCtx = await browser.newContext();
  const customerPage = await customerCtx.newPage();
  const customerEmail = `cliente_gps_${Date.now()}@example.com`;

  log("Cliente cria pedido");
  await customerPage.goto(`${BASE}/register`);
  await customerPage.fill("#full_name", "Cliente GPS Teste");
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
  await customerPage.fill("#cargoDescription", "Materiais");
  await customerPage.fill("#weight", "300");
  await customerPage.fill("#packages", "1");
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

  // ---- Mapa renderiza sem crashar ----
  await customerPage.waitForSelector(".leaflet-container", { timeout: 10000 });
  console.log("Mapa (Leaflet) renderizado no tracker do cliente: OK");

  // ---- Motorista: candidatura + aprovação ----
  log("Motorista: candidatura e aprovação");
  const driverEmail = `motorista_gps_${Date.now()}@example.com`;
  const driverCtx = await browser.newContext({ permissions: ["geolocation"], geolocation: { latitude: 41.1579, longitude: -8.6291 } });
  const driverPage = await driverCtx.newPage();
  await driverPage.goto(`${BASE}/driver/application`);
  await driverPage.fill("#full_name", "Motorista GPS Teste");
  await driverPage.fill("#email", driverEmail);
  await driverPage.fill("#phone", "913000000");
  await driverPage.fill("#vehicle_capacity", "700");
  await driverPage.fill("#vehicle_make", "Ford");
  await driverPage.fill("#vehicle_model", "Transit");
  await driverPage.fill("#vehicle_registration", "GP-01-SS");
  await driverPage.fill("#service_area", "Porto e Braga");
  await driverPage.fill("#availability", "Sempre");
  await driverPage.click('button[type="submit"]');
  await driverPage.waitForSelector("text=Candidatura recebida.", { timeout: 10000 });

  const db = new Database(DB_PATH, { readonly: true });
  const application = db.prepare("select id from driver_applications where email = ?").get(driverEmail);
  db.close();

  const adminCtx = await browser.newContext();
  const adminPage = await adminCtx.newPage();
  await adminPage.goto(`${BASE}/login`);
  await adminPage.fill("#email", "admin@vaija.pt");
  await adminPage.fill("#password", "admin1234");
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForURL(`${BASE}/admin`, { timeout: 10000 });
  const approveRes = await adminPage.request.post(`${BASE}/api/admin/driver-applications/${application.id}/approve`);
  const approveData = await approveRes.json();
  if (!approveRes.ok()) throw new Error("Falha ao aprovar candidatura.");

  log("Motorista: login, aceitar pedido, permitir localização");
  await driverPage.goto(`${BASE}/login`);
  await driverPage.fill("#email", driverEmail);
  await driverPage.fill("#password", approveData.temporaryPassword);
  await driverPage.click('button[type="submit"]');
  await driverPage.waitForURL(`${BASE}/driver`, { timeout: 10000 });

  await driverPage.goto(`${BASE}/driver/orders/${orderId}`);
  await driverPage.getByRole("button", { name: "Aceitar pedido" }).waitFor({ state: "visible", timeout: 10000 });
  await driverPage.getByRole("button", { name: "Aceitar pedido" }).click();
  await driverPage.waitForTimeout(1000);

  await driverPage.waitForSelector(".leaflet-container", { timeout: 10000 });
  console.log("Mapa (Leaflet) renderizado no ecrã do motorista: OK");

  await driverPage.getByRole("button", { name: "Permitir localização" }).click();
  await driverPage.waitForSelector("text=A partilhar localização", { timeout: 10000 });
  console.log("Partilha de localização ativada");

  // A app envia a cada 6s (throttle) — esperar um ciclo.
  await driverPage.waitForTimeout(7000);

  const db2 = new Database(DB_PATH, { readonly: true });
  const driverProfileRow = db2.prepare("select id from driver_profiles where user_id = ?").get(approveData.userId);
  const locationCount = db2.prepare("select count(*) as c from driver_locations where driver_id = ?").get(driverProfileRow.id);
  console.log("Localizações registadas na base de dados:", locationCount.c);
  db2.close();
  if (locationCount.c < 1) throw new Error("Nenhuma localização foi registada.");

  // ---- Cliente vê marcador do motorista via polling ----
  log("Cliente: verificar receção da localização");
  await customerPage.waitForTimeout(5000);
  const markerCount = await customerPage.locator(".leaflet-marker-icon").count();
  console.log("Marcadores no mapa do cliente (esperado >= 2, pickup+destino, idealmente 3 com motorista):", markerCount);

  // ---- Notificações ----
  log("Cliente: verificar notificações");
  const bellBadge = await customerPage.locator("button[aria-label='Notificações'] span").first().isVisible().catch(() => false);
  console.log("Badge de notificações não lidas visível:", bellBadge);

  console.log("\nSMOKE TEST GPS/MAPA/NOTIFICAÇÕES OK");
} catch (err) {
  console.error("SMOKE TEST FALHOU:", err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
