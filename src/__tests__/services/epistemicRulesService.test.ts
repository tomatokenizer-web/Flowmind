import { describe, it, expect } from "vitest";
import { createEpistemicRulesService } from "@/server/services/epistemicRulesService";

const service = createEpistemicRulesService();

describe("epistemicRulesService", () => {
  // ─── checkPreGeneration ────────────────────────────────────────────

  describe("checkPreGeneration", () => {
    it("passes clean prompts", () => {
      const result = service.checkPreGeneration("Analyze this text for claims");
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.checkedRules).toContain("no_fabrication");
    });

    it("flags fabrication language", () => {
      const result = service.checkPreGeneration("Make up some evidence for this claim");
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]!.rule).toBe("no_fabrication");
      expect(result.violations[0]!.severity).toBe("error");
    });

    it("flags destructive rewrite language", () => {
      const result = service.checkPreGeneration("Rewrite completely the user's argument");
      expect(result.passed).toBe(true); // warning, not error
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]!.rule).toBe("preserve_intent");
      expect(result.violations[0]!.severity).toBe("warning");
    });

    it("flags both fabrication and destructive rewrite", () => {
      const result = service.checkPreGeneration(
        "Fabricate some data and replace entirely the original",
      );
      expect(result.violations).toHaveLength(2);
    });
  });

  // ─── checkPostGeneration ───────────────────────────────────────────

  describe("checkPostGeneration", () => {
    it("passes with all context flags set", () => {
      const result = service.checkPostGeneration(
        { relations: [{ type: "supports" }, { type: "contradicts" }] },
        { hasConfidence: true, hasAiFlag: true, unitCount: 3 },
      );
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("warns when no confidence scores", () => {
      const result = service.checkPostGeneration({}, { hasConfidence: false, hasAiFlag: true });
      const violation = result.violations.find((v) => v.rule === "transparent_confidence");
      expect(violation).toBeDefined();
      expect(violation!.severity).toBe("warning");
    });

    it("warns when AI output not flagged", () => {
      const result = service.checkPostGeneration({}, { hasConfidence: true, hasAiFlag: false });
      const violation = result.violations.find((v) => v.rule === "no_fabrication");
      expect(violation).toBeDefined();
    });

    it("info when only supporting relations", () => {
      const result = service.checkPostGeneration(
        { relations: [{ subtype: "supports" }] },
        { hasConfidence: true, hasAiFlag: true },
      );
      const violation = result.violations.find((v) => v.rule === "adversarial_balance");
      expect(violation).toBeDefined();
      expect(violation!.severity).toBe("info");
    });

    it("warns when many units but no assumption type", () => {
      const result = service.checkPostGeneration(
        { units: [{ unitType: "claim" }, { unitType: "evidence" }] },
        { hasConfidence: true, hasAiFlag: true, unitCount: 7 },
      );
      const violation = result.violations.find((v) => v.rule === "no_hidden_assumptions");
      expect(violation).toBeDefined();
    });

    it("no hidden-assumptions warning when unitCount <= 5", () => {
      const result = service.checkPostGeneration(
        { units: [{ unitType: "claim" }] },
        { hasConfidence: true, hasAiFlag: true, unitCount: 4 },
      );
      const violation = result.violations.find((v) => v.rule === "no_hidden_assumptions");
      expect(violation).toBeUndefined();
    });
  });

  // ─── validateEpistemicIntegrity ────────────────────────────────────

  describe("validateEpistemicIntegrity", () => {
    it("info when claims lack evidence", () => {
      const result = service.validateEpistemicIntegrity(
        [{ unitType: "claim", content: "Some claim" }],
        [],
      );
      const violation = result.violations.find((v) => v.rule === "no_fabrication");
      expect(violation).toBeDefined();
      expect(violation!.severity).toBe("info");
    });

    it("no info when claims have evidence units", () => {
      const result = service.validateEpistemicIntegrity(
        [
          { unitType: "claim", content: "Some claim" },
          { unitType: "evidence", content: "Some proof" },
        ],
        [],
      );
      const unsupported = result.violations.find(
        (v) => v.rule === "no_fabrication" && v.severity === "info",
      );
      expect(unsupported).toBeUndefined();
    });

    it("warns on certainty language", () => {
      const result = service.validateEpistemicIntegrity(
        [{ unitType: "claim", content: "This is definitely true" }],
        [],
      );
      const violation = result.violations.find((v) => v.rule === "transparent_confidence");
      expect(violation).toBeDefined();
      expect(violation!.message).toContain("definitely");
    });

    it("detects circular reasoning", () => {
      const result = service.validateEpistemicIntegrity(
        [
          { unitType: "claim", content: "A" },
          { unitType: "claim", content: "B" },
        ],
        [
          { subtype: "supports", sourceId: "a", targetId: "b" },
          { subtype: "supports", sourceId: "b", targetId: "a" },
        ],
      );
      const violation = result.violations.find((v) => v.message.includes("Circular"));
      expect(violation).toBeDefined();
    });

    it("passes clean unit sets", () => {
      const result = service.validateEpistemicIntegrity(
        [
          { unitType: "claim", content: "A reasonable hypothesis" },
          { unitType: "evidence", content: "Supporting data" },
        ],
        [{ subtype: "supports", sourceId: "e1", targetId: "c1" }],
      );
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  // ─── CARDINAL_RULES ────────────────────────────────────────────────

  describe("CARDINAL_RULES", () => {
    it("exports all five cardinal rules", () => {
      expect(service.CARDINAL_RULES).toHaveLength(5);
      expect(service.CARDINAL_RULES).toContain("no_fabrication");
      expect(service.CARDINAL_RULES).toContain("preserve_intent");
      expect(service.CARDINAL_RULES).toContain("transparent_confidence");
      expect(service.CARDINAL_RULES).toContain("adversarial_balance");
      expect(service.CARDINAL_RULES).toContain("no_hidden_assumptions");
    });
  });
});
