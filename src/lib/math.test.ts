import { describe, expect, it } from "vitest";
import { findMath, renderMath } from "./math";

describe("fórmulas LaTeX", () => {
  it("acha fórmulas no meio do texto e em bloco", () => {
    const m = findMath("A área é $\\pi r^2$ e\n$$\nx^2\n$$\nfim");
    expect(m.map((x) => [x.tex, x.display])).toEqual([
      ["\\pi r^2", false],
      ["x^2", true],
    ]);
  });
  it("não confunde dinheiro com fórmula", () => {
    expect(findMath("Custou R$ 10 e depois R$ 20.")).toEqual([]);
    expect(findMath("De $10 a $20")).toEqual([]);
    expect(findMath("Um \\$ literal e $a$")).toHaveLength(1);
  });
  it("desenha com o KaTeX e não quebra com erro de digitação", () => {
    expect(renderMath("x^2", false)).toContain("katex");
    expect(renderMath("\\frac{1}{", false)).toContain("katex-error");
  });
  it("não aceita comandos que criam links ou estilos", () => {
    const html = renderMath("\\href{javascript:alert(1)}{x}", false);
    expect(html).not.toContain("href=");
  });
});
