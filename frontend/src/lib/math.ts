import katex from "katex";

/** LaTeX in notes, written like in Obsidian: $x^2$ inside a line, $$…$$ for a formula on its own. */
export type MathMatch = { from: number; to: number; tex: string; display: boolean };

// $$…$$ (may span lines). Inline: no space right after the opening $ or before the closing one,
// and no digit right after it, so "R$ 10 e R$ 20" stays text. \$ is a literal dollar.
const MATH = /\$\$([\s\S]+?)\$\$|(?<![\\$])\$(?![\s$])((?:\\\$|[^$\n])+?)(?<![\s\\])\$(?![\d$])/g;

export function findMath(text: string): MathMatch[] {
  const out: MathMatch[] = [];
  for (const m of text.matchAll(MATH)) {
    const display = m[1] !== undefined;
    const tex = (display ? m[1] : m[2]).trim();
    if (tex) out.push({ from: m.index!, to: m.index! + m[0].length, tex, display });
  }
  return out;
}

const cache = new Map<string, string>();

/** KaTeX's HTML for a formula. Mistakes show in red instead of breaking the note. */
export function renderMath(tex: string, display: boolean) {
  const key = (display ? "D" : "I") + tex;
  let html = cache.get(key);
  if (html === undefined) {
    html = katex.renderToString(tex, { displayMode: display, throwOnError: false, trust: false, strict: "ignore" });
    if (cache.size > 500) cache.clear();
    cache.set(key, html);
  }
  return html;
}
