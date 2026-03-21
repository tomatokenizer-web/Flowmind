/**
 * Smoke tests: API/tRPC endpoint health checks.
 * Tests the API layer directly via fetch to detect server-side errors
 * that might not surface in UI tests.
 */

import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "../helpers/auth";

test.describe("API Health Checks", () => {
  test.beforeEach(async ({ context }) => {
    await loginAsTestUser(context);
  });

  test("tRPC batch endpoint responds", async ({ page }) => {
    // tRPC uses batch requests — hit the health-check-like endpoint
    const response = await page.request.get("/api/trpc/project.list", {
      headers: { "content-type": "application/json" },
    });

    // Should not be a 500 error
    expect(response.status()).not.toBe(500);

    // If 401, auth cookie isn't being picked up
    if (response.status() === 401) {
      test.info().annotations.push({
        type: "issue",
        description: "API returned 401 — session cookie not recognized by tRPC",
      });
    }
  });

  test("project.list returns valid JSON", async ({ page }) => {
    const response = await page.request.get("/api/trpc/project.list");

    if (response.ok()) {
      const body = await response.json();
      // tRPC wraps responses in result.data
      expect(body).toBeDefined();
      test.info().annotations.push({
        type: "info",
        description: `project.list response: ${JSON.stringify(body).slice(0, 200)}`,
      });
    }
  });

  test("unit.list endpoint responds (with projectId)", async ({ page }) => {
    // First get a project ID
    const projectRes = await page.request.get("/api/trpc/project.list");
    let projectId: string | null = null;

    if (projectRes.ok()) {
      try {
        const body = await projectRes.json();
        // tRPC response shape: [{ result: { data: [...] } }] or { result: { data: [...] } }
        const data = body?.result?.data ?? body?.[0]?.result?.data;
        if (Array.isArray(data) && data.length > 0) {
          projectId = data[0].id;
        }
      } catch { /* parse error */ }
    }

    if (projectId) {
      const input = JSON.stringify({ projectId });
      const response = await page.request.get(
        `/api/trpc/unit.list?input=${encodeURIComponent(input)}`
      );
      expect(response.status()).not.toBe(500);

      test.info().annotations.push({
        type: "info",
        description: `unit.list status: ${response.status()}`,
      });
    } else {
      test.info().annotations.push({
        type: "info",
        description: "Skipped unit.list — no project found",
      });
    }
  });

  test("context.list endpoint responds", async ({ page }) => {
    const projectRes = await page.request.get("/api/trpc/project.list");
    let projectId: string | null = null;

    if (projectRes.ok()) {
      try {
        const body = await projectRes.json();
        const data = body?.result?.data ?? body?.[0]?.result?.data;
        if (Array.isArray(data) && data.length > 0) {
          projectId = data[0].id;
        }
      } catch { /* parse error */ }
    }

    if (projectId) {
      const input = JSON.stringify({ projectId });
      const response = await page.request.get(
        `/api/trpc/context.list?input=${encodeURIComponent(input)}`
      );
      expect(response.status()).not.toBe(500);
    }
  });

  test("auth session endpoint returns user data", async ({ page }) => {
    const response = await page.request.get("/api/auth/session");
    expect(response.status()).toBe(200);

    const body = await response.json();
    if (body?.user) {
      expect(body.user.email).toBeTruthy();
      test.info().annotations.push({
        type: "info",
        description: `Authenticated as: ${body.user.email}`,
      });
    } else {
      test.info().annotations.push({
        type: "issue",
        description: "Session endpoint returned 200 but no user — auth bypass may be broken",
      });
    }
  });
});

test.describe("API Error Detection", () => {
  test("no console errors on dashboard load", async ({ page, context }) => {
    await loginAsTestUser(context);

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    const pageErrors: string[] = [];
    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(3_000); // Let async operations settle

    // Report all errors found
    if (consoleErrors.length > 0) {
      test.info().annotations.push({
        type: "issue",
        description: `Console errors (${consoleErrors.length}): ${consoleErrors.slice(0, 5).join(" | ")}`,
      });
    }
    if (pageErrors.length > 0) {
      test.info().annotations.push({
        type: "issue",
        description: `Page errors (${pageErrors.length}): ${pageErrors.slice(0, 5).join(" | ")}`,
      });
    }

    // Soft assertion — we log but don't fail for console errors (many are from React/Next dev mode)
    // Hard fail only on page crashes
    expect(pageErrors.length).toBe(0);
  });

  test("no failed network requests on dashboard load", async ({ page, context }) => {
    await loginAsTestUser(context);

    const failedRequests: { url: string; status: number }[] = [];

    page.on("response", (response) => {
      if (response.status() >= 500) {
        failedRequests.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(3_000);

    if (failedRequests.length > 0) {
      const summary = failedRequests
        .map((r) => `${r.status} ${new URL(r.url).pathname}`)
        .join(" | ");
      test.info().annotations.push({
        type: "issue",
        description: `Failed requests: ${summary}`,
      });
    }

    // No 500 errors should happen on basic page load
    expect(failedRequests).toHaveLength(0);
  });
});
