/**
 * Drag and drop on touch screens. Phones and tablets don't fire the browser's drag events, so
 * every [draggable] in the app would be stuck there. This turns a long press (hold ~0.35 s, then
 * move) into those same events — dragstart, dragenter/dragover/dragleave, drop, dragend — with a
 * real DataTransfer, so the existing handlers (board columns, calendar days, sidebar lists and
 * folders) work unchanged. A quick swipe still scrolls; a tap still clicks.
 */

const HOLD_MS = 350;
const SLOP_PX = 8;
const EDGE_PX = 48;
const SCROLL_STEP = 14;

type Drag = {
  source: HTMLElement;
  dt: DataTransfer;
  ghost: HTMLElement;
  dx: number;
  dy: number;
  over: Element | null;
  accepted: boolean;
  x: number;
  y: number;
  raf: number;
};

let pending: { el: HTMLElement; x: number; y: number; timer: number } | null = null;
let drag: Drag | null = null;

function fire(type: string, target: Element, d: Drag, related?: Element | null) {
  const ev = new DragEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: d.x,
    clientY: d.y,
    dataTransfer: d.dt,
    relatedTarget: related ?? null,
  });
  target.dispatchEvent(ev);
  return ev;
}

/** The closest ancestors that can scroll sideways and up/down, to follow the finger near the edges. */
function scrollers(el: Element | null) {
  let x: HTMLElement | null = null,
    y: HTMLElement | null = null;
  for (let n = el as HTMLElement | null; n && n !== document.body; n = n.parentElement) {
    const s = getComputedStyle(n);
    if (!x && /(auto|scroll)/.test(s.overflowX) && n.scrollWidth > n.clientWidth) x = n;
    if (!y && /(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight) y = n;
    if (x && y) break;
  }
  return { x, y };
}

function moveTo(x: number, y: number) {
  const d = drag!;
  d.x = x;
  d.y = y;
  d.ghost.style.transform = `translate(${x - d.dx}px, ${y - d.dy}px) rotate(2deg) scale(1.03)`;
  const under = document.elementFromPoint(x, y);
  if (under !== d.over) {
    if (d.over) fire("dragleave", d.over, d, under);
    if (under) fire("dragenter", under, d, d.over);
    d.over = under;
  }
  d.accepted = under ? fire("dragover", under, d).defaultPrevented : false;
}

/** Keeps scrolling while the finger rests near an edge (board columns sideways, the page up/down). */
function autoScroll() {
  const d = drag;
  if (!d) return;
  const { x: sx, y: sy } = scrollers(d.over);
  let moved = false;
  if (sx) {
    const r = sx.getBoundingClientRect();
    const step = d.x < r.left + EDGE_PX ? -SCROLL_STEP : d.x > r.right - EDGE_PX ? SCROLL_STEP : 0;
    if (step) {
      sx.scrollLeft += step;
      moved = true;
    }
  }
  if (sy) {
    const r = sy.getBoundingClientRect();
    const step = d.y < r.top + EDGE_PX ? -SCROLL_STEP : d.y > r.bottom - EDGE_PX ? SCROLL_STEP : 0;
    if (step) {
      sy.scrollTop += step;
      moved = true;
    }
  }
  // Nothing scrolls up/down inside: the page itself does (e.g. stacked board columns on a phone).
  if (!sy) {
    const step = d.y < EDGE_PX * 1.5 ? -SCROLL_STEP : d.y > innerHeight - EDGE_PX * 2 ? SCROLL_STEP : 0;
    if (step) {
      const before = scrollY;
      scrollBy(0, step);
      if (scrollY !== before) moved = true;
    }
  }
  if (moved) moveTo(d.x, d.y);
  d.raf = requestAnimationFrame(autoScroll);
}

function start(el: HTMLElement, x: number, y: number) {
  const r = el.getBoundingClientRect();
  const ghost = el.cloneNode(true) as HTMLElement;
  ghost.removeAttribute("id");
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: r.width + "px",
    height: r.height + "px",
    margin: "0",
    zIndex: "9999",
    pointerEvents: "none",
    opacity: "0.92",
    boxShadow: "0 12px 32px rgb(0 0 0 / 0.22)",
    borderRadius: getComputedStyle(el).borderRadius,
    transition: "none",
  });
  ghost.classList.add("touch-ghost");
  document.body.appendChild(ghost);
  drag = { source: el, dt: new DataTransfer(), ghost, dx: x - r.left, dy: y - r.top, over: null, accepted: false, x, y, raf: 0 };
  fire("dragstart", el, drag);
  navigator.vibrate?.(12);
  document.documentElement.classList.add("touch-dragging");
  moveTo(x, y);
  drag.raf = requestAnimationFrame(autoScroll);
}

function finish(drop: boolean) {
  const d = drag;
  drag = null;
  if (!d) return;
  cancelAnimationFrame(d.raf);
  if (drop && d.over && d.accepted) fire("drop", d.over, d);
  else if (d.over) fire("dragleave", d.over, d, null);
  fire("dragend", d.source, d);
  d.ghost.remove();
  document.documentElement.classList.remove("touch-dragging");
  d.source.setAttribute("draggable", "true");
  // The finger lifting would also "click" whatever is under it: swallow that one click.
  const stop = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
  };
  window.addEventListener("click", stop, { capture: true, once: true });
  setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 400);
}

function cancelPending() {
  if (!pending) return;
  clearTimeout(pending.timer);
  // Give the element its native dragging back (taken away while the finger was down).
  pending.el.setAttribute("draggable", "true");
  pending = null;
}

export function installTouchDnd() {
  if (typeof window === "undefined" || !("ontouchstart" in window) || typeof DataTransfer === "undefined") return () => {};

  const onStart = (e: TouchEvent) => {
    if (e.touches.length !== 1 || drag) return cancelPending();
    const el = (e.target as Element).closest<HTMLElement>('[draggable="true"]');
    if (!el) return;
    const t = e.touches[0];
    cancelPending();
    // Some mobile browsers have their own long-press drag; switch it off so the two don't fight.
    el.setAttribute("draggable", "false");
    pending = {
      el,
      x: t.clientX,
      y: t.clientY,
      timer: window.setTimeout(() => {
        const p = pending;
        pending = null;
        if (p) start(p.el, p.x, p.y);
      }, HOLD_MS),
    };
  };
  const onMove = (e: TouchEvent) => {
    const t = e.touches[0];
    if (drag) {
      e.preventDefault(); // dragging, not scrolling
      moveTo(t.clientX, t.clientY);
      return;
    }
    if (pending && Math.hypot(t.clientX - pending.x, t.clientY - pending.y) > SLOP_PX) cancelPending(); // a swipe: let it scroll
  };
  const onEnd = (e: TouchEvent) => {
    if (drag) {
      e.preventDefault();
      finish(e.type === "touchend");
    } else cancelPending();
  };
  // Long-pressing a draggable shouldn't open the phone's "copy / share" menu.
  const onMenu = (e: Event) => {
    if (drag || pending) e.preventDefault();
  };

  document.addEventListener("touchstart", onStart, { passive: true });
  document.addEventListener("touchmove", onMove, { passive: false });
  document.addEventListener("touchend", onEnd, { passive: false });
  document.addEventListener("touchcancel", onEnd, { passive: false });
  document.addEventListener("contextmenu", onMenu);
  return () => {
    document.removeEventListener("touchstart", onStart);
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", onEnd);
    document.removeEventListener("touchcancel", onEnd);
    document.removeEventListener("contextmenu", onMenu);
  };
}
