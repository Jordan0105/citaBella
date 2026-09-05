/**
 * Verificación de presupuestos de performance contra el build de PRODUCCIÓN.
 *
 * Uso:
 *   pnpm build && pnpm start          (en otra terminal, o background)
 *   node scripts/perf-check.mjs http://localhost:3000
 *
 * Presupuestos (instructions/performance.md): LCP < 2.5s · CLS < 0.1.
 */
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3000";
const LCP_BUDGET_MS = 2500;
const CLS_BUDGET = 0.1;
const JS_BUDGET_BYTES = 600_000; // sin comprimir (gzip reduce ~3x)

let failed = 0;

function report(name, value, budget, unit, lowerIsBetter = true) {
  const pass = lowerIsBetter ? value <= budget : value >= budget;
  if (!pass) failed++;
  console.log(
    `  ${pass ? "✓" : "✗"} ${name}: ${value}${unit} (presupuesto: ${budget}${unit})`,
  );
}

async function measure(browser, path) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const page = await context.newPage();

  let jsBytes = 0;
  page.on("response", async (res) => {
    if (res.request().resourceType() === "script") {
      try {
        jsBytes += (await res.body()).length;
      } catch {
        /* body no disponible */
      }
    }
  });

  await page.addInitScript(() => {
    window.__lcp = 0;
    window.__cls = 0;
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      window.__lcp = entries[entries.length - 1]?.startTime ?? 0;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  await page.goto(base + path, { waitUntil: "networkidle", timeout: 60_000 });
  // Dar un momento para el último LCP/shift
  await page.waitForTimeout(500);
  const metrics = await page.evaluate(() => ({
    lcp: window.__lcp,
    cls: window.__cls,
  }));

  console.log(`\n${path}`);
  report("LCP", Math.round(metrics.lcp), LCP_BUDGET_MS, "ms");
  report("CLS", Number(metrics.cls.toFixed(3)), CLS_BUDGET, "");
  report("JS total (sin comprimir)", jsBytes, JS_BUDGET_BYTES, "B");

  await context.close();
}

const browser = await chromium.launch();
await measure(browser, "/login");
await measure(browser, "/");
await browser.close();

console.log(
  `\n════ Perf: ${failed === 0 ? "DENTRO de presupuestos ✓" : `${failed} presupuesto(s) excedido(s) ✗`} ════`,
);
process.exit(failed > 0 ? 1 : 0);
