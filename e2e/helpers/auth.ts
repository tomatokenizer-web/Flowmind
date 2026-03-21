/**
 * E2E Auth helpers — seed a test user + session directly in the database
 * so Playwright can access authenticated routes without going through OAuth.
 *
 * Requires DATABASE_URL to be set in .env (same DB the dev server uses).
 */

import { type Page, type BrowserContext } from "@playwright/test";

// We inject the session cookie directly — no OAuth flow needed.
const TEST_USER = {
  id: "e2e-test-user-00000000",
  name: "E2E Test User",
  email: "e2e@flowmind.test",
};

const TEST_SESSION_TOKEN = "e2e-test-session-token-playwright";

/**
 * Seed a test user and active session in the database.
 * Call this once in globalSetup or in a beforeAll block.
 */
export async function seedTestUser(): Promise<void> {
  // Dynamic import to avoid bundling issues
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    // Upsert user
    await prisma.user.upsert({
      where: { id: TEST_USER.id },
      update: { name: TEST_USER.name, email: TEST_USER.email },
      create: {
        id: TEST_USER.id,
        name: TEST_USER.name,
        email: TEST_USER.email,
        emailVerified: new Date(),
      },
    });

    // Upsert session (expires 24h from now)
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.session.upsert({
      where: { sessionToken: TEST_SESSION_TOKEN },
      update: { expires },
      create: {
        sessionToken: TEST_SESSION_TOKEN,
        userId: TEST_USER.id,
        expires,
      },
    });

    // Ensure the user has a project with test data
    let project = await prisma.project.findFirst({
      where: { userId: TEST_USER.id },
    });

    if (!project) {
      project = await prisma.project.create({
        data: {
          name: "E2E Test Project",
          userId: TEST_USER.id,
        },
      });
    }

    // Seed contexts if none exist
    const contextCount = await prisma.context.count({
      where: { projectId: project.id },
    });

    if (contextCount === 0) {
      const ctx1 = await prisma.context.create({
        data: {
          name: "Research Notes",
          projectId: project.id,
          sortOrder: 0,
        },
      });

      const ctx2 = await prisma.context.create({
        data: {
          name: "Arguments",
          projectId: project.id,
          sortOrder: 1,
        },
      });

      // Seed units
      const units = await Promise.all([
        prisma.unit.create({
          data: {
            content: "The relationship between attention and memory consolidation is well-documented in cognitive psychology.",
            userId: TEST_USER.id,
            projectId: project.id,
            unitType: "claim",
            lifecycle: "confirmed",
          },
        }),
        prisma.unit.create({
          data: {
            content: "What role does sleep play in transferring short-term memories to long-term storage?",
            userId: TEST_USER.id,
            projectId: project.id,
            unitType: "question",
            lifecycle: "draft",
          },
        }),
        prisma.unit.create({
          data: {
            content: "Studies show REM sleep increases memory retention by 40% compared to sleep-deprived subjects.",
            userId: TEST_USER.id,
            projectId: project.id,
            unitType: "evidence",
            lifecycle: "confirmed",
          },
        }),
        prisma.unit.create({
          data: {
            content: "Memory consolidation might be less dependent on sleep than on emotional salience of the content.",
            userId: TEST_USER.id,
            projectId: project.id,
            unitType: "counterargument",
            lifecycle: "draft",
          },
        }),
        prisma.unit.create({
          data: {
            content: "Spaced repetition as a learning technique leverages the spacing effect to strengthen neural pathways.",
            userId: TEST_USER.id,
            projectId: project.id,
            unitType: "observation",
            lifecycle: "draft",
          },
        }),
      ]);

      // Assign units to contexts
      await prisma.unitContext.createMany({
        data: [
          { unitId: units[0]!.id, contextId: ctx1.id },
          { unitId: units[1]!.id, contextId: ctx1.id },
          { unitId: units[2]!.id, contextId: ctx1.id },
          { unitId: units[3]!.id, contextId: ctx2.id },
          { unitId: units[4]!.id, contextId: ctx2.id },
        ],
      });

      // Create a navigator for the first context
      await prisma.navigator.create({
        data: {
          name: "Reading Path",
          contextId: ctx1.id,
          path: [units[0]!.id, units[1]!.id, units[2]!.id],
        },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Clean up test data after the test suite.
 */
export async function cleanupTestUser(): Promise<void> {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    // Get projects for cascading cleanup
    const projects = await prisma.project.findMany({
      where: { userId: TEST_USER.id },
      select: { id: true },
    });
    const projectIds = projects.map((p) => p.id);

    if (projectIds.length > 0) {
      // Delete in FK order: navigators → unitContexts → units → contexts → projects
      await prisma.navigator.deleteMany({
        where: { context: { projectId: { in: projectIds } } },
      });
      await prisma.unitContext.deleteMany({
        where: { unit: { projectId: { in: projectIds } } },
      });
      await prisma.unit.deleteMany({
        where: { projectId: { in: projectIds } },
      });
      await prisma.context.deleteMany({
        where: { projectId: { in: projectIds } },
      });
    }

    // Delete session, projects, user
    await prisma.session.deleteMany({
      where: { userId: TEST_USER.id },
    });
    await prisma.project.deleteMany({
      where: { userId: TEST_USER.id },
    });
    await prisma.user.deleteMany({
      where: { id: TEST_USER.id },
    });
  } catch {
    // Ignore errors during cleanup — data may not exist
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Inject the session cookie into the browser context so the middleware
 * recognises the user as authenticated.
 */
export async function loginAsTestUser(context: BrowserContext): Promise<void> {
  // In dev mode, cookies are not Secure (no HTTPS), so the cookie name is
  // "authjs.session-token" (without the __Secure- prefix).
  await context.addCookies([
    {
      name: "authjs.session-token",
      value: TEST_SESSION_TOKEN,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

/**
 * Navigate to an authenticated page (injects cookie first).
 */
export async function gotoAuthenticated(
  page: Page,
  path: string
): Promise<void> {
  await loginAsTestUser(page.context());
  await page.goto(path, { waitUntil: "networkidle" });
}

export { TEST_USER, TEST_SESSION_TOKEN };
