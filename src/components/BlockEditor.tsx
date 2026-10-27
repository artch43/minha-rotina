import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import type { Block, BlockType } from "../lib/types";
import { getCaret, setCaret, uid } from "../lib/util";
import { closePop, openPop } from "../store";
import { Editable, placeNear } from "./ui";

const BTYPES: [BlockType, string, string][] = [
  ["p", "Texto", "¶"],
  ["h1", "Título 1", "H1"],
  ["h2", "Título 2", "H2"],
  ["h3", "Título 3", "H3"],
  ["ul", "Lista", "•"],
  ["ol", "Lista numerada", "1."],
  ["todo", "Checklist", "☑"],
  ["quote", "Citação", "❝"],
  ["callout", "Destaque", "💡"],
  ["divider", "Divisória", "—"],
];
const LISTY = new Set<BlockType>(["ul", "ol", "todo"]);
const MD: [string, BlockType][] = [
  ["# ", "h1"],
  ["## ", "h2"],
  ["### ", "h3"],
  ["- ", "ul"],
  ["* ", "ul"],
  ["1. ", "ol"],
  ["[] ", "todo"],
  ["[ ] ", "todo"],
  ["> ", "quote"],
];
const HEAD_PH: Partial<Record<BlockType, string>> = { h1: "Título 1", h2: "Título 2", h3: "Título 3" };
const newBlock = (type: BlockType = "p", text = ""): Block => ({
  id: uid(),
  type,
  text,
  ...(type === "todo" ? { checked: false } : {}),
});

