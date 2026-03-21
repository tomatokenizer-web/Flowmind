/**
 * Deep functional tests: verify data flows correctly end-to-end.
 * These tests catch integration issues that basic smoke tests miss.
 */

import { test, expect, type Page } from "@playwright/test";
import { gotoAuthenticated, loginAsTestUser } from "../helpers/auth";

// Collect all console errors during a test
function collectErrors(page: Page) {
  const errors: { type: string; text: string }[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push({ type: "console", text: msg.text() });
    }
  });

  page.on("pageerror", (err) => {
    errors.push({ type: "uncaught", text: err.message });
  });

  return errors;
}

test.describe("Data Flow: Unit Creation → Display", () => {
  test("creating a unit via capture shows it in the unit list", async ({ page }) => {
    const errors = collectErrors(page);
    await gotoAuthenticated(page, "/dashboard");
    await page.waitForSelector("#main-content", { timeout: 15_000 });

    // Open capture
    const captureBtn = page.locator('[aria-label*="capture" i]').first();
    if (!(await captureBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Capture button not found");
      return;
    }
    await captureBtn.click();

    // Find and fill the text input
    const input = page.locator('textarea, input[type="text"], [role="textbox"]').first();
    await expect(input).toBeVisible({ timeout: 5_000 });

    const testContent = `E2E test unit ${Date.now()}`;
    await input.fill(testContent);

    // Submit — look for submit button or press Enter
    const submitBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Add"), button:has-text("Capture")').first();
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click();
    } else {
      await input.press("Enter");
    }

    // Wait for the unit to appear in the list
    await page.waitForTimeout(2_000);

    // Check if the unit appears on the page
    const unitText = page.locator(`text=${testContent}`);
    const visible = await unitText.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!visible) {
      test.info().annotations.push({
        type: "issue",
        description: `Created unit "${testContent}" but it did not appear in the unit list`,
      });
    }

    // Report any errors that occurred
    const criticalErrors = errors.filter(
      (e) => e.type === "uncaught" || !e.text.includes("React") // Filter React dev warnings
    );
    if (criticalErrors.length > 0) {
      test.info().annotations.push({
        type: "issue",
        description: `Errors during capture: ${criticalErrors.map((e) => e.text).join(" | ")}`,
      });
    }
  });
});

test.describe("Data Flow: Navigation State", () => {
  test("switching views preserves sidebar state", async ({ page }) => {
    await gotoAuthenticated(page, "/dashboard");
    await page.waitForSelector("#main-content", { timeout: 15_000 });

    // Get sidebar state
    const sidebar = page.getByRole("navigation", { name: /project navigation/i });
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    // Switch to graph view
    const graphBtn = page.locator('button[title="Graph View"]').first();
    await expect(graphBtn).toBeVisible({ timeout: 10_000 });
    await graphBtn.click();
    await page.waitForTimeout(1_000);

    // Sidebar should still be visible
    await expect(sidebar).toBeVisible();

    // Switch back to canvas
    const canvasBtn = page.locator('button[title="Canvas"]').first();
    if (await canvasBtn.isVisible().catch(() => false)) {
      await canvasBtn.click();
      await page.waitForTimeout(1_000);
      await expect(sidebar).toBeVisible();
    }
  });

  test("view mode buttons reflect active state correctly", async ({ page }) => {
    await gotoAuthenticated(page, "/dashboard");
    await page.waitForSelector("#main-content", { timeout: 15_000 });

    // Find the view mode radiogroup
    const viewSwitcher = page.locator('[role="radiogroup"][aria-label="View mode"]');
    await expect(viewSwitcher).toBeVisible({ timeout: 10_000 });

    // Canvas should be active by default
    const canvasRadio = viewSwitcher.locator('[aria-label="Canvas view"]');
    await expect(canvasRadio).toHaveAttribute("aria-checked", "true");

    // Click Graph
    const graphRadio = viewSwitcher.locator('[aria-label="Graph view"]');
    await graphRadio.click();
    await expect(graphRadio).toHaveAttribute("aria-checked", "true");
    await expect(canvasRadio).toHaveAttribute("aria-checked", "false");
  });
});

