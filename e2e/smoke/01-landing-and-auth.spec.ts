/**
 * Smoke tests: Landing page, sign-in page, and auth redirect behavior.
 */

import { test, expect } from "@playwright/test";
import { gotoAuthenticated } from "../helpers/auth";

test.describe("Landing Page", () => {
  test("shows Flowmind heading and sign-in link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /flowmind/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
  });

  test("sign-in link navigates to /sign-in", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/sign-in/);
  });
});

test.describe("Sign-In Page", () => {
  test("renders OAuth buttons and email form", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: /welcome to flowmind/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with github/i })).toBeVisible();
    await expect(page.getByPlaceholder(/name@example.com/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with email/i })).toBeVisible();
  });

  test("email button is disabled when input is empty", async ({ page }) => {
    await page.goto("/sign-in");
    const submitBtn = page.getByRole("button", { name: /continue with email/i });
    await expect(submitBtn).toBeDisabled();
  });

  test("email button enables when email is entered", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByPlaceholder(/name@example.com/i).fill("test@example.com");
    const submitBtn = page.getByRole("button", { name: /continue with email/i });
    await expect(submitBtn).toBeEnabled();
  });
});

test.describe("Auth Redirect", () => {
  test("unauthenticated user is redirected to /sign-in from protected routes", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/sign-in/);
  });

  test("unauthenticated user is redirected from /settings", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/sign-in/);
  });

  test("authenticated user on / is redirected to /dashboard", async ({ page }) => {
    await gotoAuthenticated(page, "/");
    await expect(page).toHaveURL(/dashboard/);
  });
});
