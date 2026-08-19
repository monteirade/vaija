import { chromium } from "playwright";

const BASE = "http://localhost:3100";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("[console error]", msg.text());
});

function log(step) {
  console.log(`\n=== ${step} ===`);
}

try {
  log("Registo");
  await page.goto(`${BASE}/register`);
  const email = `pedido_${Date.now()}@example.com`;
  await page.fill("#full_name", "Cliente Pedido Teste");
  await page.fill("#email", email);
  await page.fill("#phone", "912345678");
  await page.fill("#password", "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 10000 });

  log("Ir para novo pedido");
  await page.goto(`${BASE}/request/new`);

  // Passo 0: Agora + Materiais
  await page.getByText("Transporte de materiais").click();
  await page.getByRole("button", { name: /Seguinte/ }).click();

  // Passo 1: recolha/destino
  await page.fill("#pickup", "Braga");
  await page.fill("#destination", "Guimarães");
  await page.getByRole("button", { name: /Seguinte/ }).click();

  // Passo 2: carga
  await page.fill("#cargoDescription", "Sofá e caixas");
  await page.fill("#weight", "300");
  await page.fill("#packages", "5");
  await page.getByRole("button", { name: /Seguinte/ }).click();

  // Passo 3: veículo (aceitar sugestão)
  await page.getByRole("button", { name: /Seguinte/ }).click();

  // Passo 4: extras (sem ajudantes, sem passageiro)
  await page.getByRole("button", { name: /Seguinte/ }).click();

  // Passo 5: preço
  const priceText = await page.locator("text=Total").last().textContent();
  console.log("Preço visível no passo 5:", priceText);
  await page.getByRole("button", { name: /Seguinte/ }).click();

  // Passo 6: pagamento MB WAY
  await page.getByText("MB WAY").click();
  await page.fill('input[placeholder="Número de telemóvel MB WAY"]', "912345678");
  await page.getByRole("button", { name: /Confirmar pagamento/ }).click();
  await page.getByRole("button", { name: /Seguinte/ }).click();

  // Passo 7: resumo + confirmar
  await page.getByRole("button", { name: /Confirmar pedido/ }).click();
  await page.waitForURL(/\/orders\/.+/, { timeout: 10000 });
  console.log("URL após confirmar:", page.url());

  await page.waitForSelector("text=VJ-");
  const orderNumber = await page.locator("text=VJ-").first().textContent();
  console.log("Número do pedido:", orderNumber);

  const statusBadge = await page.locator("span:has-text('A procurar motorista')").first().isVisible().catch(() => false);
  console.log("Estado inicial 'A procurar motorista' visível:", statusBadge);

  log("Verificar listagem /orders");
  await page.goto(`${BASE}/orders`);
  const listedCount = await page.locator("text=VJ-").count();
  console.log("Pedidos listados:", listedCount);

  console.log("\nSMOKE TEST PEDIDO OK");
} catch (err) {
  console.error("SMOKE TEST FALHOU:", err);
  await page.screenshot({ path: "/tmp/smoke-fail.png", fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
