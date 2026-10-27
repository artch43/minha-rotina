import type { Color, Group, PropType } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
export const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const today = () => ymd(new Date());
export const parseD = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s: string, n: number) => {
  const d = parseD(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
export const diffDays = (a: string, b: string) => Math.round((parseD(a).getTime() - parseD(b).getTime()) / 864e5);

export const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
export const DOW = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function fmtDate(v: string) {
  if (!v) return "";
  const d = v.slice(0, 10),
    t = v.slice(11, 16),
    dd = diffDays(d, today());
  const date = parseD(d);
  let s =
    dd === 0 ? "Hoje" : dd === 1 ? "Amanhã" : dd === -1 ? "Ontem" : date.getDate() + " " + MONTHS[date.getMonth()].slice(0, 3);
  if (Math.abs(dd) > 1 && date.getFullYear() !== new Date().getFullYear()) s += " " + date.getFullYear();
  return t ? s + ", " + t : s;
}

export const COLORS: Color[] = ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"];
export const COLOR_NAMES: Record<Color, string> = {
  gray: "Cinza",
  brown: "Marrom",
  orange: "Laranja",
  yellow: "Amarelo",
  green: "Verde",
  blue: "Azul",
  purple: "Roxo",
  pink: "Rosa",
  red: "Vermelho",
};
export const GROUPS: Record<Group, string> = { todo: "A fazer", doing: "Em andamento", done: "Concluído", review: "Revisar" };
export const PTYPES: Record<PropType, string> = {
  status: "Status",
  select: "Seleção",
  multi: "Etiquetas",
  date: "Data",
  checkbox: "Caixa de seleção",
  number: "Número",
  text: "Texto",
  url: "Link",
};
export const PICONS: Record<PropType, string> = {
  status: "◐",
  select: "▾",
  multi: "≡",
  date: "▦",
  checkbox: "☑",
  number: "#",
  text: "¶",
  url: "↗",
};
export const INTERVALS = [1, 7, 30];
export const EMOJIS =
  "📚 📖 ✏️ 🧠 🧪 🧮 🌍 🗣️ 💼 📊 🗂️ ✅ 📅 ⏰ 🏥 🦷 🏃 🧘 🌱 💧 🍎 🎯 💡 🚀 🎵 🎨 🏠 🛒 💰 ✈️ ❤️ ⭐ 🔥 📝 📌 🧩 💻 📈 🎓 ☕".split(
    " ",
  );
export const COVERS = ["grid", "dots", "lake", "dusk", "moss", "ink"];
export const ACCENTS: Record<string, [string, string]> = {
  ink: ["#3352c9", "Tinta"],
  forest: ["#2c7a52", "Floresta"],
  plum: ["#8a3a8c", "Ameixa"],
  amber: ["#a86200", "Âmbar"],
  graphite: ["#3b4250", "Grafite"],
  coral: ["#c33c4f", "Coral"],
};

/* Cursor helpers for plain-text contentEditable elements */
export function getCaret(el: HTMLElement) {
  const sel = getSelection();
  if (!sel || !sel.rangeCount) return 0;
  const r = sel.getRangeAt(0);
  if (!el.contains(r.endContainer)) return 0;
  const pre = r.cloneRange();
  pre.selectNodeContents(el);
  pre.setEnd(r.endContainer, r.endOffset);
  return pre.toString().length;
}
export function setCaret(el: HTMLElement, off: number) {
  el.focus();
  const sel = getSelection(),
    r = document.createRange();
  if (!sel) return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n: Text | null,
    left = off;
  while ((n = walker.nextNode() as Text | null)) {
    if (left <= n.length) {
      r.setStart(n, left);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      return;
    }
    left -= n.length;
  }
  r.selectNodeContents(el);
  r.collapse(false);
  sel.removeAllRanges();
  sel.addRange(r);
}
export function plainPaste(e: React.ClipboardEvent) {
  e.preventDefault();
  document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
}
