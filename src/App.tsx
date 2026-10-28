import { Suspense, lazy, useEffect, useState } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { checkReviews, closePeek, openModal, useStore } from "./store";
import { cloudEnabled, supabase } from "./lib/supabase";
import { startCloud, useSync } from "./lib/sync";
import { installDeleteShortcut } from "./lib/shortcuts";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "./components/app/AppSidebar";
import { Topbar } from "./components/app/Topbar";
import { BoardDialog } from "./components/app/BoardDialog";
import { Search } from "./components/Search";
import { Settings } from "./components/Settings";
import { Trash } from "./components/Trash";
import { Auth, ChooseStart, Loading, NewPassword } from "./components/Auth";
import { Home } from "./components/Home";
import { Habits } from "./components/Habits";
import { TodoPage } from "./components/TodoPage";
import { DbPage } from "./components/tasks/DbPage";
import { TaskSheet } from "./components/tasks/TaskSheet";
import { StatusDialog } from "./components/tasks/StatusDialog";
import { CalendarPage } from "./components/calendar/CalendarPage";
import { EventDialog } from "./components/calendar/EventDialog";

const NotesView = lazy(() => import("./components/notes/NotesView"));

function routeFromHash() {
  const id = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  const { ws, setUi } = useStore.getState();
  if (id === "notas" || id.startsWith("notas/")) {
    const rest = id.slice(6);
    setUi((u) => {
      u.route = "notes";
      u.peek = null;
      if (rest && ws.notes[rest]) u.noteId = rest;
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
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        {cloudEnabled ? <CloudGate /> : <Workspace />}
        <Toaster position="bottom-center" />
      </TooltipProvider>
    </ThemeProvider>
  );
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
  if (phase === "auth") return <Auth error={error} />;
  if (phase === "loading") return <Loading />;
  if (phase === "choose") return <ChooseStart />;
  return <Workspace />;
}

/** Keeps the light/dark choice from Settings in sync with the page. */
function ThemeSync() {
  const theme = useStore((s) => s.ws.settings.theme);
  const { setTheme } = useTheme();
  useEffect(() => setTheme(theme), [theme]);
  return null;
}

function Workspace() {
  const route = useStore((s) => s.ui.route);
  const modal = useStore((s) => s.ui.modal);
  const page = useStore((s) => s.ws.pages.find((p) => p.id === s.ui.route));
  const note = useStore((s) => (s.ui.route === "notes" && s.ui.noteId ? s.ws.notes[s.ui.noteId] : undefined));
  const setUi = useStore((s) => s.setUi);

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
      }
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

  const title =
    route === "notes" ? (
      <span>📓 Anotações{note ? <span className="text-muted-foreground"> / {note.title}</span> : null}</span>
    ) : page ? (
      <span>
        {page.icon} {page.title || "Sem título"}
      </span>
    ) : null;
  const current = page ?? (route === "notes" ? null : useStore.getState().ws.pages.find((p) => p.type === "home"));

  return (
    <SidebarProvider>
      <ThemeSync />
      <AppSidebar />
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:ring-2 focus:ring-ring"
      >
        Pular para o conteúdo
      </a>
      <SidebarInset className="min-w-0" id="conteudo">
        <Topbar title={title} showAreas={route !== "notes"} />
        {route === "notes" ? (
          <Suspense fallback={<Loading text="Abrindo anotações…" />}>
            <NotesView />
          </Suspense>
        ) : (
          <div data-scroll className="min-h-0 flex-1 overflow-y-auto">
            {current?.type === "home" && <Home />}
            {current?.type === "calendar" && <CalendarPage />}
            {current?.type === "habits" && <Habits />}
            {current?.type === "todo" && <TodoPage />}
            {current?.type === "db" && <DbPage key={current.id} page={current} />}
          </div>
        )}
      </SidebarInset>
      <TaskSheet />
      <EventDialog />
      <StatusDialog />
      {modal === "search" && <Search />}
      {modal === "settings" && <Settings />}
      {modal === "trash" && <Trash />}
      {modal === "newBoard" && <BoardDialog open onOpenChange={(o) => !o && openModal(null)} />}
      <EscToClose />
    </SidebarProvider>
  );
}

/** Esc closes the task panel when no dialog is open (dialogs handle Esc themselves); Ctrl/⌘+Delete deletes. */
function EscToClose() {
  useEffect(() => installDeleteShortcut(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const { ui } = useStore.getState();
      if (ui.peek && !ui.modal && !ui.eventDialog && !ui.statusDialog) closePeek();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