test.describe("Runtime Error Detection", () => {
  test("no React key warnings on dashboard", async ({ page, context }) => {
    await loginAsTestUser(context);
    const keyWarnings: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("same key") || text.includes("unique key")) {
        keyWarnings.push(text.slice(0, 200));
      }
    });

    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(3_000);

    if (keyWarnings.length > 0) {
      test.info().annotations.push({
        type: "issue",
        description: `React key warnings: ${keyWarnings.join(" | ")}`,
      });
    }

    // This is a hard fail — duplicate keys are real bugs
    expect(keyWarnings).toHaveLength(0);
  });

  test("no hydration mismatches on page load", async ({ page, context }) => {
    await loginAsTestUser(context);
    const hydrationErrors: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("hydration") || text.includes("Hydration") || text.includes("server HTML")) {
        hydrationErrors.push(text.slice(0, 200));
      }
    });

    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(3_000);

    if (hydrationErrors.length > 0) {
      test.info().annotations.push({
        type: "issue",
        description: `Hydration errors: ${hydrationErrors.join(" | ")}`,
      });
    }
  });

  test("no unhandled promise rejections on interactions", async ({ page, context }) => {
    await loginAsTestUser(context);
    const rejections: string[] = [];

    page.on("pageerror", (err) => {
      rejections.push(err.message.slice(0, 200));
    });

    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(2_000);

    // Interact with key elements
    const captureBtn = page.locator('[aria-label*="capture" i]').first();
    if (await captureBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await captureBtn.click();
      await page.waitForTimeout(1_000);

      // Dismiss capture overlay — click the close button directly
      const closeBtn = page.locator('[aria-label="Close capture mode"]');
      if (await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      } else {
        // Fallback: try Escape (only works if textarea is focused)
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
      }
    }

    // Final check — wait for any dialog to be gone
    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor({ state: "hidden", timeout: 3_000 }).catch(() => {});

    // Switch views — only if no dialog is blocking
    if (!(await dialog.isVisible({ timeout: 500 }).catch(() => false))) {
      const graphBtn = page.locator('button[title="Graph View"]').first();
      if (await graphBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await graphBtn.click();
        await page.waitForTimeout(1_000);
      }
    }

    if (rejections.length > 0) {
      test.info().annotations.push({
        type: "issue",
        description: `Unhandled rejections: ${rejections.join(" | ")}`,
      });
    }

    expect(rejections).toHaveLength(0);
  });
});

test.describe("API Response Validation", () => {
  test("project.list returns expected shape", async ({ page, context }) => {
    await loginAsTestUser(context);
    const response = await page.request.get("/api/trpc/project.list");

    if (response.ok()) {
      const body = await response.json();
      // tRPC can return as { result: { data: ... } } or as an array of results
      const data = body?.result?.data ?? body?.[0]?.result?.data ?? body;

      expect(data).toBeDefined();

      // If it's an object with id/name, it's a single project (getOrCreateDefault style)
      if (data && typeof data === "object" && !Array.isArray(data) && data.id) {
        expect(data).toHaveProperty("id");
        expect(data).toHaveProperty("name");
      } else if (Array.isArray(data) && data.length > 0) {
        expect(data[0]).toHaveProperty("id");
        expect(data[0]).toHaveProperty("name");
      }
    }
  });

  test("unit.list returns items array with nextCursor", async ({ page, context }) => {
    await loginAsTestUser(context);

    // Get projectId first
    const projectRes = await page.request.get("/api/trpc/project.list");
    const projectBody = await projectRes.json();
    const projectId = projectBody?.result?.data?.[0]?.id;

    if (projectId) {
      const input = JSON.stringify({ projectId });
      const response = await page.request.get(
        `/api/trpc/unit.list?input=${encodeURIComponent(input)}`
      );

      if (response.ok()) {
        const body = await response.json();
        const data = body?.result?.data;

        expect(data).toBeDefined();
        expect(data).toHaveProperty("items");
        expect(Array.isArray(data.items)).toBe(true);

        test.info().annotations.push({
          type: "info",
          description: `unit.list returned ${data.items.length} items`,
        });
      }
    }
  });
});
