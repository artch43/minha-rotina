import { useEffect } from "react";
import { checkReviews, closePeek, closePop, usePop, useStore } from "./store";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { PageView } from "./components/PageView";
import { Peek } from "./components/Peek";
import { Search } from "./components/Search";
import { Settings } from "./components/Settings";
import { PopHost, Toast } from "./components/ui";

function routeFromHash() {
  const id = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  const { ws, setUi } = useStore.getState();
  if (id && ws.pages.some((p) => p.id === id)) setUi((u) => { u.route = id; u.peek = null; });
  return !!id;
}

export default function App() {
  const settings = useStore((s) => s.ws.settings);
  const sideOpen = useStore((s) => s.ui.sideOpen);
  const modal = useStore((s) => s.ui.modal);
  const peek = useStore((s) => s.ui.peek);
  const setUi = useStore((s) => s.setUi);

  useEffect(() => {
    const r = document.documentElement;
    if (settings.theme === "system") r.removeAttribute("data-theme"); else r.setAttribute("data-theme", settings.theme);
    r.dataset.accent = settings.accent;
    r.dataset.font = settings.font;
    r.dataset.width = settings.width;
    r.dataset.density = settings.density;
  }, [settings]);

  useEffect(() => {
    if (!routeFromHash()) {
      const { ws } = useStore.getState();
      const start = ws.pages.some((p) => p.id === ws.settings.start) ? ws.settings.start : "home";
      setUi((u) => { u.route = start; });
    }
    checkReviews();
    const onHash = () => routeFromHash();
    const onVis = () => { if (!document.hidden) checkReviews(); };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setUi((u) => { u.modal = u.modal === "search" ? null : "search"; }); return; }
      if (e.key !== "Escape" || usePop.getState().pop) return;
      const { ui } = useStore.getState();
      if (ui.modal) setUi((u) => { u.modal = null; });
      else if (ui.peek) closePeek();
    };
    addEventListener("hashchange", onHash);
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("keydown", onKey);
    return () => { removeEventListener("hashchange", onHash); document.removeEventListener("visibilitychange", onVis); document.removeEventListener("keydown", onKey); };
  }, []);

  return (
    <div className={"app" + (sideOpen ? " side-open" : "")}>
      <div className="side-scrim" onClick={() => setUi((u) => { u.sideOpen = false; })} />
      <aside className="side" aria-label="Páginas"><Sidebar /></aside>
      <main className="main">
        <Topbar />
        <div className="scroll" onScroll={() => closePop()}><PageView /></div>
      </main>
      {peek && <Peek />}
      {modal === "search" && <Search />}
      {modal === "settings" && <Settings />}
      <PopHost />
      <Toast />
    </div>
  );
}
