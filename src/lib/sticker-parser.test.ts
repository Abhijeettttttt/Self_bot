import { describe, it, expect } from "vitest";
import { parseStickerResponse } from "./sticker-parser";

describe("parseStickerResponse", () => {
  it("returns text unchanged when no sticker tags are present", () => {
    const result = parseStickerResponse("Hello bhai, kya haal h?");
    expect(result.text).toBe("Hello bhai, kya haal h?");
    expect(result.stickerId).toBeUndefined();
  });

  it("extracts a single sticker ID and removes the tag", () => {
    const result = parseStickerResponse("Haha nice one [STICKER:laugh]");
    expect(result.text).toBe("Haha nice one");
    expect(result.stickerId).toBe("laugh");
  });

  it("extracts only the first sticker ID when multiple tags exist", () => {
    const result = parseStickerResponse(
      "Bro [STICKER:cool] that was epic [STICKER:laugh]"
    );
    expect(result.text).toBe("Bro  that was epic");
    expect(result.stickerId).toBe("cool");
  });

  it("removes all sticker tags from text even when only first ID is used", () => {
    const result = parseStickerResponse(
      "[STICKER:angry] Kya kar rha h tu [STICKER:facepalm] seriously"
    );
    expect(result.text).toBe("Kya kar rha h tu  seriously");
    expect(result.stickerId).toBe("angry");
  });

  it("handles sticker tag at the beginning of text", () => {
    const result = parseStickerResponse("[STICKER:wave] Hey!");
    expect(result.text).toBe("Hey!");
    expect(result.stickerId).toBe("wave");
  });

  it("handles sticker tag at the end of text", () => {
    const result = parseStickerResponse("See ya later [STICKER:wave]");
    expect(result.text).toBe("See ya later");
    expect(result.stickerId).toBe("wave");
  });

  it("handles empty string input", () => {
    const result = parseStickerResponse("");
    expect(result.text).toBe("");
    expect(result.stickerId).toBeUndefined();
  });

  it("handles text that is only a sticker tag", () => {
    const result = parseStickerResponse("[STICKER:laugh]");
    expect(result.text).toBe("");
    expect(result.stickerId).toBe("laugh");
  });

  it("handles sticker IDs with hyphens and numbers", () => {
    const result = parseStickerResponse("Nice [STICKER:thumbs-up-2]");
    expect(result.text).toBe("Nice");
    expect(result.stickerId).toBe("thumbs-up-2");
  });

  it("does not match malformed sticker patterns", () => {
    // Missing closing bracket
    const result1 = parseStickerResponse("This is [STICKER:laugh and more text");
    expect(result1.text).toBe("This is [STICKER:laugh and more text");
    expect(result1.stickerId).toBeUndefined();

    // Missing colon
    const result2 = parseStickerResponse("This is [STICKERlaugh]");
    expect(result2.text).toBe("This is [STICKERlaugh]");
    expect(result2.stickerId).toBeUndefined();

    // Empty ID
    const result3 = parseStickerResponse("This is [STICKER:]");
    expect(result3.text).toBe("This is [STICKER:]");
    expect(result3.stickerId).toBeUndefined();
  });

  it("trims whitespace from cleaned text", () => {
    const result = parseStickerResponse("  Hello  [STICKER:wave]  ");
    expect(result.text).toBe("Hello");
    expect(result.stickerId).toBe("wave");
  });
});
