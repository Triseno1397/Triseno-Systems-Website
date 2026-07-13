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
    ...devices["Desktop Chrome"],
    baseURL: process.env.BASE_URL ?? "http://localhost:3111",
    // NOT a top-level `use` key — Playwright only reads reducedMotion from
    // contextOptions. Setting it at the top level type-errors and is silently
    // ignored at runtime, which quietly leaves every animation running and makes
    // the whole suite flaky for reasons that look unrelated.
    contextOptions: { reducedMotion: "reduce" },
  },
  webServer: {
    command: "npx next start -p 3111",
    url: "http://localhost:3111",
    // Deliberately false. Reusing a server means that after any rebuild the suite can
    // silently attach to a process still serving the PREVIOUS build — old chunks, old
    // routes. The symptoms (routes 404ing, chunk-load failures, phantom 500s) look
    // exactly like application bugs and send you debugging code that is already
    // correct. Always start a server against the build under test.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