export function BlockEditor({
  blocks,
  onChange,
  placeholder = "Escreva algo ou digite / para comandos",
}: {
  blocks: Block[];
  onChange: (b: Block[]) => void;
  placeholder?: string;
}) {
  const fallback = useRef(newBlock());
  const list = blocks.length ? blocks : [fallback.current];
  const root = useRef<HTMLDivElement>(null);
  const focusReq = useRef<{ id: string; off: number | null } | null>(null);
  const [slash, setSlash] = useState<{ id: string; sel: number } | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; after: boolean } | null>(null);

  useLayoutEffect(() => {
    const req = focusReq.current;
    if (!req) return;
    focusReq.current = null;
    const el = root.current?.querySelector<HTMLElement>(`[data-id="${req.id}"] .txt`);
    if (el) setCaret(el, req.off ?? (el.textContent || "").length);
  });

  const commit = (next: Block[], focus?: { id: string; off: number | null }) => {
    if (focus) focusReq.current = focus;
    onChange(next);
  };
  const idx = (id: string) => list.findIndex((b) => b.id === id);
  const patch = (id: string, p: Partial<Block>) => list.map((b) => (b.id === id ? { ...b, ...p } : b));
  const focusAt = (i: number, atEnd: boolean) => {
    const b = list[i];
    const el = b && root.current?.querySelector<HTMLElement>(`[data-id="${b.id}"] .txt`);
    if (el) setCaret(el, atEnd ? (el.textContent || "").length : 0);
  };

  const slashItems = (b: Block) => {
    const q = b.text.slice(1).toLowerCase();
    return BTYPES.filter(([t, n]) => !q || n.toLowerCase().includes(q) || t.includes(q));
  };
  const chooseType = (b: Block, t: BlockType) => {
    setSlash(null);
    if (t === "divider") {
      const nb = newBlock();
      const next = patch(b.id, { type: "divider", text: "" });
      next.splice(idx(b.id) + 1, 0, nb);
      return commit(next, { id: nb.id, off: 0 });
    }
    commit(patch(b.id, { type: t, text: "", ...(t === "todo" ? { checked: false } : {}) }), { id: b.id, off: 0 });
  };

  const onText = (b: Block, text: string) => {
    if (b.type === "p") {
      for (const [pre, t] of MD)
        if (text.startsWith(pre))
          return commit(patch(b.id, { type: t, text: text.slice(pre.length), ...(t === "todo" ? { checked: false } : {}) }), {
            id: b.id,
            off: 0,
          });
      if (text === "---") {
        const nb = newBlock();
        const next = patch(b.id, { type: "divider", text: "" });
        next.splice(idx(b.id) + 1, 0, nb);
        return commit(next, { id: nb.id, off: 0 });
      }
    }
    setSlash(text.startsWith("/") ? { id: b.id, sel: slash?.id === b.id ? slash.sel : 0 } : null);
    commit(patch(b.id, { text }));
  };

  const onKey = (b: Block, e: KeyboardEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (slash?.id === b.id) {
      const items = slashItems(b);
      if (items.length && ["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
        e.preventDefault();
        if (e.key === "Escape") setSlash(null);
        else if (e.key === "Enter") chooseType(b, items[Math.min(slash.sel, items.length - 1)][0]);
        else setSlash({ id: b.id, sel: (slash.sel + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length });
        return;
      }
    }
    const i = idx(b.id),
      off = getCaret(el),
      text = el.textContent || "";
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (LISTY.has(b.type) && !text) return commit(patch(b.id, { type: "p" }), { id: b.id, off: 0 });
      const nb = newBlock(LISTY.has(b.type) ? b.type : "p", text.slice(off));
      const next = patch(b.id, { text: text.slice(0, off) });
      next.splice(i + 1, 0, nb);
      commit(next, { id: nb.id, off: 0 });
    } else if (e.key === "Backspace" && off === 0 && !getSelection()?.toString()) {
      if (b.type !== "p") {
        e.preventDefault();
        return commit(patch(b.id, { type: "p" }), { id: b.id, off: 0 });
      }
      if (i === 0) return;
      e.preventDefault();
      const next = [...list];
      let j = i - 1;
      while (j >= 0 && next[j].type === "divider") {
        next.splice(j, 1);
        j--;
      }
      if (j < 0) return commit(next, { id: b.id, off: 0 });
      const prev = next[j],
        at = prev.text.length;
      next[j] = { ...prev, text: prev.text + text };
      next.splice(
        next.findIndex((x) => x.id === b.id),
        1,
      );
      commit(next, { id: prev.id, off: at });
    } else if (e.key === "ArrowUp" && off === 0 && i > 0) {
      e.preventDefault();
      let j = i - 1;
      while (j > 0 && list[j].type === "divider") j--;
      focusAt(j, true);
    } else if (e.key === "ArrowDown" && off === text.length && i < list.length - 1) {
      e.preventDefault();
      let j = i + 1;
      while (j < list.length - 1 && list[j].type === "divider") j++;
      focusAt(j, false);
    }
  };

  const blockMenu = (anchor: HTMLElement, b: Block) =>
    openPop(
      anchor,
      <>
        <h6>Transformar em</h6>
        {BTYPES.filter(([t]) => t !== "divider").map(([t, n, ic]) => (
          <button
            key={t}
            className={"mi" + (b.type === t ? " sel" : "")}
            onClick={() => {
              closePop();
              commit(patch(b.id, { type: t, ...(t === "todo" ? { checked: !!b.checked } : {}) }), { id: b.id, off: null });
            }}
          >
            <span style={{ width: 24, textAlign: "center" }}>{ic}</span>
            {n}
          </button>
        ))}
        <hr />
        <button
          className="mi"
          onClick={() => {
            closePop();
            const nb = { ...b, id: uid() };
            const next = [...list];
            next.splice(idx(b.id) + 1, 0, nb);
            commit(next, { id: nb.id, off: null });
          }}
        >
          ⧉ Duplicar
        </button>
        <button
          className="mi danger"
          onClick={() => {
            closePop();
            const next = list.filter((x) => x.id !== b.id);
            commit(next.length ? next : [newBlock()]);
          }}
        >
          🗑 Excluir bloco
        </button>
      </>,
    );

  const onDrop = () => {
    if (!drag || !drop || drag === drop.id) return;
    const next = [...list];
    const [m] = next.splice(idx(drag), 1);
    const to = next.findIndex((x) => x.id === drop.id) + (drop.after ? 1 : 0);
    next.splice(to, 0, m);
    commit(next);
  };

  let olN = 0;
  const slashBlock = slash && list.find((b) => b.id === slash.id);
  return (
    <div
      ref={root}
      className="editor solo"
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const last = list[list.length - 1];
        if (last.type === "p" && !last.text) focusAt(list.length - 1, true);
        else {
          const nb = newBlock();
          commit([...list, nb], { id: nb.id, off: 0 });
        }
      }}
    >
      {list.map((b) => {
        olN = b.type === "ol" ? olN + 1 : 0;
        const dropCls = drop?.id === b.id ? (drop.after ? " drop-after" : " drop-before") : "";
        const txt = (
          <Editable
            className="txt"
            value={b.text}
            placeholder={HEAD_PH[b.type] || placeholder}
            onChange={(v) => onText(b, v)}
            onKeyDown={(e) => onKey(b, e)}
            onBlur={() => setTimeout(() => setSlash((s) => (s?.id === b.id ? null : s)), 150)}
          />
        );
        return (
          <div
            key={b.id}
            data-id={b.id}
            className={"blk " + b.type + (b.type === "todo" && b.checked ? " done" : "") + dropCls}
            onDragOver={(e) => {
              if (!drag || drag === b.id) return;
              e.preventDefault();
              const r = e.currentTarget.getBoundingClientRect();
              const after = e.clientY > r.top + r.height / 2;
              if (drop?.id !== b.id || drop.after !== after) setDrop({ id: b.id, after });
            }}
            onDrop={(e) => {
              e.preventDefault();
              onDrop();
              setDrag(null);
              setDrop(null);
            }}
          >
            <button
              className="handle"
              draggable
              title="Arraste para mover · clique para opções"
              aria-label="Mover bloco"
              onClick={(e) => blockMenu(e.currentTarget, b)}
              onDragStart={(e) => {
                setDrag(b.id);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", b.id);
              }}
              onDragEnd={() => {
                setDrag(null);
                setDrop(null);
              }}
            >
              ⋮⋮
            </button>
            {b.type === "divider" ? (
              <hr />
            ) : (
              <>
                {b.type === "ul" && <span className="mk">•</span>}
                {b.type === "ol" && <span className="mk">{olN}.</span>}
                {b.type === "todo" && (
                  <input
                    type="checkbox"
                    checked={!!b.checked}
                    aria-label="Concluído"
                    onChange={(e) => commit(patch(b.id, { checked: e.target.checked }))}
                  />
                )}
                {b.type === "callout" ? (
                  <div className="co">
                    <span>💡</span>
                    {txt}
                  </div>
                ) : (
                  txt
                )}
              </>
            )}
          </div>
        );
      })}
      {slashBlock && (
        <SlashMenu
          items={slashItems(slashBlock)}
          sel={slash!.sel}
          anchorId={slashBlock.id}
          root={root.current}
          onPick={(t) => chooseType(slashBlock, t)}
        />
      )}
    </div>
  );
}

function SlashMenu({
  items,
  sel,
  anchorId,
  root,
  onPick,
}: {
  items: [BlockType, string, string][];
  sel: number;
  anchorId: string;
  root: HTMLDivElement | null;
  onPick: (t: BlockType) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const anchor = root?.querySelector<HTMLElement>(`[data-id="${anchorId}"] .txt`);
    if (ref.current && anchor) placeNear(ref.current, anchor);
  });
  if (!items.length) return null;
  const s = Math.min(sel, items.length - 1);
  return createPortal(
    <div className="pop" role="listbox" ref={ref}>
      <h6>Blocos</h6>
      {items.map(([t, n, ic], k) => (
        <button
          key={t}
          className={"mi" + (k === s ? " sel" : "")}
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(t);
          }}
        >
          <span style={{ width: 24, textAlign: "center" }}>{ic}</span>
          {n}
        </button>
      ))}
    </div>,
    document.body,
  );
}
