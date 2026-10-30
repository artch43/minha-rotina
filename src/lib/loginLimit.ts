/**
 * Sign-in attempt limit for this browser. After 5 wrong passwords in a row, signing in pauses for
 * 30 s, doubling with each further miss (up to 15 min). A successful sign-in clears it.
 * This slows down guessing from the app; Supabase also limits attempts on the server
 * (Authentication → Rate Limits), which is what stops anyone calling the API directly.
 */
const KEY = "organizer:login-tries";
export const FREE_TRIES = 5;
const BASE_MS = 30_000;
const MAX_MS = 15 * 60_000;

type State = { fails: number; until: number };

function read(): State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    return s && typeof s.fails === "number" && typeof s.until === "number" ? s : { fails: 0, until: 0 };
  } catch {
    return { fails: 0, until: 0 };
  }
}
function write(s: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode: the limit lasts only for this page */
  }
}

/** Milliseconds left before another try is allowed (0 = go ahead). */
export function waitLeft(now = Date.now()) {
  return Math.max(0, read().until - now);
}

/** Records a wrong password; returns how long the next pause is (0 while still within the free tries). */
export function recordFailure(now = Date.now()) {
  const s = read();
  const fails = s.fails + 1;
  const pause = fails >= FREE_TRIES ? Math.min(MAX_MS, BASE_MS * 2 ** (fails - FREE_TRIES)) : 0;
  write({ fails, until: pause ? now + pause : 0 });
  return pause;
}

/** Tries left before the first pause. */
export function triesLeft() {
  return Math.max(0, FREE_TRIES - read().fails);
}

export function clearFailures() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** "0:30", "2:00"… */
export const fmtWait = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
