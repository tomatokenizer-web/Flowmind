/**
 * Playwright global setup — seeds the test user before any tests run.
 */

import { seedTestUser } from "./helpers/auth";

async function globalSetup() {
  console.log("[E2E] Seeding test user...");
  await seedTestUser();
  console.log("[E2E] Test user seeded.");
}

export default globalSetup;
