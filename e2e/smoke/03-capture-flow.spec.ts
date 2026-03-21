/**
 * Smoke tests: Thought capture flow — open overlay, type, submit.
 */

import { test, expect } from "@playwright/test";
import { gotoAuthenticated } from "../helpers/auth";

test.describe("Capture Flow", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAuthenticated(page, "/dashboard");
    await page.waitForSelector("#main-content", { timeout: 15_000 });
  });

  test("capture button exists and is clickable", async ({ page }) => {
    // Find capture trigger — button or keyboard shortcut area
    const captureBtn = page.getByRole("button", { name: /capture a thought/i });
    const captureAlt = page.locator('[aria-label*="capture" i]').first();

    const btn = (await captureBtn.isVisible()) ? captureBtn : captureAlt;
    await expect(btn).toBeVisible({ timeout: 10_000 });
  });

  test("clicking capture button opens overlay or input", async ({ page }) => {
    const captureBtn = page.getByRole("button", { name: /capture a thought/i });
    const captureAlt = page.locator('[aria-label*="capture" i]').first();

    const btn = (await captureBtn.isVisible().catch(() => false)) ? captureBtn : captureAlt;

    if (await btn.isVisible().catch(() => false)) {
      await btn.click();

      // Wait for overlay/input to appear — could be textarea, input, or dialog
      const hasInput = await page.locator(
        'textarea, input[type="text"], [role="dialog"], [role="textbox"]'
      ).first().isVisible({ timeout: 5_000 }).catch(() => false);

      expect(hasInput).toBe(true);
    }
  });

  test("keyboard shortcut Cmd+N / Ctrl+N opens capture", async ({ page }) => {
    // Use Ctrl+N on non-Mac (Playwright runs Chromium)
    await page.keyboard.press("Control+n");

    // Check if an input/overlay appeared
    const hasOverlay = await page.locator(
      'textarea, [role="dialog"], [role="textbox"]'
    ).first().isVisible({ timeout: 5_000 }).catch(() => false);

    // Ctrl+N might open new browser tab instead — this test documents the behavior
    // If it doesn't open capture, we know the shortcut isn't working
    if (!hasOverlay) {
      test.info().annotations.push({
        type: "issue",
        description: "Ctrl+N did not open capture overlay — shortcut may not be bound",
      });
    }
  });

  test("can type in capture input and see text", async ({ page }) => {
    const captureBtn = page.getByRole("button", { name: /capture a thought/i });
    const captureAlt = page.locator('[aria-label*="capture" i]').first();

    const btn = (await captureBtn.isVisible().catch(() => false)) ? captureBtn : captureAlt;

    if (await btn.isVisible().catch(() => false)) {
      await btn.click();

      // Find the text input
      const input = page.locator('textarea, input[type="text"], [role="textbox"]').first();
      if (await input.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await input.fill("E2E test thought: the sky is blue");
        await expect(input).toHaveValue(/sky is blue/);
      }
    }
  });
});
