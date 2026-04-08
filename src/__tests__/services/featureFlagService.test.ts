import { describe, it, expect } from "vitest";
import { createFeatureFlagService } from "@/server/services/featureFlagService";

// Test only the non-DB methods
const svc = createFeatureFlagService(null as never);

describe("featureFlagService", () => {
  describe("getDefaultFlags", () => {
    it("returns default flag definitions", () => {
      const flags = svc.getDefaultFlags();
      expect(flags.length).toBeGreaterThan(0);
    });

    it("each flag has key, enabled, and description", () => {
      for (const flag of svc.getDefaultFlags()) {
        expect(flag.key).toBeTruthy();
        expect(typeof flag.enabled).toBe("boolean");
        expect(flag.description).toBeTruthy();
      }
    });

    it("includes expected flags", () => {
      const keys = svc.getDefaultFlags().map((f) => f.key);
      expect(keys).toContain("epistemic_acts_full");
      expect(keys).toContain("rhetorical_shape_ui");
      expect(keys).toContain("compass_numeric_score");
      expect(keys).toContain("domain_templates");
    });

    it("DEC-004 §L: most flags default to enabled (full mode)", () => {
      const flags = svc.getDefaultFlags();
      const enabledCount = flags.filter((f) => f.enabled).length;
      expect(enabledCount).toBeGreaterThan(flags.length / 2);
    });

    it("decision_journal defaults to disabled (Phase 6 not complete)", () => {
      const flag = svc.getDefaultFlags().find((f) => f.key === "decision_journal");
      expect(flag?.enabled).toBe(false);
    });
  });
});
