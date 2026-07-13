import { test, expect, type Page } from "@playwright/test";

/**
 * Drives the editor the way the brother will: unlock → sign in → change a reel →
 * watch the live preview update → reorder → see the real page reorder.
 *
 * Status codes prove the door is locked. This proves the tool actually works.
 */

const UNLOCK_KEY = process.env.EDIT_UNLOCK_KEY ?? "9b1d1be79954f3860026be49f6490725";
const PIN = "1397";

/** Sign in. Each test gets a fresh browser context, so localStorage starts empty. */
async function signIn(page: Page) {
  await page.goto(`/edit/unlock?k=${UNLOCK_KEY}`);
  await expect(page).toHaveURL(/\/edit\/login/);

  await page.fill('input[type="password"]', PIN);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/edit$/);

  await expect(page.locator(".cms-rail-head")).toContainText("Reels");
  await expect(page.locator(".cms-item")).toHaveCount(9);
}

test("edit a reel and the live preview updates", async ({ page }) => {
  await signIn(page);

  await expect(page.locator(".cms-item").first()).toContainText("HyperMotion Ads");

  // The preview is the real Studio page, not a mock.
  const frame = page.frameLocator(".cms-frame");
  await expect(frame.locator("h1")).toContainText("Video that sells");
  await expect(frame.locator('[data-cms-id="studio:reel:0"]')).toContainText("HyperMotion Ads");

  // Rename it; it should land in the preview with no reload.
  const title = page.locator(".cms-pane input.cms-input").first();
  await expect(title).toHaveValue("HyperMotion Ads");
  await title.fill("Kinetic Ads");

  await expect(frame.locator('[data-cms-id="studio:reel:0"]')).toContainText("Kinetic Ads");
  await expect(page.locator(".cms-item").first()).toContainText("Kinetic Ads");
});

test("reordering a reel reorders the real page", async ({ page }) => {
  await signIn(page);

  const frame = page.frameLocator(".cms-frame");
  await expect(frame.locator('[data-cms-id="studio:reel:0"]')).toContainText("HyperMotion Ads");

  // Move the second reel (Product Hero) up.
  const second = page.locator(".cms-item").nth(1);
  await expect(second).toContainText("Product Hero");
  await second.hover();
  await second.locator('button[aria-label^="Move"]').first().click();

  await expect(page.locator(".cms-item").first()).toContainText("Product Hero");
  await expect(frame.locator('[data-cms-id="studio:reel:0"]')).toContainText("Product Hero");
});

test("the Work gallery renders from the same library", async ({ page }) => {
  await signIn(page);

  await page.click('.cms-tab:has-text("Work")');

  const frame = page.frameLocator(".cms-frame");
  // Nine tiles: the Work page splits Product Demo into two, and drops Brand Films
  // (which has no clip) — so the count matching 9 is a real check of the projection.
  await expect(frame.locator(".work-tile")).toHaveCount(9);
  await expect(frame.locator("h1")).toContainText("Proof in the");
});

test("an unpublished draft survives a reload", async ({ page }) => {
  await signIn(page);

  await page.locator(".cms-pane input.cms-input").first().fill("Kinetic Ads");
  await expect(page.locator(".cms-badge-warn")).toContainText("Unpublished changes");

  await page.reload();

  // The draft lives in localStorage — it must come back, or he loses work to a stray
  // refresh, which is the fastest way to make someone stop trusting a tool.
  await expect(page.locator(".cms-item").first()).toContainText("Kinetic Ads");
  await expect(page.locator(".cms-badge-warn")).toContainText("Unpublished changes");

  // Discard puts him back to what is actually published.
  await page.click(".cms-link-danger");
  await expect(page.locator(".cms-item").first()).toContainText("HyperMotion Ads");
  await expect(page.locator(".cms-badge-warn")).toHaveCount(0);
});

test("the PIN cannot be reached without the unlock key", async ({ request }) => {
  // The login endpoint has no layout, so it is reachable directly. If it accepted PIN
  // guesses from anyone, the whole scheme would reduce to brute-forcing 10,000 numbers.
  // Requiring the unlock cookie here is what makes the short PIN defensible.
  const res = await request.post("/api/cms/auth/login", {
    headers: { "x-triseno-cms": "1" },
    data: { pin: "1397" },
  });

  expect(res.status()).toBe(404); // not 401 — give an attacker no signal at all
});
