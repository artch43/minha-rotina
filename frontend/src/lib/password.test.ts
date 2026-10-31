import { describe, expect, it } from "vitest";
import { passwordProblem, passwordRules } from "./password";

describe("senha forte", () => {
  it("recusa menos de 8 caracteres, mesmo com número", () => {
    expect(passwordProblem("abcde12")).toMatch(/8 caracteres/);
  });
  it("recusa 8 caracteres sem número", () => {
    expect(passwordProblem("abcdefgh")).toMatch(/número/);
  });
  it("aceita 8 caracteres com número", () => {
    expect(passwordProblem("abcdefg1")).toBeNull();
    expect(passwordRules("abcdefg1").every((r) => r.ok)).toBe(true);
  });
});
