import { Suspense, lazy, useEffect, useState } from "react";
import { checkReviews, closePeek, closePop, usePop, useStore } from "./store";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { PageView } from "./components/PageView";
import { Peek } from "./components/Peek";
import { Search } from "./components/Search";
import { Settings } from "./components/Settings";
import { PopHost, Toast } from "./components/ui";
import { Auth, ChooseStart, Loading, NewPassword } from "./components/Auth";
import { Trash } from "./components/Trash";
import { cloudEnabled, supabase } from "./lib/supabase";
import { startCloud, useSync } from "./lib/sync";

const NotesView = lazy(() => import("./components/notes/NotesView"));

function routeFromHash() {
  const id = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  const { ws, setUi } = useStore.getState();
  if (id === "notas" || id.startsWith("notas/")) {
    const rest = id.slice(6);
    setUi((u) => {
      u.route = "notes";
      u.peek = null;
      u.noteGraph = rest === "grafo";
      if (rest && rest !== "grafo" && ws.notes[rest]) u.noteId = rest;
      u.notesTab = rest ? "note" : "list";
    });
    return true;
  }
  if (id && ws.pages.some((p) => p.id === id))
    setUi((u) => {
      u.route = id;
      u.peek = null;
    });
  return !!id;
}

export default function App() {
  return cloudEnabled ? <CloudGate /> : <Workspace />;
}

/** With a backend configured: sign in first, then load the person's data, then show the workspace. */
function CloudGate() {
  const phase = useSync((s) => s.phase);
  const recovery = useSync((s) => s.recovery);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const begin = (user: Parameters<typeof startCloud>[0]) => startCloud(user).catch((e: Error) => setError(e.message));
    supabase!.auth.getSession().then(({ data }) => {
      setChecked(true);
      if (data.session) begin(data.session.user);
    });
    const { data } = supabase!.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") useSync.setState({ recovery: true });
      if (event === "SIGNED_IN" && session) begin(session.user);
      if (event === "SIGNED_OUT") useSync.setState({ phase: "auth", user: null });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!checked) return <Loading text="Abrindo…" />;
  if (recovery) return <NewPassword />;
  if (error && phase === "auth")
    return (
      <>
        <Auth />
        <p className="auth-err" style={{ textAlign: "center" }}>
          {error}
        </p>
      </>
    );
  if (phase === "auth") return <Auth />;
  if (phase === "loading") return <Loading />;
  if (phase === "choose") return <ChooseStart />;
  return <Workspace />;
}

function Workspace() {
  const settings = useStore((s) => s.ws.settings);
  const sideOpen = useStore((s) => s.ui.sideOpen);
  const modal = useStore((s) => s.ui.modal);
  const peek = useStore((s) => s.ui.peek);
  const route = useStore((s) => s.ui.route);
  const setUi = useStore((s) => s.setUi);

  useEffect(() => {
    const r = document.documentElement;
    if (settings.theme === "system") r.removeAttribute("data-theme");
    else r.setAttribute("data-theme", settings.theme);
    r.dataset.accent = settings.accent;
    r.dataset.font = settings.font;
    r.dataset.width = settings.width;
    r.dataset.density = settings.density;
  }, [settings]);

  useEffect(() => {
    if (!routeFromHash()) {
      const { ws } = useStore.getState();
      const start = ws.pages.some((p) => p.id === ws.settings.start) ? ws.settings.start : "home";
      setUi((u) => {
        u.route = start;
      });
    }
    checkReviews();
    const onHash = () => routeFromHash();
    const onVis = () => {
      if (!document.hidden) checkReviews();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setUi((u) => {
          u.modal = u.modal === "search" ? null : "search";
        });
        return;
      }
      if (e.key !== "Escape" || usePop.getState().pop) return;
      const { ui } = useStore.getState();
      if (ui.modal)
        setUi((u) => {
          u.modal = null;
        });
      else if (ui.peek) closePeek();
    };
    addEventListener("hashchange", onHash);
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("keydown", onKey);
    return () => {
      removeEventListener("hashchange", onHash);
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className={"app" + (sideOpen ? " side-open" : "")}>
      <div
        className="side-scrim"
        onClick={() =>
          setUi((u) => {
            u.sideOpen = false;
          })
        }
      />
      <aside className="side" aria-label="Páginas">
        <Sidebar />
      </aside>
      <main className="main">
        <Topbar />
        {route === "notes" ? (
          <Suspense
            fallback={
              <p className="muted" style={{ padding: 24 }}>
                Abrindo anotações…
              </p>
            }
          >
            <NotesView />
          </Suspense>
        ) : (
          <div className="scroll" onScroll={() => closePop()}>
            <PageView />
          </div>
        )}
      </main>
      {peek && <Peek />}
      {modal === "search" && <Search />}
      {modal === "settings" && <Settings />}
      {modal === "trash" && <Trash />}
      <PopHost />
      <Toast />
    </div>
  );
}
