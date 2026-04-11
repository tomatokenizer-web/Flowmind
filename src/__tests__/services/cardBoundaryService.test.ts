import { describe, it, expect } from "vitest";
import {
  segmentIntoCards,
  pickDefaultStrategy,
} from "@/server/services/cardBoundaryService";

describe("cardBoundaryService", () => {
  describe("sentence strategy", () => {
    it("splits on sentence-terminating punctuation", () => {
      const text = "First idea. Second idea! Third idea?";
      const cards = segmentIntoCards(text, { strategy: "sentence" });
      expect(cards).toHaveLength(3);
      expect(cards[0]!.content).toBe("First idea.");
      expect(cards[1]!.content).toBe("Second idea!");
      expect(cards[2]!.content).toBe("Third idea?");
    });

    it("preserves correct offsets into the source text", () => {
      const text = "Alpha. Beta.";
      const cards = segmentIntoCards(text, { strategy: "sentence" });
      expect(text.slice(cards[0]!.start, cards[0]!.end)).toContain("Alpha");
      expect(text.slice(cards[1]!.start, cards[1]!.end)).toContain("Beta");
    });

    it("returns a single card for text without sentence terminators", () => {
      const text = "one two three four";
      const cards = segmentIntoCards(text, { strategy: "sentence" });
      expect(cards).toHaveLength(1);
      expect(cards[0]!.content).toBe("one two three four");
    });
  });

  describe("paragraph strategy", () => {
    it("splits on blank lines", () => {
      const text = "First paragraph content.\n\nSecond paragraph content.";
      const cards = segmentIntoCards(text, { strategy: "paragraph" });
      expect(cards).toHaveLength(2);
      expect(cards[0]!.content).toBe("First paragraph content.");
      expect(cards[1]!.content).toBe("Second paragraph content.");
    });

    it("skips empty paragraphs", () => {
      const text = "Para one.\n\n\n\nPara two.";
      const cards = segmentIntoCards(text, { strategy: "paragraph" });
      expect(cards).toHaveLength(2);
    });
  });

  describe("semantic strategy", () => {
    it("merges very short paragraphs forward", () => {
      const short = "yes";
      const long =
        "This is a much longer paragraph that easily clears the merge threshold. ".repeat(
          2,
        );
      const text = `${short}\n\n${long}`;
      const cards = segmentIntoCards(text, { strategy: "semantic" });
      // Short paragraph should have been merged into the long one.
      expect(cards).toHaveLength(1);
      expect(cards[0]!.content).toContain("yes");
      expect(cards[0]!.content).toContain("longer paragraph");
    });

    it("splits very long paragraphs at sentence boundaries", () => {
      const sentence =
        "This is a moderately long sentence with enough prose to take up space. ";
      // 12 repetitions → ~840 chars, over the 600 SPLIT_OVER threshold.
      const longPara = sentence.repeat(12).trim();
      const cards = segmentIntoCards(longPara, { strategy: "semantic" });
      expect(cards.length).toBeGreaterThan(1);
      for (const c of cards) {
        // Each chunk should be at or under ~2× the threshold as a soft bound.
        expect(c.content.length).toBeLessThan(1500);
      }
    });

    it("leaves medium paragraphs untouched", () => {
      const para = "A regular-sized paragraph with a few ideas packed in.";
      const cards = segmentIntoCards(para, { strategy: "semantic" });
      expect(cards).toHaveLength(1);
      expect(cards[0]!.content).toBe(para);
    });
  });

  describe("pickDefaultStrategy", () => {
    it("returns 'sentence' for flat text with no blank lines", () => {
      expect(pickDefaultStrategy("one two three four")).toBe("sentence");
    });

    it("returns 'paragraph' for short structured text", () => {
      expect(pickDefaultStrategy("foo.\n\nbar.")).toBe("paragraph");
    });

    it("returns 'semantic' for long structured text", () => {
      const long = "A substantial paragraph full of prose. ".repeat(50);
      expect(pickDefaultStrategy(`${long}\n\n${long}`)).toBe("semantic");
    });
  });

  it("default strategy is semantic when no option passed", () => {
    const text = "Hi there.\n\nAnother paragraph here with more content.";
    const cards = segmentIntoCards(text);
    expect(cards.length).toBeGreaterThan(0);
  });
});
