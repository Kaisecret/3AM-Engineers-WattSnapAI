/** Local UI identity only. This is not authentication or server authorization. */
export const previewSessionKey = "wattsnap-preview-session-v1";
export const previewAccountsKey = "wattsnap-preview-identities-v1";
export const previewSessionEvent = "wattsnap-preview-session-change";
export interface PreviewIdentity { id: string; email: string; name: string; username?: string }

function identity(value: unknown): PreviewIdentity | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Partial<PreviewIdentity>;
  if (typeof data.id !== "string" || !data.id.trim() || data.id.length > 160 || typeof data.name !== "string" || !data.name.trim() || typeof data.email !== "string") return null;
  return { id: data.id, email: data.email, name: data.name.slice(0, 50), ...(typeof data.username === "string" ? { username: data.username.slice(0, 50) } : {}) };
}

export function readPreviewIdentity(): PreviewIdentity | null {
  const raw = JSON.parse(localStorage.getItem(previewSessionKey) ?? "null");
  return raw?.version === 1 ? identity(raw.identity) : null;
}

function readAccounts(): PreviewIdentity[] {
  const raw = JSON.parse(localStorage.getItem(previewAccountsKey) ?? "null");
  if (raw?.version !== 1 || !Array.isArray(raw.accounts)) return [];
  return raw.accounts.map(identity).filter((item: PreviewIdentity | null): item is PreviewIdentity => !!item);
}

export function hasPreviewAccounts() { return readAccounts().length > 0; }

export function beginPreviewSession(identifier: string, profile?: { name: string; username?: string }) {
  const normalized = identifier.trim().toLowerCase();
  if (!normalized || normalized.length > 160) throw new Error("Enter an email or username of 160 characters or fewer.");
  const accounts = readAccounts();
  const existing = accounts.find(item => item.id === normalized || item.email === normalized || item.username === normalized);
  const next: PreviewIdentity = {
    id: existing?.id ?? normalized,
    email: normalized.includes("@") ? normalized : existing?.email ?? "",
    name: profile?.name.trim().slice(0, 50) || existing?.name || normalized.split("@")[0],
    ...(profile?.username ? { username: profile.username.trim().toLowerCase().slice(0, 50) } : existing?.username ? { username: existing.username } : {}),
  };
  if (profile?.username && accounts.some(item => item.id !== next.id && item.username === next.username)) throw new Error("That username is already used in this browser. Choose another.");
  // Identity metadata contains no password, verification code or birth date.
  localStorage.setItem(previewAccountsKey, JSON.stringify({ version: 1, accounts: [...accounts.filter(item => item.id !== next.id), next] }));
  localStorage.setItem(previewSessionKey, JSON.stringify({ version: 1, identity: next }));
  window.dispatchEvent(new Event(previewSessionEvent));
  return next;
}

export function endPreviewSession() {
  localStorage.removeItem(previewSessionKey);
  window.dispatchEvent(new Event(previewSessionEvent));
}
