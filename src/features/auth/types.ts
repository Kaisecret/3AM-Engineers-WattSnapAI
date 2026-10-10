export type AuthFailureKind = "validation" | "authentication" | "authorization" | "network" | "rate-limit" | "conflict" | "unknown";
/** `message` is always safe to show. Raw provider text never reaches it. */
export type AuthFailure = { ok: false; kind: AuthFailureKind; message: string };
export type AuthResult<T = undefined> = { ok: true; value: T } | AuthFailure;

export interface AccountProfile {
  fullName: string;
  username: string | null;
  avatarPath: string | null;
  onboardedAt: string | null;
  notifications: { brownouts: boolean; billReminders: boolean; tips: boolean };
}
export interface Account { id: string; email: string; profile: AccountProfile }

export type Identifier = { kind: "email"; email: string } | { kind: "username"; username: string };
