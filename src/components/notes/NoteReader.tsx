import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { TAG_RE, parseWiki } from "../../lib/notes";

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A" && /^https?:/i.test(node.getAttribute("href") ?? "")) {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const WIKI = /\[\[([^\]\n]+?)\]\]/g;

export function renderNote(body: string, exists: (title: string) => boolean) {
  // Leave code untouched; turn [[links]] and #tags into clickable anchors everywhere else.
  const parts = body.split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`)/g);
  const md = parts
    .map((p, i) =>
      i % 2
        ? p
        : p
            .replace(WIKI, (_, inner: string) => {
              const { target, heading, alias } = parseWiki(inner);
              const label = alias || target + (heading ? " › " + heading : "");
              return `<a class="wikilink${exists(target) ? "" : " missing"}" data-note="${esc(target)}">${esc(label)}</a>`;
            })
            .replace(
              TAG_RE,
              (_, pre: string, tag: string) => `${pre}<a class="tag-link" data-tag="${esc(tag.toLowerCase())}">#${esc(tag)}</a>`,
            ),
    )
    .join("");
  const html = marked.parse(md, { gfm: true, breaks: true, async: false }) as string;
  return DOMPurify.sanitize(html, { ADD_ATTR: ["data-note", "data-tag", "target"] });
}

export function NoteReader({
  body,
  exists,
  onOpenLink,
  onTag,
}: {
  body: string;
  exists: (title: string) => boolean;
  onOpenLink: (title: string) => void;
  onTag: (tag: string) => void;
}) {
  const html = useMemo(() => renderNote(body, exists), [body, exists]);
  if (!body.trim()) return <p className="muted">Esta nota está vazia. Mude para Edição para escrever.</p>;
  return (
    <div
      className="note-read md"
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={(e) => {
        const a = (e.target as HTMLElement).closest<HTMLElement>("a.wikilink, a.tag-link");
        if (!a) return;
        e.preventDefault();
        if (a.dataset.note) onOpenLink(a.dataset.note);
        else if (a.dataset.tag) onTag(a.dataset.tag);
      }}
    />
  );
}
