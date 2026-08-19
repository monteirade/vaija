import { chromium } from "playwright";

const BASE = "http://localhost:3100";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();

function log(step) {
  console.log(`\n=== ${step} ===`);
}

try {
  log("Homepage");
  await page.goto(BASE);
  console.log("title:", await page.title());

  log("Registo de cliente");
  await page.goto(`${BASE}/register`);
  const email = `cliente_${Date.now()}@example.com`;
  await page.fill("#full_name", "Cliente Demo Playwright");
  await page.fill("#email", email);
  await page.fill("#phone", "912345678");
  await page.fill("#password", "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 10000 });
  console.log("URL após registo:", page.url());
  console.log("Contém saudação:", await page.locator("h1").textContent());

  log("Logout");
  await page.click('button:has-text("Sair")');
  await page.waitForURL(`${BASE}/`, { timeout: 10000 });
  console.log("URL após logout:", page.url());

  log("Login com a mesma conta");
  await page.goto(`${BASE}/login`);
  await page.fill("#email", email);
  await page.fill("#password", "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 10000 });
  console.log("URL após login:", page.url());

  console.log("\nSMOKE TEST OK");
} catch (err) {
  console.error("SMOKE TEST FALHOU:", err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
