/**
 * Playwright global teardown — cleans up the test user after all tests.
 */

import { cleanupTestUser } from "./helpers/auth";

async function globalTeardown() {
  console.log("[E2E] Cleaning up test user...");
  await cleanupTestUser();
  console.log("[E2E] Cleanup done.");
}

export default globalTeardown;
