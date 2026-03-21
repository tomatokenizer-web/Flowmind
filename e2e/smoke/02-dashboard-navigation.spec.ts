/**
 * Smoke tests: Dashboard loads, sidebar navigation, basic layout.
 */

import { test, expect } from "@playwright/test";
import { gotoAuthenticated } from "../helpers/auth";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAuthenticated(page, "/dashboard");
  });

  test("dashboard page loads without errors", async ({ page }) => {
    // The app shell should render with main content area
    await expect(page.locator("#main-content")).toBeVisible({ timeout: 15_000 });
  });

  test("sidebar is visible on desktop", async ({ page }) => {
    const sidebar = page.getByRole("navigation", { name: /project navigation/i });
    await expect(sidebar).toBeVisible({ timeout: 10_000 });
  });

  test("sidebar has navigation buttons", async ({ page }) => {
    // Wait for sidebar to load
    await page.waitForSelector('[aria-label="Project navigation"]', { timeout: 10_000 });

    // Check for key navigation items (Thread, Graph, Assembly, Settings)
    // At least some nav buttons should exist
    const navButtons = await page.locator('[aria-label="Project navigation"] button, [aria-label="Project navigation"] a').count();
    expect(navButtons).toBeGreaterThan(0);
  });

  test("capture bar is visible at bottom", async ({ page }) => {
    // The capture bar should be visible — look for the capture button
    const captureBtn = page.getByRole("button", { name: /capture a thought/i });
    // It might also be an aria-label with "Open capture mode"
    const captureAlt = page.locator('[aria-label*="capture" i]');

    const hasCaptureBtn = await captureBtn.isVisible().catch(() => false);
    const hasCaptureAlt = await captureAlt.first().isVisible().catch(() => false);

    expect(hasCaptureBtn || hasCaptureAlt).toBe(true);
  });
});

test.describe("Sidebar Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAuthenticated(page, "/dashboard");
    await page.waitForSelector('[aria-label="Project navigation"]', { timeout: 10_000 });
  });

  test("clicking Graph View switches to graph mode", async ({ page }) => {
    // Desktop sidebar renders duplicate buttons (desktop + mobile) — use first visible
    const graphBtn = page.locator('button[title="Graph View"]').first();
    await expect(graphBtn).toBeVisible({ timeout: 15_000 });
    await graphBtn.click();
    // Should see graph view section or SVG canvas
    await expect(
      page.locator('section[aria-label="Graph view"], svg, canvas').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("clicking Thread View switches to thread mode", async ({ page }) => {
    const threadBtn = page.locator('button[title="Thread View"]').first();
    await expect(threadBtn).toBeVisible({ timeout: 15_000 });
    await threadBtn.click();
    await expect(
      page.locator('section[aria-label="Thread view"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Settings link navigates to /settings", async ({ page }) => {
    const settingsLink = page.locator('[title="Settings"]');
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await expect(page).toHaveURL(/settings/);
    }
  });
});
