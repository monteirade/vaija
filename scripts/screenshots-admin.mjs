import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://localhost:3100";
const OUT = "/tmp/screenshots";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(`${BASE}/login`);
await page.fill("#email", "admin@vaija.pt");
await page.fill("#password", "admin1234");
await page.click('button[type="submit"]');
await page.waitForURL(`${BASE}/admin`);
await page.screenshot({ path: `${OUT}/10-admin-resumo.png`, fullPage: true });

await page.goto(`${BASE}/admin/orders`);
await page.screenshot({ path: `${OUT}/11-admin-orders.png`, fullPage: true });

await page.goto(`${BASE}/admin/drivers`);
await page.screenshot({ path: `${OUT}/12-admin-drivers.png`, fullPage: true });

console.log("done");
await browser.close();
