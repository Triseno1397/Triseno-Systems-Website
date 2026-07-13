import { test, expect, type Page } from "@playwright/test";

/**
 * The Phase 1 acceptance gate: the site must render identically before and after
 * content is lifted out of JSX into src/content/*.json.
 *
 * Capture the baseline on the pre-refactor tree (`npx playwright test --update-snapshots`),
 * then run it again after the refactor. Any diff is a fidelity bug.
 *
 * Two things are masked, both because they are non-deterministic and neither is content:
 *  - <video>: decodes at its own pace, so an unmasked frame is flaky for reasons
 *    unrelated to the refactor.
 *  - .foot-marq: the marquee band (aria-hidden, purely decorative). Its rAF loop bails
 *    under prefers-reduced-motion, but the offset it comes to rest at depends on when
 *    hydration lands, so it is not reproducible run to run. Its *words* are asserted in
 *    content.spec.ts instead, which is what actually matters here.
 */

const ROUTES = [
  { path: "/", name: "home-portal" },
  { path: "/studio", name: "studio" },
  { path: "/portfolio", name: "work" },
  { path: "/contact", name: "contact" },
] as const;

const WIDTHS = [
  { w: 390, h: 844, name: "mobile" },
  { w: 768, h: 1024, name: "tablet" },
  { w: 1440, h: 900, name: "desktop" },
] as const;

/** Park the page in a stable end-state before shooting it. */
async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);

  await page.evaluate(() => {
    // Freeze every clip at frame 0 so the masks sit over identical geometry each run.
    document.querySelectorAll("video").forEach((v) => {
      v.pause();
      v.currentTime = 0;
    });
  });

  // Let the reduced-motion end-state (GSAP gsap.set, Framer initial→animate) flush.
  await page.waitForTimeout(800);
}

for (const route of ROUTES) {
  for (const vp of WIDTHS) {
    test(`${route.name} @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.goto(route.path);
      await settle(page);

      await expect(page).toHaveScreenshot(`${route.name}-${vp.name}.png`, {
        fullPage: true,
        mask: [page.locator("video"), page.locator(".foot-marq")],
      });
    });
  }
}
