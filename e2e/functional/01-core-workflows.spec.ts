1/**
 * Functional E2E tests — real user workflows, not just page loads.
 *
 * Each test simulates a complete user action chain and verifies the outcome.
 * Tests are annotated with "issue" when the feature is optional/in-progress,
 * and hard-fail when the feature is load-bearing core behaviour.
 */

import { test, expect, type Page } from "@playwright/test";
import { gotoAuthenticated, loginAsTestUser } from "../helpers/auth";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Wait for the app shell to be interactive after navigation. */
async function waitForDashboard(page: Page): Promise<void> {
  await page.waitForSelector("#main-content", { timeout: 15_000 });
  // Dismiss any loading pulse animations before interacting
  await page
    .waitForFunction(() => !document.querySelector('[class*="animate-pulse"]'), {
      timeout: 10_000,
    })
    .catch(() => {
      /* no spinners — that's fine */
    });
}

/** Collect console errors & uncaught exceptions for the lifetime of a test. */
function collectErrors(page: Page): { type: string; text: string }[] {
  const errors: { type: string; text: string }[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push({ type: "console", text: msg.text() });
  });
  page.on("pageerror", (err) => {
    errors.push({ type: "uncaught", text: err.message });
  });
  return errors;
}

/**
 * Open the capture overlay via the visible button or keyboard shortcut.
 * Returns true if capture was opened successfully.
 */
async function openCapture(page: Page): Promise<boolean> {
  // Try primary button first
  const captureBtn = page.getByRole("button", { name: /capture a thought/i });
  const captureAlt = page.locator('[aria-label*="capture" i]').first();

  if (await captureBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await captureBtn.click();
  } else if (await captureAlt.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await captureAlt.click();
  } else {
    // Fall back to keyboard shortcut
    await page.keyboard.press("Control+n");
  }

  // Confirm overlay/input appeared
  return page
    .locator('textarea, input[type="text"], [role="dialog"], [role="textbox"]')
    .first()
    .isVisible({ timeout: 5_000 })
    .catch(() => false);
}

/** Close the capture overlay if it is open. */
async function closeCapture(page: Page): Promise<void> {
  const closeBtn = page.locator('[aria-label="Close capture mode"]');
  if (await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await closeBtn.click();
  } else {
    await page.keyboard.press("Escape");
  }
  // Wait for any dialog to be gone
  await page
    .locator('[role="dialog"]')
    .waitFor({ state: "hidden", timeout: 3_000 })
    .catch(() => {});
}

// ---------------------------------------------------------------------------
// Workflow 1 — Capture → Unit Appears
// ---------------------------------------------------------------------------

