import { useEffect, useMemo, useRef, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { extractLinks, extractTags, findByTitle, folderList } from "../../lib/notes";
import { openNotes, useStore } from "../../store";

interface GNode extends SimulationNodeDatum {
  id: string;
  title: string;
  deg: number;
}
type GLink = SimulationLinkDatum<GNode>;

export function Graph() {
  const notes = useStore((s) => s.ws.notes);
  const extraFolders = useStore((s) => s.ws.settings.noteFolders);
  const current = useStore((s) => s.ui.noteId);
  const [folder, setFolder] = useState("");
  const [tag, setTag] = useState("");
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  const allTags = useMemo(() => [...new Set(Object.values(notes).flatMap((n) => extractTags(n.body)))].sort(), [notes]);
  const { nodes, links } = useMemo(() => {
    const list = Object.values(notes).filter(
      (n) => (!folder || n.folder === folder || n.folder.startsWith(folder + "/")) && (!tag || extractTags(n.body).includes(tag)),
    );
    const ids = new Set(list.map((n) => n.id));
    const nodes: GNode[] = list.map((n) => ({ id: n.id, title: n.title, deg: 0 }));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const links: GLink[] = [];
    const seen = new Set<string>();
    for (const n of list)
      for (const t of extractLinks(n.body)) {
        const target = findByTitle(notes, t);
        if (!target || !ids.has(target.id) || target.id === n.id) continue;
        const key = [n.id, target.id].sort().join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        links.push({ source: n.id, target: target.id });
        byId.get(n.id)!.deg++;
        byId.get(target.id)!.deg++;
      }
    return { nodes, links };
  }, [notes, folder, tag]);

  useEffect(() => {
    const cv = canvas.current!,
      box = wrap.current!;
    const ctx = cv.getContext("2d")!;
    const css = getComputedStyle(document.documentElement);
    const col = (v: string) => css.getPropertyValue(v).trim();
    const C = {
      fg: col("--fg"),
      muted: col("--muted"),
      line: col("--line"),
      accent: col("--accent"),
      bg: col("--bg"),
      faint: col("--faint"),
    };
    let w = 0,
      h = 0;
    const view = { x: 0, y: 0, k: 1 };
    let hover: GNode | null = null;
    const neighbors = new Map<string, Set<string>>();
    for (const l of links) {
      const s = l.source as string,
        t = l.target as string;
      (neighbors.get(s) ?? neighbors.set(s, new Set()).get(s)!).add(t);
      (neighbors.get(t) ?? neighbors.set(t, new Set()).get(t)!).add(s);
    }
    const radius = (n: GNode) => 5 + Math.sqrt(n.deg) * 2.5;

    const sim = forceSimulation(nodes)
      .force(
        "link",
        forceLink<GNode, GLink>(links)
          .id((d) => d.id)
          .distance(80),
      )
      .force("charge", forceManyBody().strength(-220))
      .force("center", forceCenter(0, 0))
      .force(
        "collide",
        forceCollide<GNode>((d) => radius(d) + 6),
      );

    const draw = () => {
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.translate(w / 2 + view.x, h / 2 + view.y);
      ctx.scale(view.k, view.k);
      const focus = hover ?? nodes.find((n) => n.id === current) ?? null;
      const near = focus ? (neighbors.get(focus.id) ?? new Set()) : null;
      ctx.lineWidth = 1 / view.k;
      for (const l of links) {
        const s = l.source as GNode,
          t = l.target as GNode;
        const lit = focus && (s.id === focus.id || t.id === focus.id);
        ctx.strokeStyle = lit ? C.accent : C.line;
        ctx.globalAlpha = focus && !lit ? 0.5 : 1;
        ctx.beginPath();
        ctx.moveTo(s.x!, s.y!);
        ctx.lineTo(t.x!, t.y!);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const showAll = nodes.length <= 40 || view.k > 1.2;
      ctx.font = `${12 / view.k}px Figtree, system-ui, sans-serif`;
      ctx.textAlign = "center";
      for (const n of nodes) {
        const isFocus = focus?.id === n.id,
          isNear = near?.has(n.id);
        ctx.globalAlpha = focus && !isFocus && !isNear ? 0.35 : 1;
        ctx.fillStyle = isFocus || n.id === current ? C.accent : C.muted;
        ctx.beginPath();
        ctx.arc(n.x!, n.y!, radius(n), 0, Math.PI * 2);
        ctx.fill();
        if (showAll || isFocus || isNear) {
          ctx.fillStyle = isFocus ? C.fg : C.muted;
          ctx.fillText(n.title.length > 28 ? n.title.slice(0, 27) + "…" : n.title, n.x!, n.y! + radius(n) + 14 / view.k);
        }
      }
      ctx.globalAlpha = 1;
    };
    sim.on("tick", draw);

    const resize = () => {
      w = box.clientWidth;
      h = box.clientHeight;
      cv.width = w * devicePixelRatio;
      cv.height = h * devicePixelRatio;
      cv.style.width = w + "px";
      cv.style.height = h + "px";
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    resize();

    const toWorld = (e: PointerEvent | WheelEvent) => {
      const r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left - w / 2 - view.x) / view.k, y: (e.clientY - r.top - h / 2 - view.y) / view.k };
    };
    const hit = (e: PointerEvent) => {
      const p = toWorld(e);
      return nodes.find((n) => Math.hypot(n.x! - p.x, n.y! - p.y) < radius(n) + 4 / view.k) ?? null;
    };
    let drag: { node: GNode | null; sx: number; sy: number; vx: number; vy: number; moved: boolean } | null = null;
    const down = (e: PointerEvent) => {
      cv.setPointerCapture(e.pointerId);
      const node = hit(e);
      drag = { node, sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false };
      if (node) {
        node.fx = node.x;
        node.fy = node.y;
        sim.alphaTarget(0.3).restart();
      }
    };
    const move = (e: PointerEvent) => {
      if (!drag) {
        const n = hit(e);
        if (n !== hover) {
          hover = n;
          cv.style.cursor = n ? "pointer" : "grab";
          draw();
        }
        return;
      }
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 3) drag.moved = true;
      if (drag.node) {
        const p = toWorld(e);
        drag.node.fx = p.x;
        drag.node.fy = p.y;
      } else {
        view.x = drag.vx + e.clientX - drag.sx;
        view.y = drag.vy + e.clientY - drag.sy;
        draw();
      }
    };
    const up = () => {
      if (drag?.node) {
        drag.node.fx = null;
        drag.node.fy = null;
        sim.alphaTarget(0);
        if (!drag.moved) openNotes(drag.node.id);
      }
      drag = null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = cv.getBoundingClientRect();
      const mx = e.clientX - r.left - w / 2,
        my = e.clientY - r.top - h / 2;
      const k = Math.min(4, Math.max(0.25, view.k * Math.exp(-e.deltaY * 0.0015)));
      view.x = mx - ((mx - view.x) * k) / view.k;
      view.y = my - ((my - view.y) * k) / view.k;
      view.k = k;
      draw();
    };
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    cv.addEventListener("wheel", wheel, { passive: false });
    return () => {
      sim.stop();
      ro.disconnect();
      cv.removeEventListener("pointerdown", down);
      cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerup", up);
      cv.removeEventListener("pointercancel", up);
      cv.removeEventListener("wheel", wheel);
    };
  }, [nodes, links, current]);

  const folders = folderList(notes, extraFolders);
  return (
    <div className="graph">
      <div className="graph-bar">
        <h2>Grafo</h2>
        <select className="inp" aria-label="Filtrar por pasta" value={folder} onChange={(e) => setFolder(e.target.value)}>
          <option value="">Todas as pastas</option>
          {folders.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select className="inp" aria-label="Filtrar por tag" value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">Todas as tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              #{t}
            </option>
          ))}
        </select>
        <span className="small muted">
          {nodes.length} notas · {links.length} ligações
        </span>
      </div>
      <div className="graph-canvas" ref={wrap}>
        <canvas ref={canvas} role="img" aria-label={`Grafo com ${nodes.length} notas e ${links.length} ligações`} />
        {!nodes.length && <p className="graph-empty muted">Nenhuma nota com esses filtros.</p>}
        <p className="graph-hint small muted">Arraste para mover · role para aproximar · clique numa nota para abrir</p>
      </div>
    </div>
  );
}
