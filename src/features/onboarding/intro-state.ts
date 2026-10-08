export const introStorageKey = "wattsnap-intro-v1";
export type IntroState = { version: 1; step: number; status: "in-progress" | "completed" | "skipped" };
export const initialIntro: IntroState = { version: 1, step: 0, status: "in-progress" };

export function normalizeIntro(value: unknown): IntroState {
  if (!value || typeof value !== "object") return initialIntro;
  const data = value as Partial<IntroState>;
  if (data.version !== 1 || !Number.isInteger(data.step) || data.step! < 0 || data.step! > 3 || !["in-progress", "completed", "skipped"].includes(data.status!)) return initialIntro;
  return data as IntroState;
}

export function readIntro(): IntroState {
  return normalizeIntro(JSON.parse(localStorage.getItem(introStorageKey) ?? "null"));
}

export function saveIntro(state: IntroState) {
  localStorage.setItem(introStorageKey, JSON.stringify(state));
}
