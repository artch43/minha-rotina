import { describe, expect, it } from "vitest";
import { backlinks, extractLinks, extractTags, folderList, headings, renameLinks, uniqueTitle } from "./notes";
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
  it("encontra links, inclusive com apelido e seção, ignorando código", () => {
    expect(extractLinks("Ver [[Iluminismo]] e [[Revolução Francesa#Causas|causas]]. `[[Não]]`")).toEqual([
      "Iluminismo",
      "Revolução Francesa",
    ]);
  });
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
  it("mostra menções (backlinks) com um trecho", () => {
    const notes = {
      a: note("a", "Iluminismo", ""),
      b: note("b", "Revolução", "Influência do [[iluminismo|Iluminismo]] francês"),
    };
    const bl = backlinks(notes, notes.a);
    expect(bl.map((x) => x.note.id)).toEqual(["b"]);
    expect(bl[0].snippet).toBe("Influência do Iluminismo francês");
  });
  it("atualiza links ao renomear, mantendo seção e apelido", () => {
    expect(renameLinks("[[Velho]] e [[velho#Parte|aqui]] e [[Outro]]", "Velho", "Novo")).toBe(
      "[[Novo]] e [[Novo#Parte|aqui]] e [[Outro]]",
    );
  });
  it("cria títulos únicos e lista pastas com os pais", () => {
    const notes = { a: note("a", "Sem título", "", "Faculdade/Cálculo") };
    expect(uniqueTitle(notes, "Sem título")).toBe("Sem título 2");
    expect(folderList(notes, ["Diário"])).toEqual(["Diário", "Faculdade", "Faculdade/Cálculo"]);
  });
});
