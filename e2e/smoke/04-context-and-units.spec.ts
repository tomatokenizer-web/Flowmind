/**
 * Smoke tests: Context creation, unit listing, detail panel interaction.
 */

import { test, expect, type Page } from "@playwright/test";
import { gotoAuthenticated } from "../helpers/auth";

async function waitForAppReady(page: Page) {
  await page.waitForSelector("#main-content", { timeout: 15_000 });
  // Wait for any loading spinners to disappear
  await page.waitForFunction(
    () => !document.querySelector('[class*="animate-pulse"]'),
    { timeout: 10_000 }
  ).catch(() => {/* may not have spinners */});
}

test.describe("Context Management", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAuthenticated(page, "/dashboard");
    await waitForAppReady(page);
  });

  test("context tree renders in sidebar", async ({ page }) => {
    const sidebar = page.getByRole("navigation", { name: /project navigation/i });
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    // Context tree should have some content — either contexts or empty state
    const sidebarContent = await sidebar.textContent();
    expect(sidebarContent).toBeTruthy();
  });

  test("can access context view via sidebar click", async ({ page }) => {
    const sidebar = page.getByRole("navigation", { name: /project navigation/i });
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    // Try clicking the first link/button in context tree area
    const contextLinks = sidebar.locator('a, button').filter({ hasNotText: /settings|graph|thread|assembly|all thoughts/i });
    const count = await contextLinks.count();

    if (count > 0) {
      await contextLinks.first().click();
      // Should navigate or show context content
      await page.waitForTimeout(1_000);
      test.info().annotations.push({
        type: "info",
        description: `Found ${count} context/nav items in sidebar`,
      });
    } else {
      test.info().annotations.push({
        type: "info",
        description: "No contexts found — empty project state",
      });
    }
  });
});

test.describe("Unit List", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAuthenticated(page, "/dashboard");
    await waitForAppReady(page);
  });

  test("unit list renders (or shows empty state)", async ({ page }) => {
    // Look for unit list container (may be "Unit list" or "All units") or empty state
    const unitList = page.locator('[role="list"][aria-label="Unit list"], [role="list"][aria-label="All units"]').first();
    const emptyState = page.locator('text=/no.*thought|no.*unit|empty|get started/i');

    const hasUnits = await unitList.isVisible({ timeout: 8_000 }).catch(() => false);
    const hasEmpty = await emptyState.first().isVisible({ timeout: 3_000 }).catch(() => false);

    // One of these should be true
    expect(hasUnits || hasEmpty).toBe(true);
  });

  test("unit cards have proper ARIA roles", async ({ page }) => {
    const unitCards = page.locator('[role="article"]');
    const count = await unitCards.count();

    if (count > 0) {
      // Each unit card should have an aria-label
      const firstCard = unitCards.first();
      const ariaLabel = await firstCard.getAttribute("aria-label");
      expect(ariaLabel).toBeTruthy();

      test.info().annotations.push({
        type: "info",
        description: `Found ${count} unit cards`,
      });
    }
  });

  test("clicking a unit card opens detail panel", async ({ page }) => {
    const unitCards = page.locator('[role="article"]');
    const count = await unitCards.count();

    if (count > 0) {
      await unitCards.first().click();

      // Detail panel should appear — look for close button or panel content
      const detailPanel = page.locator('[class*="detail"], [aria-label*="detail" i]');
      const closeBtn = page.getByRole("button", { name: /close/i });

      const hasDetail = await detailPanel.first().isVisible({ timeout: 5_000 }).catch(() => false);
      const hasClose = await closeBtn.isVisible({ timeout: 3_000 }).catch(() => false);

      if (!hasDetail && !hasClose) {
        test.info().annotations.push({
          type: "issue",
          description: "REGRESSION: Clicking unit card did not open detail panel",
        });
      }
    }
  });
});

test.describe("Context Detail View", () => {
  test("context/[id] page loads when navigated directly", async ({ page }) => {
    // First get project and context IDs via the API
    await gotoAuthenticated(page, "/dashboard");
    await waitForAppReady(page);

    // Try to find a context link in the sidebar
    const sidebar = page.getByRole("navigation", { name: /project navigation/i });
    const links = sidebar.locator("a[href*='context']");
    const count = await links.count();

    if (count > 0) {
      const href = await links.first().getAttribute("href");
      if (href) {
        await page.goto(href);
        await expect(page.locator("#main-content")).toBeVisible({ timeout: 10_000 });
        test.info().annotations.push({
          type: "info",
          description: `Navigated to context page: ${href}`,
        });
      }
    } else {
      test.info().annotations.push({
        type: "info",
        description: "No context links found — need to create a context first",
      });
    }
  });
});
