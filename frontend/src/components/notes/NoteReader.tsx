import { useEffect, useMemo, useRef } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { TAG_RE, parseWiki } from "../../lib/notes";
import { ATTACH_PREFIX, resolveIn } from "../../lib/attachments";
import { findMath, renderMath } from "../../lib/math";
import "katex/dist/katex.min.css";

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  // Attached files: keep the id aside so the browser doesn't try to load "anexo:..." itself.
  const src = node.getAttribute("src") ?? "";
  if (node.tagName === "IMG" && src.startsWith(ATTACH_PREFIX)) {
    node.setAttribute("data-anexo", src.slice(ATTACH_PREFIX.length));
    node.removeAttribute("src");
  }
  if (node.tagName === "A" && /^https?:/i.test(node.getAttribute("href") ?? "")) {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

// DOMPurify's default list plus "anexo:", the reference to a file attached to the note.
const URI_OK = /^(?:(?:(?:f|ht)tps?|mailto|tel|anexo):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const WIKI = /\[\[([^\]\n]+?)\]\]/g;

export function renderNote(body: string) {
  // Leave code untouched; old [[links]] become plain text and #tags become clickable everywhere else.
  const parts = body.split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`)/g);
  // Formulas are set aside first (Markdown would mangle _ and *), then put back already rendered.
  const formulas: { tex: string; display: boolean }[] = [];
  const holdMath = (text: string) => {
    let out = "",
      at = 0;
    for (const m of findMath(text)) {
      const k = formulas.push(m) - 1;
      out += text.slice(at, m.from) + (m.display ? `\n\n<div data-math="${k}"></div>\n\n` : `<span data-math="${k}"></span>`);
      at = m.to;
    }
    return out + text.slice(at);
  };
  const md = parts
    .map((p, i) =>
      i % 2
        ? p
        : holdMath(p)
            .replace(WIKI, (_, inner: string) => {
              const { target, alias } = parseWiki(inner);
              return esc(alias || target);
            })
            .replace(
              TAG_RE,
              (_, pre: string, tag: string) => `${pre}<a class="tag-link" data-tag="${esc(tag.toLowerCase())}">#${esc(tag)}</a>`,
            ),
    )
    .join("");
  const html = marked.parse(md, { gfm: true, breaks: true, async: false }) as string;
  const clean = DOMPurify.sanitize(html, {
    ADD_ATTR: ["data-tag", "data-anexo", "data-math", "target"],
    ALLOWED_URI_REGEXP: URI_OK,
  });
  // KaTeX's own output (trust off: no links, classes or styles taken from the formula).
  return clean.replace(/<(div|span) data-math="(\d+)"><\/\1>/g, (whole, _tag: string, k: string) => {
    const f = formulas[Number(k)];
    return f ? `<${_tag} class="math${f.display ? " math-block" : ""}">${renderMath(f.tex, f.display)}</${_tag}>` : whole;
  });
}

export function NoteReader({ body, onTag }: { body: string; onTag: (tag: string) => void }) {
  const html = useMemo(() => renderNote(body), [body]);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) resolveIn(ref.current);
  }, [html]);
  if (!body.trim()) return <p className="muted">Esta nota está vazia. Mude para Edição para escrever.</p>;
  return (
    <div
      ref={ref}
      className="note-read md"
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={(e) => {
        const a = (e.target as HTMLElement).closest<HTMLElement>("a.tag-link");
        if (!a) return;
        e.preventDefault();
        if (a.dataset.tag) onTag(a.dataset.tag);
      }}
    />
  );
}
