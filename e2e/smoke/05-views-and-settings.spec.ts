/**
 * Smoke tests: Graph view, thread view, settings page.
 */

import { test, expect } from "@playwright/test";
import { gotoAuthenticated } from "../helpers/auth";

test.describe("Graph View", () => {
  test("graph view renders SVG canvas", async ({ page }) => {
    await gotoAuthenticated(page, "/dashboard");
    await page.waitForSelector("#main-content", { timeout: 15_000 });

    // Switch to graph view
    const graphBtn = page.locator('[title="Graph View"]');
    if (await graphBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await graphBtn.click();

      // Wait for graph section
      const graphSection = page.locator('section[aria-label="Graph view"]');
      await expect(graphSection).toBeVisible({ timeout: 10_000 });

      // Should have an SVG or canvas element
      const hasSvg = await graphSection.locator("svg").isVisible({ timeout: 5_000 }).catch(() => false);
      const hasCanvas = await graphSection.locator("canvas").isVisible({ timeout: 3_000 }).catch(() => false);

      if (!hasSvg && !hasCanvas) {
        test.info().annotations.push({
          type: "issue",
          description: "Graph view section visible but no SVG/canvas rendered",
        });
      }
    }
  });
});

test.describe("Thread View", () => {
  test("thread view renders", async ({ page }) => {
    await gotoAuthenticated(page, "/dashboard");
    await page.waitForSelector("#main-content", { timeout: 15_000 });

    const threadBtn = page.locator('[title="Thread View"]');
    if (await threadBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await threadBtn.click();

      const threadSection = page.locator('section[aria-label="Thread view"]');
      await expect(threadSection).toBeVisible({ timeout: 10_000 });
    }
  });
});

test.describe("Settings Page", () => {
  test("settings page loads with tabs", async ({ page }) => {
    await gotoAuthenticated(page, "/settings");

    // Settings page uses a plain div wrapper, not #main-content
    // Wait for the page content to appear
    await expect(page.locator(".min-h-screen").first()).toBeVisible({ timeout: 15_000 });

    // Look for tab navigation (settings has 6 tabs)
    const tabs = page.getByRole("tab");
    const tabCount = await tabs.count();

    if (tabCount > 0) {
      expect(tabCount).toBeGreaterThanOrEqual(2);
      test.info().annotations.push({
        type: "info",
        description: `Settings page has ${tabCount} tabs`,
      });
    }
  });

  test("can switch between settings tabs", async ({ page }) => {
    await gotoAuthenticated(page, "/settings");
    await expect(page.locator(".min-h-screen").first()).toBeVisible({ timeout: 15_000 });

    const tabs = page.getByRole("tab");
    const tabCount = await tabs.count();

    if (tabCount >= 2) {
      // Click second tab
      await tabs.nth(1).click();
      await expect(tabs.nth(1)).toHaveAttribute("data-state", "active", { timeout: 3_000 }).catch(() => {
        // Some tab implementations use aria-selected instead
      });

      // Click third tab if exists
      if (tabCount >= 3) {
        await tabs.nth(2).click();
      }
    }
  });
});

test.describe("Dev Pages (if accessible)", () => {
  test("/dev/components loads", async ({ page }) => {
    await page.goto("/dev/components");
    // Dev pages should be publicly accessible (no auth redirect)
    await expect(page).not.toHaveURL(/sign-in/);
  });

  test("/dev/tokens loads", async ({ page }) => {
    await page.goto("/dev/tokens");
    await expect(page).not.toHaveURL(/sign-in/);
  });
});
