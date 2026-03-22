import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

// ─── User Router ────────────────────────────────────────────────────
//
// Exposes onboarding state persistence, profile management,
// AI preferences, and account operations.

export const userRouter = createTRPCRouter({
  // ── Profile ───────────────────────────────────────────────────────

  /**
   * Fetch the current user's profile information.
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    });

    return user;
  }),

  /**
   * Update the current user's profile (display name).
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { name: input.name },
      });
      return { ok: true };
    }),

  /**
   * Get connected OAuth provider accounts for the current user.
   */
  getConnectedAccounts: protectedProcedure.query(async ({ ctx }) => {
    const accounts = await ctx.db.account.findMany({
      where: { userId: ctx.session.user.id },
      select: {
        provider: true,
        providerAccountId: true,
      },
    });

    return accounts;
  }),

  // ── AI Preferences ────────────────────────────────────────────────

  /**
   * Get the current user's AI preferences.
   * Stored as a JSON blob in a user_preferences record keyed by user ID.
   * Falls back to defaults if no preferences exist.
   */
  getAIPreferences: protectedProcedure.query(async ({ ctx }) => {
    // We store AI prefs as JSON metadata on the user record.
    // Since the User model doesn't have a dedicated column yet,
    // we use a lightweight approach via a preferences key-value table
    // or fall back to defaults.
    // For now, use a simple approach with a preferences table lookup.
    try {
      const pref = await ctx.db.$queryRaw<
        Array<{ value: string }>
      >`SELECT value FROM user_preferences WHERE user_id = ${ctx.session.user.id} AND key = 'ai_preferences' LIMIT 1`;

      if (pref.length > 0 && pref[0]?.value) {
        return JSON.parse(pref[0].value) as {
          interventionIntensity: number;
          modelPreference: string;
        };
      }
    } catch {
      // Table may not exist yet — return defaults
    }

    return {
      interventionIntensity: 50,
      modelPreference: "balanced",
    };
  }),

  /**
   * Update the current user's AI preferences.
   */
  updateAIPreferences: protectedProcedure
    .input(
      z.object({
        interventionIntensity: z.number().int().min(0).max(100),
        modelPreference: z.enum(["speed", "balanced", "depth"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const value = JSON.stringify(input);

      try {
        // Upsert into user_preferences table
        await ctx.db.$executeRaw`
          INSERT INTO user_preferences (user_id, key, value, updated_at)
          VALUES (${ctx.session.user.id}, 'ai_preferences', ${value}, NOW())
          ON CONFLICT (user_id, key) DO UPDATE SET value = ${value}, updated_at = NOW()
        `;
      } catch {
        // If table doesn't exist, create it and retry
        await ctx.db.$executeRaw`
          CREATE TABLE IF NOT EXISTS user_preferences (
            user_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (user_id, key)
          )
        `;
        await ctx.db.$executeRaw`
          INSERT INTO user_preferences (user_id, key, value, updated_at)
          VALUES (${ctx.session.user.id}, 'ai_preferences', ${value}, NOW())
          ON CONFLICT (user_id, key) DO UPDATE SET value = ${value}, updated_at = NOW()
        `;
      }

      return { ok: true };
    }),

  // ── Embedding Preference ──────────────────────────────────────────

  /**
   * Get the user's embedding/AI-powered-search opt-in preference.
   * Defaults to true (opted in) when no preference is stored.
   */
  getEmbeddingPreference: protectedProcedure.query(async ({ ctx }) => {
    try {
      const pref = await ctx.db.$queryRaw<
        Array<{ value: string }>
      >`SELECT value FROM user_preferences WHERE user_id = ${ctx.session.user.id} AND key = 'embedding_enabled' LIMIT 1`;

      if (pref.length > 0 && pref[0]?.value !== undefined) {
        return { embeddingEnabled: pref[0].value === "true" };
      }
    } catch {
      // Table may not exist yet — return default
    }
    return { embeddingEnabled: true };
  }),

  /**
   * Set the user's embedding/AI-powered-search opt-in preference.
   */
  setEmbeddingPreference: protectedProcedure
    .input(z.object({ embeddingEnabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const value = String(input.embeddingEnabled);

      try {
        await ctx.db.$executeRaw`
          INSERT INTO user_preferences (user_id, key, value, updated_at)
          VALUES (${ctx.session.user.id}, 'embedding_enabled', ${value}, NOW())
          ON CONFLICT (user_id, key) DO UPDATE SET value = ${value}, updated_at = NOW()
        `;
      } catch {
        await ctx.db.$executeRaw`
          CREATE TABLE IF NOT EXISTS user_preferences (
            user_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (user_id, key)
          )
        `;
        await ctx.db.$executeRaw`
          INSERT INTO user_preferences (user_id, key, value, updated_at)
          VALUES (${ctx.session.user.id}, 'embedding_enabled', ${value}, NOW())
          ON CONFLICT (user_id, key) DO UPDATE SET value = ${value}, updated_at = NOW()
        `;
      }

      return { ok: true };
    }),

  // ── Account Management ────────────────────────────────────────────

  /**
   * Delete the current user's account and all associated data.
   * Manually cascades in FK-safe order to avoid constraint violations
   * on databases where cascades are not fully configured.
   * Order: assembly_items → assemblies → unit_contexts → relations →
   *        units → contexts → resources → projects → api_keys → sessions → user
   */
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id!;

    await ctx.db.$transaction(async (tx) => {
      // 1. Assembly items (reference units and assemblies)
      await tx.assemblyItem.deleteMany({
        where: { assembly: { project: { userId } } },
      });

      // 2. Assemblies
      await tx.assembly.deleteMany({
        where: { project: { userId } },
      });

      // 3. Unit contexts (join table between units and contexts)
      await tx.unitContext.deleteMany({
        where: { unit: { userId } },
      });

      // 4. Relations (reference units)
      await tx.relation.deleteMany({
        where: { sourceUnit: { userId } },
      });
      // Also remove relations where this user's units are the target
      await tx.relation.deleteMany({
        where: { targetUnit: { userId } },
      });

      // 5. Units (and their cascaded children: unitVersions, unitResources,
      //    unitPerspectives, contextVisits, unitTags are cascade-deleted by DB)
      await tx.unit.deleteMany({ where: { userId } });

      // 6. Contexts (cascade: navigators, unitPerspectives, contextVisits,
      //    contextReferences, reasoningChains)
      await tx.context.deleteMany({ where: { project: { userId } } });

      // 7. Resources
      await tx.resourceUnit.deleteMany({ where: { userId } });

      // 8. Projects (cascade: tags, webhooks, customRelationTypes)
      await tx.project.deleteMany({ where: { userId } });

      // 9. User preferences (raw table — best-effort)
      try {
        await tx.$executeRaw`DELETE FROM user_preferences WHERE user_id = ${userId}`;
      } catch {
        // Table may not exist
      }

      // 10. The user row itself (cascades: accounts, sessions)
      await tx.user.delete({ where: { id: userId } });
    });

    return { ok: true };
  }),

  // ── Onboarding ────────────────────────────────────────────────────

  /**
   * Fetch the current user's onboarding state.
   * Returns null fields when the user row does not yet carry DB state
   * (e.g. accounts created before the migration).
   */
  getOnboardingState: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        onboardingCompleted: true,
        onboardingStep: true,
      },
    });

    return {
      onboardingCompleted: user?.onboardingCompleted ?? false,
      onboardingStep: user?.onboardingStep ?? 0,
    };
  }),

  /**
   * Persist the user's current onboarding step progress.
   * Called each time the user advances a step so progress survives
   * cross-device sessions and localStorage clears.
   */
  saveOnboardingStep: protectedProcedure
    .input(z.object({ step: z.number().int().min(0) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { onboardingStep: input.step },
      });
      return { ok: true };
    }),

  /**
   * Mark the onboarding flow as completed for this user.
   * Idempotent — safe to call multiple times.
   */
  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.user.update({
      where: { id: ctx.session.user.id },
      data: {
        onboardingCompleted: true,
      },
    });
    return { ok: true };
  }),
});
