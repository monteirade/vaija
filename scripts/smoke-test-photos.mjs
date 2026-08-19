import { chromium } from "playwright";

const BASE = "http://localhost:3100";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();

try {
  await page.goto(`${BASE}/register`);
  const email = `fotos_${Date.now()}@example.com`;
  await page.fill("#full_name", "Cliente Fotos Teste");
  await page.fill("#email", email);
  await page.fill("#phone", "912345678");
  await page.fill("#password", "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 10000 });

  await page.goto(`${BASE}/request/new`);
  await page.getByText("Transporte de materiais").click();
  await page.getByRole("button", { name: /Seguinte/ }).click();
  await page.fill("#pickup", "Porto");
  await page.fill("#destination", "Aveiro");
  await page.getByRole("button", { name: /Seguinte/ }).click();

  await page.fill("#cargoDescription", "Materiais diversos");
  await page.fill("#weight", "200");
  await page.fill("#packages", "3");

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles("/tmp/test-photo.jpg");
  await page.waitForTimeout(1500);

  const thumbCount = await page.locator("img[alt='test-photo.jpg']").count();
  console.log("Miniaturas de foto após upload:", thumbCount);

  // remover
  await page.hover("img[alt='test-photo.jpg']");
  await page.locator("button[aria-label='Remover foto']").click();
  const thumbCountAfterRemove = await page.locator("img[alt='test-photo.jpg']").count();
  console.log("Miniaturas após remover:", thumbCountAfterRemove);

  console.log("\nSMOKE TEST FOTOS OK");
} catch (err) {
  console.error("SMOKE TEST FALHOU:", err);
  await page.screenshot({ path: "/tmp/smoke-photo-fail.png" }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
