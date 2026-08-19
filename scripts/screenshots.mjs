import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://localhost:3100";
const OUT = "/tmp/screenshots";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

async function shot(url, name) {
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log("captured", name);
}

// Homepage
await shot("/", "01-homepage");

// Registo de um cliente para ver o wizard preenchido
const email = `review_${Date.now()}@example.com`;
await page.goto(`${BASE}/register`);
await page.screenshot({ path: `${OUT}/02-register.png`, fullPage: true });
await page.fill("#full_name", "Cliente Revisão");
await page.fill("#email", email);
await page.fill("#phone", "912345678");
await page.fill("#password", "demo1234");
await page.click('button[type="submit"]');
await page.waitForURL(`${BASE}/dashboard`);
await page.screenshot({ path: `${OUT}/03-dashboard.png`, fullPage: true });

await page.goto(`${BASE}/request/new`);
await page.screenshot({ path: `${OUT}/04-wizard-step1.png`, fullPage: true });

await page.getByText("Transporte de materiais").click();
await page.getByRole("button", { name: /Seguinte/ }).click();
await page.fill("#pickup", "Braga");
await page.fill("#destination", "Guimarães");
await page.screenshot({ path: `${OUT}/05-wizard-percurso.png`, fullPage: true });
await page.getByRole("button", { name: /Seguinte/ }).click();
await page.fill("#cargoDescription", "Sofá e caixas");
await page.fill("#weight", "300");
await page.fill("#packages", "5");
await page.getByRole("button", { name: /Seguinte/ }).click();
await page.screenshot({ path: `${OUT}/06-wizard-veiculo.png`, fullPage: true });
await page.getByRole("button", { name: /Seguinte/ }).click();
await page.getByRole("button", { name: /Seguinte/ }).click();
await page.screenshot({ path: `${OUT}/07-wizard-preco.png`, fullPage: true });

await page.goto(`${BASE}/driver/application`);
await page.screenshot({ path: `${OUT}/08-driver-application.png`, fullPage: true });

console.log("DONE");
await browser.close();
