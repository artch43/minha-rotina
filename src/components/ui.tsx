import { useEffect, useLayoutEffect, useRef, type ReactNode, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { closePop, usePop, useStore } from "../store";
import type { Option } from "../lib/types";
import { plainPaste } from "../lib/util";

export function placeNear(el: HTMLElement, anchor: HTMLElement) {
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth, h = el.offsetHeight;
  let y = r.bottom + 6;
  if (y + h > innerHeight - 12) y = Math.max(12, r.top - h - 6);
  el.style.left = Math.max(12, Math.min(r.left, innerWidth - w - 12)) + "px";
  el.style.top = y + "px";
}

export function PopHost() {
  const pop = usePop((s) => s.pop);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (pop && ref.current && pop.anchor.isConnected) placeNear(ref.current, pop.anchor); });
  useEffect(() => {
    if (!pop) return;
    const down = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current && !ref.current.contains(t) && !pop.anchor.contains(t)) closePop();
    };
    const key = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); closePop(); } };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key, true);
    if (!matchMedia("(hover: none)").matches) setTimeout(() => ref.current?.querySelector<HTMLInputElement>("input.inp")?.focus(), 10);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key, true); };
  }, [pop?.id]);
  if (!pop) return null;
  return createPortal(<div className="pop" role="menu" ref={ref} key={pop.id}>{pop.node}</div>, document.body);
}

export function Toast() {
  const msg = useStore((s) => s.ui.toast);
  return msg ? <div className="toast" role="status">{msg}</div> : null;
}

export function Tag({ opt, status }: { opt?: Option; status?: boolean }) {
  if (!opt) return null;
  return <span className={"tag" + (status ? " status" : "")} data-c={opt.color}>{opt.name}</span>;
}

/** Plain-text contentEditable that never resets the caret while you type. */
export function Editable(props: {
  value: string; onChange: (v: string) => void; className?: string; placeholder?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void; onBlur?: () => void; label?: string; singleLine?: boolean; autoFocus?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current!;
    el.contentEditable = "plaintext-only";
    if (el.contentEditable !== "plaintext-only") el.contentEditable = "true";
    if (props.autoFocus) el.focus();
  }, []);
  useLayoutEffect(() => {
    const el = ref.current!;
    if (el.textContent !== props.value) el.textContent = props.value;
  }, [props.value]);
  return (
    <div
      ref={ref}
      className={props.className}
      data-ph={props.placeholder}
      role="textbox"
      aria-label={props.label}
      spellCheck
      suppressContentEditableWarning
      onInput={(e) => {
        let v = e.currentTarget.textContent || "";
        if (props.singleLine && v.includes("\n")) { v = v.replace(/\n/g, ""); e.currentTarget.textContent = v; }
        props.onChange(v);
      }}
      onPaste={plainPaste}
      onKeyDown={props.onKeyDown}
      onBlur={props.onBlur}
    />
  );
}

export function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog">{children}</div>
    </>
  );
}

export function Confirm({ text, onYes, onNo, yes = "Excluir" }: { text: string; onYes: () => void; onNo?: () => void; yes?: string }) {
  return (
    <div className="confirmbar">
      <span className="small">{text}</span>
      <button className="btn" onClick={onYes}>{yes}</button>
      {onNo && <button className="ghostbtn" onClick={onNo}>Cancelar</button>}
    </div>
  );
}
