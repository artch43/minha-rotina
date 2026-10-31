import { describe, expect, it } from "vitest";
import { parseBackup } from "./backup";
import { sampleWorkspace as template } from "./sampleWorkspace";

describe("backup", () => {
  it("lê um backup exportado", () => {
    const ws = template();
    const back = parseBackup(JSON.stringify({ app: "organizer", workspace: ws }));
    expect(back.pages.length).toBe(ws.pages.length);
    expect(Object.keys(back.items)).toEqual(Object.keys(ws.items));
  });
  it("recusa arquivos que não são backup", () => {
    expect(() => parseBackup("{}")).toThrow("não é um backup");
    expect(() => parseBackup("oi")).toThrow("JSON válido");
  });
});
