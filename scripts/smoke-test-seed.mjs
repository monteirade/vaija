import { chromium } from "playwright";

const BASE = "http://localhost:3100";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function checkLogin(email, password, expectedUrl, label) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}${expectedUrl}`, { timeout: 10000 });
  console.log(`${label}: login OK -> ${page.url()}`);
  const bodyText = await page.locator("body").innerText();
  await ctx.close();
  return bodyText;
}

try {
  await checkLogin("admin@vaija.pt", "admin1234", "/admin", "Admin");
  const customerBody = await checkLogin("cliente@vaija.pt", "cliente1234", "/dashboard", "Cliente demo");
  console.log("Contém 'Cliente Demo'?", customerBody.includes("Cliente"));

  const driverBody = await checkLogin("passos@vaija.pt", "motorista1234", "/driver", "Passos Dias Aguiar");
  console.log("Painel motorista contém 'Passos'?", driverBody.includes("Passos"));

  // Verificar contadores no admin
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill("#email", "admin@vaija.pt");
  await page.fill("#password", "admin1234");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/admin`);
  const adminBody = await page.locator("body").innerText();
  console.log("\n--- Resumo admin ---");
  console.log(adminBody);
  await ctx.close();

  console.log("\nSMOKE TEST SEED OK");
} catch (err) {
  console.error("SMOKE TEST FALHOU:", err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
