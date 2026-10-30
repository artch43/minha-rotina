import { beforeEach, describe, expect, it } from "vitest";
import { FREE_TRIES, clearFailures, fmtWait, recordFailure, triesLeft, waitLeft } from "./loginLimit";

const store: Record<string, string> = {};
beforeEach(() => {
  for (const k in store) delete store[k];
  globalThis.localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => void (store[k] = v),
    removeItem: (k: string) => void delete store[k],
  } as Storage;
});

describe("limite de tentativas de login", () => {
  it("deixa errar 4 vezes sem pausa e pausa 5 min na 5ª", () => {
    const now = 1_000_000;
    for (let i = 1; i < FREE_TRIES; i++) expect(recordFailure(now)).toBe(0);
    expect(triesLeft()).toBe(1);
    expect(recordFailure(now)).toBe(5 * 60_000);
    expect(waitLeft(now + 60_000)).toBe(4 * 60_000);
    expect(waitLeft(now + 5 * 60_000 + 1)).toBe(0);
  });
  it("multiplica a pausa por 2,5 a cada erro seguinte, até 24 horas", () => {
    const now = 0;
    for (let i = 0; i < FREE_TRIES; i++) recordFailure(now);
    expect(recordFailure(now)).toBe(12.5 * 60_000);
    expect(recordFailure(now)).toBe(31.25 * 60_000);
    for (let i = 0; i < 10; i++) recordFailure(now);
    expect(recordFailure(now)).toBe(24 * 60 * 60_000);
  });
  it("zera depois de entrar", () => {
    for (let i = 0; i < FREE_TRIES; i++) recordFailure(0);
    clearFailures();
    expect(waitLeft(0)).toBe(0);
    expect(triesLeft()).toBe(FREE_TRIES);
  });
  it("mostra o tempo como m:ss", () => {
    expect(fmtWait(30_000)).toBe("0:30");
    expect(fmtWait(119_500)).toBe("2:00");
    expect(fmtWait(12.5 * 60_000)).toBe("12:30");
    expect(fmtWait(78.125 * 60_000)).toBe("1:18:08");
  });
});
