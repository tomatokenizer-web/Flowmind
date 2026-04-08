import { describe, it, expect } from "vitest";
import { createDomainTemplateService } from "@/server/services/domainTemplateService";

// Service methods that don't need DB
const svc = createDomainTemplateService(null as never);

describe("domainTemplateService", () => {
  describe("getBuiltInTemplates", () => {
    it("returns exactly 5 built-in templates", () => {
      const templates = svc.getBuiltInTemplates();
      expect(templates).toHaveLength(5);
    });

    it("includes all 5 expected domains", () => {
      const slugs = svc.getBuiltInTemplates().map((t) => t.slug);
      expect(slugs).toContain("academic-research");
      expect(slugs).toContain("legal-analysis");
      expect(slugs).toContain("strategic-decision");
      expect(slugs).toContain("creative-writing");
      expect(slugs).toContain("software-design");
    });

    it("each template has required fields", () => {
      for (const t of svc.getBuiltInTemplates()) {
        expect(t.slug).toBeTruthy();
        expect(t.name).toBeTruthy();
        expect(t.description).toBeTruthy();
        expect(t.unitTypes.length).toBeGreaterThan(0);
        expect(t.relations.length).toBeGreaterThan(0);
        expect(t.scaleLevels.length).toBeGreaterThan(0);
        expect(t.scaffoldQuestions.length).toBeGreaterThan(0);
        expect(t.assemblyFormats.length).toBeGreaterThan(0);
        expect(t.expectedTopology.primary).toBeTruthy();
        expect(t.navigatorPriority.length).toBeGreaterThan(0);
        expect(t.gapDetectionRules.length).toBeGreaterThan(0);
        expect(["strict", "guided", "open"]).toContain(t.constraintLevel);
      }
    });
  });

  describe("getTemplateConfig", () => {
    it("returns config for valid slug", () => {
      const config = svc.getTemplateConfig("academic-research");
      expect(config).toBeDefined();
      expect(config!.name).toBe("Academic Research");
    });

    it("returns undefined for invalid slug", () => {
      expect(svc.getTemplateConfig("nonexistent")).toBeUndefined();
    });
  });

  describe("getAvailableUnitTypes", () => {
    it("includes 8 core types for any template", () => {
      const types = svc.getAvailableUnitTypes("academic-research");
      const coreTypes = types.filter((t) => !t.isDomain);
      expect(coreTypes).toHaveLength(8);
      expect(coreTypes.map((t) => t.type)).toContain("claim");
      expect(coreTypes.map((t) => t.type)).toContain("question");
    });

    it("includes domain-specific types", () => {
      const types = svc.getAvailableUnitTypes("academic-research");
      const domainTypes = types.filter((t) => t.isDomain);
      expect(domainTypes.length).toBeGreaterThan(0);
      expect(domainTypes.map((t) => t.type)).toContain("hypothesis");
    });

    it("returns only core types for unknown template", () => {
      const types = svc.getAvailableUnitTypes("nonexistent");
      expect(types).toHaveLength(8);
      expect(types.every((t) => !t.isDomain)).toBe(true);
    });
  });

  describe("getScaleLevels", () => {
    it("returns scale levels for academic-research", () => {
      const levels = svc.getScaleLevels("academic-research");
      expect(levels).toHaveLength(5);
      expect(levels[0]!.name).toBe("Raw Data");
      expect(levels[4]!.name).toBe("Paradigm");
    });

    it("scale ranges cover 0-10 without gaps", () => {
      const levels = svc.getScaleLevels("academic-research");
      expect(levels[0]!.range[0]).toBe(0.0);
      expect(levels[levels.length - 1]!.range[1]).toBe(10.0);
    });

    it("legal analysis has 4 levels", () => {
      expect(svc.getScaleLevels("legal-analysis")).toHaveLength(4);
    });

    it("returns empty for unknown template", () => {
      expect(svc.getScaleLevels("nonexistent")).toHaveLength(0);
    });
  });

  describe("getAssemblyFormats", () => {
    it("academic-research has IMRaD and Literature Review", () => {
      const formats = svc.getAssemblyFormats("academic-research");
      expect(formats.map((f) => f.slug)).toContain("imrad");
      expect(formats.map((f) => f.slug)).toContain("literature-review");
    });

    it("legal-analysis has IRAC", () => {
      const formats = svc.getAssemblyFormats("legal-analysis");
      expect(formats.map((f) => f.slug)).toContain("irac");
    });

    it("each format has slots and compass rules", () => {
      for (const t of svc.getBuiltInTemplates()) {
        for (const f of t.assemblyFormats) {
          expect(f.slots.length).toBeGreaterThan(0);
          expect(f.compassRules.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("resolveCoreType", () => {
    it("returns core type for domain extension type", () => {
      expect(svc.resolveCoreType("academic-research", "hypothesis")).toBe("claim");
      expect(svc.resolveCoreType("legal-analysis", "legal_rule")).toBe("definition");
      expect(svc.resolveCoreType("creative-writing", "plot_event")).toBe("evidence");
    });

    it("returns same type for core types", () => {
      expect(svc.resolveCoreType("academic-research", "claim")).toBe("claim");
      expect(svc.resolveCoreType("academic-research", "question")).toBe("question");
    });

    it("returns input for unknown types", () => {
      expect(svc.resolveCoreType("academic-research", "unknown_type")).toBe("unknown_type");
    });
  });

  describe("getExpectedTopology", () => {
    it("academic-research expects convergent", () => {
      const topo = svc.getExpectedTopology("academic-research");
      expect(topo!.primary).toBe("convergent");
      expect(topo!.forbidden).toContain("clique");
    });

    it("legal-analysis forbids mesh", () => {
      const topo = svc.getExpectedTopology("legal-analysis");
      expect(topo!.forbidden).toContain("mesh");
      expect(topo!.meshOkUntil).toBeNull();
    });

    it("creative-writing allows all topologies", () => {
      const topo = svc.getExpectedTopology("creative-writing");
      expect(topo!.forbidden).toHaveLength(0);
      expect(topo!.meshOkUntil).toBe("mature");
    });
  });

  describe("getGapDetectionRules", () => {
    it("returns rules for each template", () => {
      for (const t of svc.getBuiltInTemplates()) {
        const rules = svc.getGapDetectionRules(t.slug);
        expect(rules.length).toBeGreaterThan(0);
      }
    });
  });
});
