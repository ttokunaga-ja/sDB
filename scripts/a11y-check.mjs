import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";
import { withStaticPreview } from "./test-server.mjs";

const routes = ["/", "/overview/", "/api/", "/notices/"];

function summarizeViolations(violations) {
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    nodes: violation.nodes.map((node) => node.target)
  }));
}

async function assertKeyboardBasics(page, baseUrl) {
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.keyboard.press("Tab");
  const firstFocus = await page.evaluate(() => ({
    id: document.activeElement?.id,
    text: document.activeElement?.textContent?.trim()
  }));
  if (!firstFocus.text?.includes("本文へスキップ")) {
    throw new Error(`Expected skip link to receive first focus, got ${JSON.stringify(firstFocus)}`);
  }

  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  const skippedTo = await page.evaluate(() => document.activeElement?.id);
  if (skippedTo !== "main-content") {
    throw new Error(`Expected skip link to move focus to main-content, got ${skippedTo}`);
  }

  await page.getByRole("link", { name: "概要" }).click();
  await page.waitForURL("**/overview/");
  await page.waitForTimeout(100);
  const routeFocus = await page.evaluate(() => document.activeElement?.id);
  if (routeFocus !== "main-content") {
    throw new Error(`Expected SPA navigation to focus main-content, got ${routeFocus}`);
  }
}

await withStaticPreview(async (baseUrl) => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const failures = [];

  try {
    for (const route of routes) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
      const results = await new AxeBuilder({ page }).analyze();
      if (results.violations.length > 0) {
        failures.push({ route, violations: summarizeViolations(results.violations) });
      }
    }

    await assertKeyboardBasics(page, baseUrl);
  } finally {
    await context.close();
    await browser.close();
  }

  if (failures.length > 0) {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify({ status: "ok", routes }, null, 2));
});
