import { defineConfig, devices } from "@playwright/test";

/**
 * Visual-regression harness. Its one job is to prove that lifting content out of
 * JSX into src/content/*.json did not change a single pixel.
 *
 * Determinism is the whole game here:
 *  - reducedMotion kills every GSAP/Framer/CSS animation (the site honours it),
 *    so a screenshot is a stable end-state rather than a race against a timeline.
 *  - <video> elements are masked in the spec: decode timing varies per run, so an
 *    unmasked frame would make every comparison flaky for reasons unrelated to content.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 60_000,
  expect: {
    toHaveScreenshot: {
      // Anti-aliasing on gradient text differs by a hair between runs; a handful
      // of pixels is noise. A real content regression moves thousands.
      maxDiffPixelRatio: 0.002,
      animations: "disabled",
      caret: "hide",
    },
  },
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3111",
    reducedMotion: "reduce",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npx next start -p 3111",
    url: "http://localhost:3111",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
