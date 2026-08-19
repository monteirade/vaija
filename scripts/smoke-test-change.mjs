import { chromium } from "playwright";

const BASE = "http://localhost:3100";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();

try {
  await page.goto(`${BASE}/register`);
  const email = `mudanca_${Date.now()}@example.com`;
  await page.fill("#full_name", "Cliente Mudanca Teste");
  await page.fill("#email", email);
  await page.fill("#phone", "912345678");
  await page.fill("#password", "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 10000 });

  await page.goto(`${BASE}/change/new`);
  await page.fill("#pickup", "Porto");
  await page.fill("#destination", "Aveiro");
  await page.fill("#description", "Mudança de apartamento T2");
  await page.fill("#helpersCount", "2");
  await page.click('button[type="submit"]');
  await page.waitForSelector("text=Pedido recebido.", { timeout: 10000 });
  console.log("Confirmação de pedido de mudança visível: OK");

  console.log("\nSMOKE TEST MUDANCA OK");
} catch (err) {
  console.error("SMOKE TEST FALHOU:", err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
