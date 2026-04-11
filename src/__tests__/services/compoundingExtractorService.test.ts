import { describe, it, expect } from "vitest";
import { extractCandidates } from "@/server/services/compoundingExtractorService";

describe("compoundingExtractorService", () => {
  describe("extractCandidates", () => {
    it("classifies interrogative sentences as questions", () => {
      const text = "What happens if we change the approach entirely now?";
      const candidates = extractCandidates(text, { minLength: 10 });
      expect(candidates).toHaveLength(1);
      expect(candidates[0]!.suggestedType).toBe("question");
    });

    it("classifies sentences with definitional phrases as definitions", () => {
      const text = "Entropy is defined as a measure of disorder in a system.";
      const candidates = extractCandidates(text);
      expect(candidates[0]!.suggestedType).toBe("definition");
    });

    it("classifies sentences with research markers as evidence", () => {
      const text = "According to the 2023 climate study, global temperatures rose by 1.2 degrees.";
      const candidates = extractCandidates(text);
      expect(candidates[0]!.suggestedType).toBe("evidence");
    });

    it("classifies TODO language as action", () => {
      const text = "TODO: rewrite the onboarding flow before launch next month.";
      const candidates = extractCandidates(text);
      expect(candidates[0]!.suggestedType).toBe("action");
    });

    it("classifies contrasting sentences as counterargument", () => {
      const text = "However, the data shows a different trend entirely in practice.";
      const candidates = extractCandidates(text);
      expect(candidates[0]!.suggestedType).toBe("counterargument");
    });

    it("falls back to claim for declarative sentences with no pattern", () => {
      const text = "The sky contains nitrogen and oxygen in measurable quantities today.";
      const candidates = extractCandidates(text);
      expect(candidates[0]!.suggestedType).toBe("claim");
      expect(candidates[0]!.confidence).toBeLessThan(0.5);
    });

    it("respects minLength filter", () => {
      const text = "Short. This is a much longer sentence that should be kept indeed.";
      const candidates = extractCandidates(text, { minLength: 30 });
      expect(candidates).toHaveLength(1);
      expect(candidates[0]!.suggestedContent).toContain("longer sentence");
    });

    it("respects maxLength filter", () => {
      const longSentence = "a".repeat(400) + ".";
      const candidates = extractCandidates(longSentence, { maxLength: 280 });
      expect(candidates).toHaveLength(0);
    });

    it("filters overlap with existing unit contents", () => {
      const text = "The ozone layer protects us from UV radiation at altitude.";
      const candidates = extractCandidates(text, {
        existingUnitContents: [
          "The ozone layer protects us from UV radiation at altitude.",
        ],
      });
      expect(candidates).toHaveLength(0);
    });

    it("keeps candidates that are not similar to existing units", () => {
      const text = "Photosynthesis converts carbon dioxide into oxygen in plant cells.";
      const candidates = extractCandidates(text, {
        existingUnitContents: ["Completely unrelated content about finance markets."],
      });
      expect(candidates).toHaveLength(1);
    });

    it("reports sourcePosition for each candidate", () => {
      const text = "First sentence here indeed. Second sentence follows here.";
      const candidates = extractCandidates(text);
      expect(candidates[0]!.sourcePosition.start).toBeGreaterThanOrEqual(0);
      expect(candidates[0]!.sourcePosition.end).toBeGreaterThan(
        candidates[0]!.sourcePosition.start,
      );
    });

    it("respects limit option", () => {
      const text = Array(30)
        .fill(0)
        .map((_, i) => `This is candidate sentence number ${i} with enough length.`)
        .join(" ");
      const candidates = extractCandidates(text, { limit: 5 });
      expect(candidates).toHaveLength(5);
    });

    it("provides extractionReason for every candidate", () => {
      const text = "What is consciousness really? For example, consider qualia and phenomenal awareness.";
      const candidates = extractCandidates(text);
      for (const c of candidates) {
        expect(c.extractionReason.length).toBeGreaterThan(0);
      }
    });
  });
});
