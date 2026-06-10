import { describe, it, expect } from "vitest";
import { createBotSchema, updateBotSchema } from "../bots";

describe("bot schemas", () => {
  describe("createBotSchema", () => {
    it("accepts valid input", () => {
      const result = createBotSchema.safeParse({
        name: "My Bot",
        platform: "whatsapp",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid platform", () => {
      const result = createBotSchema.safeParse({
        name: "My Bot",
        platform: "invalid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty name", () => {
      const result = createBotSchema.safeParse({
        name: "",
        platform: "whatsapp",
      });
      expect(result.success).toBe(false);
    });

    it("accepts optional config fields", () => {
      const result = createBotSchema.safeParse({
        name: "My Bot",
        platform: "whatsapp",
        system_prompt: "You are helpful",
        temperature: 0.7,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateBotSchema", () => {
    it("accepts partial updates", () => {
      expect(
        updateBotSchema.safeParse({ displayName: "New Name" }).success,
      ).toBe(true);
      expect(updateBotSchema.safeParse({ status: "active" }).success).toBe(
        true,
      );
      expect(updateBotSchema.safeParse({}).success).toBe(true);
    });
  });
});