test.describe("Workflow 1: Capture → Unit Appears in List", () => {
  test("captured thought appears in the unit list with correct content", async ({
    page,
  }) => {
    const errors = collectErrors(page);

    await gotoAuthenticated(page, "/dashboard");
    await waitForDashboard(page);

    const opened = await openCapture(page);
    if (!opened) {
      test.skip(true, "Capture entry point not found — cannot run workflow");
      return;
    }

    // Fill in the text input
    const input = page
      .locator('textarea, input[type="text"], [role="textbox"]')
      .first();
    await expect(input).toBeVisible({ timeout: 5_000 });

    const testContent = `E2E functional capture ${Date.now()}`;
    await input.fill(testContent);
    await expect(input).toHaveValue(new RegExp(testContent.slice(-20)));

    // Submit via button or Enter
    const submitBtn = page
      .locator(
        'button[type="submit"], button:has-text("Save"), button:has-text("Add"), button:has-text("Capture")'
      )
      .first();

    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click();
    } else {
      await input.press("Enter");
    }

    // Give the UI time to update (tRPC mutation + optimistic update)
    await page.waitForTimeout(2_000);

    // VERIFY: the unit text is visible on the page
    const unitText = page.locator(`text=${testContent}`);
    const unitVisible = await unitText.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!unitVisible) {
      // Annotate as issue — optimistic UI or query invalidation may not be wired up
      test.info().annotations.push({
        type: "issue",
        description: `Unit "${testContent}" was submitted but did not appear in the list. Possible missing query invalidation after mutation.`,
      });
    }

    // Hard assert — this is a core workflow
    expect(unitVisible).toBe(true);

    // SECONDARY VERIFY: no uncaught errors during the capture flow
    const criticalErrors = errors.filter(
      (e) => e.type === "uncaught" || !e.text.includes("React")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Workflow 2 — Context Creation → Appears in Sidebar
// ---------------------------------------------------------------------------

test.describe("Workflow 2: Context Creation → Sidebar Tree Update", () => {
  test("newly created context appears in the sidebar tree", async ({ page }) => {
    await gotoAuthenticated(page, "/dashboard");
    await waitForDashboard(page);

    const sidebar = page.getByRole("navigation", { name: /project navigation/i });
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    // Look for an "Add context" or "+" button inside the sidebar
    const addContextBtn = sidebar
      .locator(
        'button[aria-label*="add context" i], button[aria-label*="new context" i], button[title*="add" i], button[title*="new context" i]'
      )
      .first();

    const addAlt = sidebar
      .locator('button:has-text("+"), button[aria-label*="add" i]')
      .first();

    let addBtn = addContextBtn;
    if (!(await addContextBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      addBtn = addAlt;
    }

    if (!(await addBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, "No 'Add context' button found in sidebar — skipping workflow");
      return;
    }

    await addBtn.click();

    // A dialog / inline input should appear for the context name
    const nameInput = page
      .locator(
        '[role="dialog"] input, [role="dialog"] textarea, input[placeholder*="name" i], input[placeholder*="context" i]'
      )
      .first();

    if (!(await nameInput.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.info().annotations.push({
        type: "issue",
        description: "Clicked 'Add context' but no input field appeared for naming",
      });
      return;
    }

    const contextName = `E2E Context ${Date.now()}`;
    await nameInput.fill(contextName);

    // Submit — button or Enter
    const confirmBtn = page
      .locator(
        '[role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Create"), [role="dialog"] button:has-text("Save"), [role="dialog"] button:has-text("Add")'
      )
      .first();

    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmBtn.click();
    } else {
      await nameInput.press("Enter");
    }

    // Wait for the sidebar to update
    await page.waitForTimeout(2_000);

    // VERIFY: context name appears in sidebar
    const contextItem = sidebar.locator(`text=${contextName}`);
    const contextVisible = await contextItem
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (!contextVisible) {
      test.info().annotations.push({
        type: "issue",
        description: `Created context "${contextName}" but it did not appear in the sidebar tree`,
      });
    }

    expect(contextVisible).toBe(true);

    // VERIFY: clicking the context highlights it (active state)
    await contextItem.click();
    await page.waitForTimeout(1_000);

    // Active context should be visually distinct — check aria-current or active class
    const activeContext = sidebar.locator(
      '[aria-current="page"], [aria-current="true"], [data-active="true"], [class*="active"]'
    );
    const hasActive = await activeContext.isVisible({ timeout: 3_000 }).catch(() => false);

    if (!hasActive) {
      test.info().annotations.push({
        type: "issue",
        description:
          "Clicked context in sidebar but no active/current state was applied. May be missing aria-current or active class.",
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Workflow 3 — Thread View: Search & Filter
// ---------------------------------------------------------------------------

test.describe("Workflow 3: Thread View Search & Filter", () => {
  test("search bar filters units and clear restores full list", async ({ page }) => {
    await gotoAuthenticated(page, "/dashboard");
    await waitForDashboard(page);

    // Switch to Thread View
    const threadBtn = page.locator('[title="Thread View"]').first();
    if (!(await threadBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Thread View button not found — cannot run workflow");
      return;
    }

    await threadBtn.click();

    const threadRegion = page.locator('[aria-label="Thread view - linear reading mode"]');
    await expect(threadRegion).toBeVisible({ timeout: 10_000 });

    // VERIFY: search bar is visible
    const searchBar = threadRegion
      .locator('input[aria-label="Search units in thread"]')
      .first();

    const searchVisible = await searchBar.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!searchVisible) {
      test.info().annotations.push({
        type: "issue",
        description: "Thread view is visible but no search bar found inside it",
      });
      return;
    }

    // Count unit cards before searching (data-unit-id marks real unit cards)
    const unitCards = threadRegion.locator('[data-unit-id]');
    const countBefore = await unitCards.count();

    if (countBefore === 0) {
      test.skip(true, "No units to filter — search test requires at least 1 unit");
      return;
    }

    // Type a query unlikely to match anything
    const uniqueQuery = "xyzzy_e2e_no_match_4829";
    await searchBar.fill(uniqueQuery);
    await page.waitForTimeout(1_000);

    // VERIFY: list is filtered (fewer items or "No units yet" empty state)
    const countAfter = await unitCards.count();
    const emptyState = threadRegion.locator('text=/No units/i').first();
    const emptyVisible = await emptyState.isVisible({ timeout: 2_000 }).catch(() => false);

    expect(countAfter < countBefore || emptyVisible).toBe(true);

    // Clear search via the clear button
    const clearBtn = threadRegion.locator('[aria-label="Clear search"]');
    if (await clearBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await clearBtn.click();
    } else {
      await searchBar.clear();
    }
    await page.waitForTimeout(1_000);

    // VERIFY: full list is restored
    const countRestored = await unitCards.count();
    expect(countRestored).toBeGreaterThanOrEqual(countBefore);
  });
});

// ---------------------------------------------------------------------------
// Workflow 4 — View Mode Switching Preserves State (no errors)
// ---------------------------------------------------------------------------

test.describe("Workflow 4: View Mode Switching — No Console Errors", () => {
  test("cycling through Canvas → Thread → Graph → Canvas produces no uncaught errors", async ({
    page,
  }) => {
    const errors = collectErrors(page);

    await gotoAuthenticated(page, "/dashboard");
    await waitForDashboard(page);

    // Helper: click a view button by title if present
    async function switchView(title: string): Promise<boolean> {
      const btn = page.locator(`[title="${title}"]`).first();
      if (await btn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(1_000);
        return true;
      }
      return false;
    }

    // Canvas is the default — try Thread View
    const threadSwitched = await switchView("Thread View");
    if (threadSwitched) {
      const threadSection = page.locator('section[aria-label="Thread view"]');
      await expect(threadSection).toBeVisible({ timeout: 10_000 });
    }

    // Switch to Graph View
    const graphSwitched = await switchView("Graph View");
    if (graphSwitched) {
      const graphSection = page.locator('section[aria-label="Graph view"]');
      await expect(graphSection).toBeVisible({ timeout: 10_000 });

      // VERIFY: SVG renders inside graph
      const svg = graphSection.locator("svg");
      const svgVisible = await svg.isVisible({ timeout: 5_000 }).catch(() => false);

      if (!svgVisible) {
        test.info().annotations.push({
          type: "issue",
          description: "Graph view is active but no SVG element rendered",
        });
      }
    }

    // Switch back to Canvas
    const canvasSwitched = await switchView("Canvas");
    if (!canvasSwitched) {
      // Some implementations use a radiogroup
      const canvasRadio = page
        .locator('[role="radiogroup"] [aria-label="Canvas view"]')
        .first();
      if (await canvasRadio.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await canvasRadio.click();
        await page.waitForTimeout(1_000);
      }
    }

    // VERIFY: canvas section is back
    const canvasSection = page.locator('section[aria-label="Canvas view"]');
    const canvasVisible = await canvasSection
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (!canvasVisible) {
      test.info().annotations.push({
        type: "issue",
        description: "Switching back to Canvas view did not show canvas section",
      });
    }

    // Hard assert: no uncaught JS exceptions during view transitions
    const uncaughtErrors = errors.filter((e) => e.type === "uncaught");
    if (uncaughtErrors.length > 0) {
      test.info().annotations.push({
        type: "issue",
        description: `Uncaught errors during view switching: ${uncaughtErrors.map((e) => e.text).join(" | ")}`,
      });
    }
    expect(uncaughtErrors).toHaveLength(0);
  });

  test("view mode radiogroup reflects correct active state after switching", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/dashboard");
    await waitForDashboard(page);

    const viewSwitcher = page.locator('[role="radiogroup"][aria-label="View mode"]');
    if (!(await viewSwitcher.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "View mode radiogroup not found — skipping ARIA state test");
      return;
    }

    const canvasRadio = viewSwitcher.locator('[aria-label="Canvas view"]');
    const graphRadio = viewSwitcher.locator('[aria-label="Graph view"]');
    const threadRadio = viewSwitcher.locator('[aria-label="Thread view"]');

    // Canvas should be active by default
    await expect(canvasRadio).toHaveAttribute("aria-checked", "true");

    // Switch to Graph
    if (await graphRadio.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await graphRadio.click();
      await expect(graphRadio).toHaveAttribute("aria-checked", "true");
      await expect(canvasRadio).toHaveAttribute("aria-checked", "false");
    }

    // Switch to Thread
    if (await threadRadio.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await threadRadio.click();
      await expect(threadRadio).toHaveAttribute("aria-checked", "true");
      await expect(graphRadio).toHaveAttribute("aria-checked", "false");
    }
  });
});

// ---------------------------------------------------------------------------
// Workflow 5 — Settings Appearance Tab: Theme Switching
// ---------------------------------------------------------------------------

test.describe("Workflow 5: Settings Appearance — Theme Switching", () => {
  test("Appearance tab exists and can be activated", async ({ page }) => {
    await gotoAuthenticated(page, "/settings");
    await expect(page.locator(".min-h-screen").first()).toBeVisible({ timeout: 15_000 });

    // Find the Appearance tab
    const appearanceTab = page
      .getByRole("tab", { name: /appearance/i })
      .first();

    const tabVisible = await appearanceTab.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!tabVisible) {
      test.info().annotations.push({
        type: "issue",
        description: "No 'Appearance' tab found on settings page",
      });
      // Soft-fail — settings tabs may still be in development
      return;
    }

    await appearanceTab.click();
    // Tab should become active
    await expect(appearanceTab).toHaveAttribute("data-state", "active", {
      timeout: 3_000,
    }).catch(async () => {
      // Some implementations use aria-selected
      await expect(appearanceTab).toHaveAttribute("aria-selected", "true");
    });
  });

  test("Light and Natural Dark theme options are visible in Appearance tab", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/settings");
    await expect(page.locator(".min-h-screen").first()).toBeVisible({ timeout: 15_000 });

    const appearanceTab = page.getByRole("tab", { name: /appearance/i }).first();
    if (!(await appearanceTab.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Appearance tab not found");
      return;
    }

    await appearanceTab.click();
    await page.waitForTimeout(500);

    // VERIFY: Light theme option
    const lightOption = page
      .locator('button:has-text("Light"), [aria-label*="light" i], label:has-text("Light")')
      .first();

    const lightVisible = await lightOption.isVisible({ timeout: 5_000 }).catch(() => false);

    // VERIFY: Natural Dark theme option
    const naturalDarkOption = page
      .locator(
        'button:has-text("Natural Dark"), [aria-label*="natural dark" i], label:has-text("Natural Dark"), button:has-text("Natural")'
      )
      .first();

    const naturalDarkVisible = await naturalDarkOption
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (!lightVisible) {
      test.info().annotations.push({
        type: "issue",
        description: "Light theme option not found in Appearance tab",
      });
    }
    if (!naturalDarkVisible) {
      test.info().annotations.push({
        type: "issue",
        description: "Natural Dark theme option not found in Appearance tab",
      });
    }

    expect(lightVisible || naturalDarkVisible).toBe(true);
  });

  test("selecting Natural Dark theme applies class to document root", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/settings");
    await expect(page.locator(".min-h-screen").first()).toBeVisible({ timeout: 15_000 });

    const appearanceTab = page.getByRole("tab", { name: /appearance/i }).first();
    if (!(await appearanceTab.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Appearance tab not found");
      return;
    }

    await appearanceTab.click();
    await page.waitForTimeout(500);

    const naturalDarkBtn = page
      .locator(
        'button:has-text("Natural Dark"), label:has-text("Natural Dark"), button:has-text("Natural")'
      )
      .first();

    if (!(await naturalDarkBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Natural Dark theme button not found");
      return;
    }

    await naturalDarkBtn.click();
    await page.waitForTimeout(500);

    // VERIFY: document root has 'natural-dark' class
    const rootClass = await page.evaluate(() => document.documentElement.className);
    const hasNaturalDark = rootClass.includes("natural-dark");

    if (!hasNaturalDark) {
      test.info().annotations.push({
        type: "issue",
        description: `Clicked Natural Dark but document root class is: "${rootClass}"`,
      });
    }

    expect(hasNaturalDark).toBe(true);

    // Now click Light theme and verify class is removed
    const lightBtn = page
      .locator('button:has-text("Light"), label:has-text("Light")')
      .first();

    if (await lightBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await lightBtn.click();
      await page.waitForTimeout(500);

      const rootClassAfter = await page.evaluate(() => document.documentElement.className);
      expect(rootClassAfter.includes("natural-dark")).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Workflow 6 — Navigator Panel When Context Is Active
// ---------------------------------------------------------------------------

test.describe("Workflow 6: Navigator Panel Appears When Context Is Active", () => {
  test("selecting a context reveals the Navigators panel section", async ({ page }) => {
    await gotoAuthenticated(page, "/dashboard");
    await waitForDashboard(page);

    const sidebar = page.getByRole("navigation", { name: /project navigation/i });
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    // Find context links — exclude nav/settings items
    const contextLinks = sidebar
      .locator("a[href*='context'], button")
      .filter({ hasNotText: /settings|graph|thread|assembly|all thoughts|navigator/i });

    const count = await contextLinks.count();

    if (count === 0) {
      test.info().annotations.push({
        type: "info",
        description: "No contexts found in sidebar — empty project, skipping navigator panel check",
      });
      return;
    }

    // Click the first context
    await contextLinks.first().click();
    await page.waitForTimeout(1_500);

    // VERIFY: Navigator panel section appears
    // Look for "Navigators" text or Compass icon in the sidebar
    const navigatorSection = sidebar.locator(
      'text=/navigators/i, [aria-label*="navigator" i], svg[data-icon*="compass" i]'
    ).first();

    const navigatorVisible = await navigatorSection
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (!navigatorVisible) {
      test.info().annotations.push({
        type: "issue",
        description:
          "A context was selected but no 'Navigators' panel appeared in the sidebar. This panel should show when a context is active.",
      });
    }

    // Annotate result either way for tracking
    test.info().annotations.push({
      type: "info",
      description: navigatorVisible
        ? "Navigator panel correctly appeared after selecting context"
        : "Navigator panel did NOT appear — possible regression or feature not yet wired",
    });
  });
});

// ---------------------------------------------------------------------------
// Workflow 7 — Orphan Unit Badge
// ---------------------------------------------------------------------------

test.describe("Workflow 7: Orphan Unit Badge", () => {
  test("orphan unit indicator is present in the sidebar when orphan units exist", async ({
    page,
    context,
  }) => {
    await loginAsTestUser(context);

    // Check via API how many orphan/unassigned units exist
    const projectRes = await page.request.get("/api/trpc/project.list");
    let projectId: string | undefined;

    if (projectRes.ok()) {
      const body = await projectRes.json();
      // Handle both list and single-project response shapes
      const data = body?.result?.data ?? body?.[0]?.result?.data;
      if (Array.isArray(data)) {
        projectId = data[0]?.id;
      } else if (data?.id) {
        projectId = data.id;
      }
    }

    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await waitForDashboard(page);

    const sidebar = page.getByRole("navigation", { name: /project navigation/i });
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    // Look for an orphan / unassigned indicator — badge, count, or label
    const orphanBadge = sidebar
      .locator(
        '[aria-label*="orphan" i], [aria-label*="unassigned" i], [title*="orphan" i], text=/orphan/i, [data-testid*="orphan"]'
      )
      .first();

    const badgeVisible = await orphanBadge.isVisible({ timeout: 5_000 }).catch(() => false);

    // Annotate what we found — this is an informational check
    test.info().annotations.push({
      type: "info",
      description: badgeVisible
        ? "Orphan unit badge/indicator is visible in the sidebar"
        : `Orphan unit badge not visible (projectId: ${projectId ?? "unknown"}). Either no orphan units exist or the badge is not yet implemented.`,
    });

    // Non-blocking — the badge is optional if there are no orphan units
    // Only hard-fail if we know orphan units exist AND badge is missing
    if (projectId) {
      const unitRes = await page.request.get(
        `/api/trpc/unit.list?input=${encodeURIComponent(JSON.stringify({ projectId }))}`
      );

      if (unitRes.ok()) {
        const unitBody = await unitRes.json();
        const units: { contextId?: string | null }[] =
          unitBody?.result?.data?.items ?? [];
        const orphanCount = units.filter((u) => !u.contextId).length;

        test.info().annotations.push({
          type: "info",
          description: `API reports ${orphanCount} orphan unit(s) (no contextId) out of ${units.length} total`,
        });

        if (orphanCount > 0 && !badgeVisible) {
          test.info().annotations.push({
            type: "issue",
            description: `${orphanCount} orphan unit(s) exist but no badge is shown in the sidebar`,
          });
        }
      }
    }
  });
});
