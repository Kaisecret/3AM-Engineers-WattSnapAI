import type { AuthResult } from "./types";

/**
 * Runs a step again whenever it fails for lack of signal, so one tap is enough on a weak connection.
 * Any other answer is returned at once. `null` means the person cancelled.
 */
export async function untilConnected<T>(run: () => Promise<AuthResult<T>>, { wait, cancelled, onWaiting }: { wait: (attempt: number) => Promise<void>; cancelled: () => boolean; onWaiting: () => void }): Promise<AuthResult<T> | null> {
  for (let attempt = 0; ; attempt++) {
    const result = await run();
    if (cancelled()) return null;
    if (result.ok || result.kind !== "network") return result;
    onWaiting();
    await wait(attempt);
    if (cancelled()) return null;
  }
}

/** Resolves when the browser reports a connection again, or after a growing pause, whichever comes first. */
export function waitForSignal(attempt: number) {
  return new Promise<void>(resolve => {
    const done = () => { window.clearTimeout(timer); window.removeEventListener("online", done); resolve(); };
    const timer = window.setTimeout(done, Math.min(2000 * 2 ** attempt, 8000));
    window.addEventListener("online", done);
  });
}
