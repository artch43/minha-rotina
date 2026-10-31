import { describe, expect, it } from "vitest";
import { boardFolderList, extractTags, folderList, headings, plainSnippet, uniqueTitle } from "./notes";
import { sampleWorkspace as template } from "./sampleWorkspace";
import { attachmentMarkdown, kindOf } from "./attachments";
import type { Note } from "./types";

const note = (id: string, title: string, body: string, folder = ""): Note => ({
  id,
  title,
  body,
  folder,
  created: 0,
  updated: 0,
});

describe("anotações", () => {
  it("encontra tags, mas não títulos nem cores", () => {
    expect(extractTags("# Título\nEstudar #história e #prova-1 hoje. Cor #123 não. (#Revisão)")).toEqual([
      "história",
      "prova-1",
      "revisão",
    ]);
  });
  it("lista os títulos para o sumário, fora de blocos de código", () => {
    expect(headings("# A\ntexto\n```\n# não\n```\n## B").map((h) => h.text)).toEqual(["A", "B"]);
  });
  it("cria títulos únicos e lista pastas com os pais", () => {
    const notes = { a: note("a", "Sem título", "", "Faculdade/Cálculo") };
    expect(uniqueTitle(notes, "Sem título")).toBe("Sem título 2");
    expect(folderList(notes, ["Diário"])).toEqual(["Diário", "Faculdade", "Faculdade/Cálculo"]);
  });
});

describe("prévia das notas", () => {
  it("tira marcações do Markdown", async () => {
    const { plainSnippet, ago } = await import("./notes");
    expect(plainSnippet("# Título\n- [ ] fazer **isso** com [[Outra nota|apelido]] e [site](https://x.com)\n`código`")).toBe(
      "Título fazer isso com apelido e site",
    );
    expect(ago(Date.now() - 30_000)).toBe("agora");
    expect(ago(Date.now() - 3 * 3600_000)).toBe("há 3 h");
    expect(ago(Date.now() - 86400_000 - 1000)).toBe("ontem");
  });
  it("prévia sem colchetes de links antigos", () => {
    expect(plainSnippet("Ver [[Iluminismo|o Iluminismo]] e **isto**")).toBe("Ver o Iluminismo e isto");
  });
});

describe("pastas de listas", () => {
  it("junta as pastas das listas e as vazias, com os pais", () => {
    const ws = template();
    ws.pages.push({ id: "b", title: "Cálculo", icon: "📐", type: "db", parent: null, order: 9, folder: "Faculdade/2º semestre" });
    ws.settings.boardFolders = ["Casa"];
    expect(boardFolderList(ws)).toEqual(["Casa", "Faculdade", "Faculdade/2º semestre"]);
  });
});

describe("anexos", () => {
  it("aceita só imagens e PDF", () => {
    expect(kindOf("image/png")).toBe("image");
    expect(kindOf("application/pdf")).toBe("pdf");
    expect(kindOf("text/plain")).toBeNull();
    expect(kindOf("image/svg+xml")).toBeNull();
  });
  it("escreve a referência no texto da nota", () => {
    expect(attachmentMarkdown({ id: "x1", name: "foto [1].jpg", kind: "image" })).toBe("![foto  1 .jpg](anexo:x1)");
    expect(attachmentMarkdown({ id: "p2", name: "contrato.pdf", kind: "pdf" })).toBe("[📄 contrato.pdf](anexo:p2)");
  });
});
