// First: moves data saved under the old app name before the store reads it.
import "./lib/rename";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles.css";

/**
 * After a new version is published, a tab opened before it asks for files that no longer exist
 * (Anotações is loaded on demand), which left a blank page. Reload once to get the new version;
 * if that already happened a moment ago, the error is shown in place (LoadBoundary) instead of looping.
 */
const RELOADED_KEY = "organizer:reloaded-at";
addEventListener("vite:preloadError", () => {
  try {
    if (Date.now() - Number(sessionStorage.getItem(RELOADED_KEY) || 0) < 30_000) return;
    sessionStorage.setItem(RELOADED_KEY, String(Date.now()));
  } catch {
    return;
  }
  location.reload();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
