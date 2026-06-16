import { describe, it, expect } from "vitest";
import { getById, getKeywordList } from "./sticker-registry";

describe("sticker-registry", () => {
  describe("getById", () => {
    it("returns a sticker for a valid ID", () => {
      const sticker = getById("laugh");
      expect(sticker).not.toBeNull();
      expect(sticker!.id).toBe("laugh");
      expect(sticker!.keywords).toContain("funny");
      expect(sticker!.imagePath).toBe("laugh.png");
      expect(sticker!.alt).toBe("Abhijeet laughing hard");
    });

    it("returns null for an invalid ID", () => {
      expect(getById("nonexistent")).toBeNull();
    });

    it("returns null for an empty string ID", () => {
      expect(getById("")).toBeNull();
    });

    it("returns null for undefined-like strings", () => {
      expect(getById("undefined")).toBeNull();
      expect(getById("null")).toBeNull();
    });

    it("is case-sensitive", () => {
      expect(getById("Laugh")).toBeNull();
      expect(getById("LAUGH")).toBeNull();
    });

    it("returns correct sticker for each known ID", () => {
      const ids = ["laugh", "angry", "cool", "sad", "love"];
      for (const id of ids) {
        const sticker = getById(id);
        expect(sticker).not.toBeNull();
        expect(sticker!.id).toBe(id);
      }
    });
  });

  describe("getKeywordList", () => {
    it("returns a non-empty string", () => {
      const list = getKeywordList();
      expect(list.length).toBeGreaterThan(0);
    });

    it("contains all sticker IDs", () => {
      const list = getKeywordList();
      expect(list).toContain("laugh:");
      expect(list).toContain("angry:");
      expect(list).toContain("cool:");
      expect(list).toContain("sad:");
      expect(list).toContain("love:");
    });

    it("contains keywords for each sticker", () => {
      const list = getKeywordList();
      expect(list).toContain("funny");
      expect(list).toContain("mad");
      expect(list).toContain("swag");
      expect(list).toContain("crying");
      expect(list).toContain("pyaar");
    });

    it("formats each line as 'id: keyword1, keyword2, ...'", () => {
      const list = getKeywordList();
      const lines = list.split("\n");
      expect(lines.length).toBe(5);
      for (const line of lines) {
        expect(line).toMatch(/^\w+: .+$/);
      }
    });
  });
});
