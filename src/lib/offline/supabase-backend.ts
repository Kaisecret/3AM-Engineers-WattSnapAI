import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../../generated/database.types";
import { defaultNotifications, type PreviewAppliance, type PreviewBill, type PreviewHousehold } from "../../features/dashboard/preview-data";
import type { ReviewedAdvisory } from "../../features/advisory-intelligence/types";
import type { AdvisoryPreparationProgress } from "../../features/advisory-intelligence/preparation-progress";
import type { BrownoutPreviewPlan } from "../../features/brownout-ready/types";
import type { PreviewTipsSnapshot } from "../../features/tipid-tips/types";
import type { PreviewScenario } from "../../features/watt-if-simulator/types";
import type { SetupState } from "../../features/onboarding/setup-progress";
import type { RecordBackend, Records } from "./sync";

type BillRow = Database["public"]["Tables"]["bills"]["Row"];
type ApplianceRow = Database["public"]["Tables"]["appliances"]["Row"];
type Row = Record<string, unknown>;
const cents = (pesos: number) => Math.round(pesos * 100);
const providerColumns = (provider?: string) => ({
  provider_id: provider && !provider.startsWith("custom:") ? provider : null,
  provider_custom_name: provider?.startsWith("custom:") ? decodeURIComponent(provider.slice(7)) : null,
});
const providerChoice = (row: { provider_id: string | null; provider_custom_name: string | null }) => row.provider_custom_name ? `custom:${encodeURIComponent(row.provider_custom_name)}` : row.provider_id ?? undefined;
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Json;
const iso = (stamp: unknown) => new Date(String(stamp)).toISOString();

export function billToRow(bill: PreviewBill, householdId: string) {
  return {
    household_id: householdId, id: bill.id, billing_month: `${bill.month}-01`, kwh: bill.kwh,
    amount_centavos: cents(bill.amount), subsidy_centavos: bill.subsidy === undefined ? null : cents(bill.subsidy),
    due_date: bill.dueDate || null, billing_date: bill.billingDate || null,
    period_start: bill.periodStart || null, period_end: bill.periodEnd || null,
    ...providerColumns(bill.provider), source: bill.source === "scan" ? "scan" : "manual",
    source_name: bill.sourceName || null, notes: bill.notes || null,
    charges: bill.charges ? json(bill.charges) : null, readings: bill.readings ? json(bill.readings) : null,
  };
}
export function billFromRow(row: BillRow): PreviewBill {
  return {
    id: row.id, month: row.billing_month.slice(0, 7), kwh: Number(row.kwh), amount: row.amount_centavos / 100,
    source: row.source as "scan" | "manual",
    ...(row.subsidy_centavos !== null ? { subsidy: row.subsidy_centavos / 100 } : {}),
    ...(row.due_date ? { dueDate: row.due_date } : {}), ...(row.billing_date ? { billingDate: row.billing_date } : {}),
    ...(row.period_start ? { periodStart: row.period_start } : {}), ...(row.period_end ? { periodEnd: row.period_end } : {}),
    ...(providerChoice(row) ? { provider: providerChoice(row) } : {}),
    ...(row.source_name ? { sourceName: row.source_name } : {}), ...(row.notes ? { notes: row.notes } : {}),
    ...(row.charges ? { charges: row.charges as unknown as PreviewBill["charges"] } : {}),
    ...(row.readings ? { readings: row.readings as unknown as PreviewBill["readings"] } : {}),
  };
}
export function applianceToRow(item: PreviewAppliance, householdId: string) {
  return { household_id: householdId, id: item.id, name: item.name, model: item.model || null, kind: item.kind ?? "other",
    watts: item.watts, hours_per_day: item.hours, quantity: item.quantity, days_in_period: item.days ?? 30, wattage_basis: item.wattageBasis ?? "approximate" };
}
export function applianceFromRow(row: ApplianceRow): PreviewAppliance {
  return { id: row.id, name: row.name, ...(row.model ? { model: row.model } : {}), kind: row.kind as PreviewAppliance["kind"],
    watts: Number(row.watts), hours: Number(row.hours_per_day), quantity: row.quantity, days: row.days_in_period,
    wattageBasis: row.wattage_basis as PreviewAppliance["wattageBasis"], source: "manual" };
}

function imageBlob(dataUrl: string): Blob {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("Unreadable saved image");
  const bytes = Uint8Array.from(atob(match[2]), char => char.charCodeAt(0));
  return new Blob([bytes], { type: match[1] });
}
async function dataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return `data:${blob.type || "image/jpeg"};base64,${btoa(binary)}`;
}
const tables = { bills: "bills", appliances: "appliances", advisories: "advisories", preparation: "advisory_preparation", plans: "brownout_plans", tips: "tips_snapshots", scenarios: "scenarios", setup: "setup_progress" } as const;
const lastImageSweep = new Map<string, number>();
function abortable<T>(request: PromiseLike<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error("Sync request ended")); return; }
    const abort = () => reject(new Error("Sync request ended"));
    signal.addEventListener("abort", abort, { once: true });
    Promise.resolve(request).then(value => { signal.removeEventListener("abort", abort); resolve(value); }, error => { signal.removeEventListener("abort", abort); reject(error); });
  });
}

/** A fresh, verified session and owned household are required for every sync pass.
 * No secret key is used here. Database and Storage RLS authorize every request.
 */
export async function createSupabaseBackend(client: SupabaseClient<Database>, accountId: string, isCurrent: () => boolean, signal: AbortSignal, progress: () => void = () => {}): Promise<RecordBackend> {
  const check = () => { if (!isCurrent() || signal.aborted) throw new Error("Sync account changed or request ended"); };
  check();
  const { data: { user }, error: authError } = await abortable(client.auth.getUser(), signal);
  if (authError || !user || user.is_anonymous || user.id !== accountId) throw new Error("Reconnect and sign in to sync records");
  check();
  progress();
  const { data: household, error: householdError } = await client.from("households").select("id").eq("owner_id", accountId).abortSignal(signal).single();
  if (householdError || !household) throw new Error("Your household could not be opened");
  check();
  const householdId = household.id;
  // Dynamic table payloads are restricted to the known store mappings in this adapter.
  const db = client as SupabaseClient;
  const imageCandidates = new Set<string>(), previousImages = new Map<string, string>();
  const unwrap = async <T>(request: PromiseLike<{ data: T; error: unknown }>): Promise<T> => {
    check(); const result = await abortable(request, signal); check(); progress();
    if (result.error) throw new Error("The database could not save or load this record", { cause: result.error });
    return result.data;
  };
  const updateHousehold = async (patch: Row) => {
    const rows = await unwrap(db.from("households").update(patch).eq("id", householdId).eq("owner_id", accountId).select("id").abortSignal(signal));
    if (!rows?.length) throw new Error("Household update was not acknowledged");
  };
  const updateProfile = async (patch: Row) => {
    const rows = await unwrap(db.from("profiles").update(patch).eq("id", accountId).select("id").abortSignal(signal));
    if (!rows?.length) throw new Error("Profile update was not acknowledged");
  };
  const download = async (bucket: string, path: string) => {
    check(); const blob = await unwrap(db.storage.from(bucket).download(path, {}, { signal }));
    if (!blob) throw new Error("Saved image could not be downloaded");
    return dataUrl(blob);
  };
  const upload = async (bucket: string, path: string, image: string) => {
    check(); const blob = imageBlob(image);
    if (bucket === "advisory-originals") imageCandidates.add(path);
    try { await unwrap(db.storage.from(bucket).upload(path, blob, { upsert: true, contentType: blob.type })); }
    catch (error) {
      if (bucket !== "advisory-originals" || signal.aborted || !isCurrent()) throw error;
      // Failed/abandoned uploads must not permanently fill the private bucket.
      await cleanupImages(true);
      await unwrap(db.storage.from(bucket).upload(path, blob, { upsert: true, contentType: blob.type }));
    }
  };
  const cleanupImages = async (forceSweep = false) => {
    const sweep = forceSweep || Date.now() - (lastImageSweep.get(accountId) ?? 0) > 5 * 60_000;
    if (!sweep && !imageCandidates.size) return;
    const [advisories, plans] = await Promise.all([
      unwrap(db.from("advisories").select("original_image_path").eq("household_id", householdId).abortSignal(signal)),
      unwrap(db.from("brownout_plans").select("snapshot_image_path").eq("household_id", householdId).abortSignal(signal)),
    ]);
    if (!advisories || !plans) throw new Error("Image references could not be checked");
    const referenced = new Set<string>([...advisories.map((row: { original_image_path: string | null }) => row.original_image_path), ...plans.map((row: { snapshot_image_path: string | null }) => row.snapshot_image_path)].filter((path): path is string => !!path));
    if (sweep) {
      const folders = await unwrap(db.storage.from("advisory-originals").list(accountId, { limit: 100 }, { signal }));
      if (!folders) throw new Error("Saved images could not be listed");
      // At most 60 originals exist for this account. Small concurrent batches
      // keep cleanup quick without sending an unbounded number of requests.
      for (let offset = 0; offset < folders.length; offset += 10) {
        await Promise.all(folders.slice(offset, offset + 10).filter(folder => /^[0-9a-f-]{36}$/.test(folder.name)).map(async folder => {
          const files = await unwrap(db.storage.from("advisory-originals").list(`${accountId}/${folder.name}`, { limit: 100 }, { signal }));
          if (!files) throw new Error("Saved images could not be listed");
          for (const file of files) {
            // Allow another device's just-started upload time to acquire its DB reference.
            if (Date.now() - Date.parse(file.updated_at || file.created_at || "") > 5 * 60_000) imageCandidates.add(`${accountId}/${folder.name}/${file.name}`);
          }
        }));
      }
    }
    const unused = [...imageCandidates].filter(path => path.startsWith(`${accountId}/`) && !referenced.has(path));
    if (unused.length) await unwrap(db.storage.from("advisory-originals").remove(unused));
    imageCandidates.clear();
    if (sweep) lastImageSweep.set(accountId, Date.now());
  };
  const advisoryImage = async (record: ReviewedAdvisory) => {
    if (record.original.kind !== "image") return null;
    if (!record.original.image) throw new Error("Saved advisory image is missing");
    const blob = imageBlob(record.original.image), ext = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1];
    const path = `${accountId}/${record.id}/r${record.revision}.${ext}`;
    await upload("advisory-originals", path, record.original.image);
    return path;
  };
  let dismissed: Records = {};
  const backend: RecordBackend = {
    async read(store) {
      check();
      if (store === "settings" || store === "dismissed") {
        const home = await unwrap(db.from("households").select("*").eq("id", householdId).eq("owner_id", accountId).abortSignal(signal).single()) as Row;
        if (!home) throw new Error("Household is missing");
        if (store === "dismissed") {
          dismissed = Object.fromEntries((home.dismissed_provider_advisories as string[]).map(id => [id, true]));
          return { ...dismissed };
        }
        const profile = await unwrap(db.from("profiles").select("*").eq("id", accountId).abortSignal(signal).single()) as Row;
        if (!profile) throw new Error("Profile is missing");
        const locality = [home.province, home.municipality, home.barangay].some(Boolean) ? { province: home.province ?? "", municipality: home.municipality ?? "", barangay: home.barangay ?? "" } : null;
        const settings: Records = {
          name: home.name || profile.full_name || "Your home", email: profile.contact_email || user.email || null,
          photo: profile.avatar_path ? await download("avatars", String(profile.avatar_path)) : null,
          budget: home.monthly_budget_centavos ? Number(home.monthly_budget_centavos) / 100 : 0,
          location: home.location ?? null, locality,
          provider: providerChoice(home as { provider_id: string | null; provider_custom_name: string | null }) ?? null,
          notifications: { brownouts: profile.notify_brownouts, billReminders: profile.notify_bill_reminders, tips: profile.notify_tips },
          monthlySubsidy: home.monthly_subsidy_centavos === null ? null : Number(home.monthly_subsidy_centavos) / 100,
        };
        return Object.fromEntries(Object.entries(settings).filter(([, value]) => value !== null));
      }
      const table = tables[store as keyof typeof tables];
      if (!table) throw new Error("Unknown record store");
      const rows = await unwrap(db.from(table).select("*").eq("household_id", householdId).abortSignal(signal)) as Row[];
      const result: Records = {};
      for (const row of rows) {
        check();
        switch (store) {
          case "bills": { const bill = billFromRow(row as BillRow); result[bill.month] = bill; break; }
          case "appliances": { const item = applianceFromRow(row as ApplianceRow); result[item.id] = item; break; }
          case "advisories": {
            if (row.original_image_path) previousImages.set(`advisories:${row.id}`, String(row.original_image_path));
            const record: ReviewedAdvisory = {
              version: "advisory-ui-v1", id: String(row.id), revision: Number(row.revision), createdAt: iso(row.created_at), reviewedAt: iso(row.reviewed_at),
              details: row.details as ReviewedAdvisory["details"], match: row.match as ReviewedAdvisory["match"],
              original: { kind: row.original_kind as "text" | "image", name: String(row.original_name), text: String(row.original_text), capturedAt: iso(row.original_captured_at),
                ...(row.original_feed ? { feed: row.original_feed as ReviewedAdvisory["original"]["feed"] } : {}),
                ...(row.original_image_path ? { image: await download("advisory-originals", String(row.original_image_path)) } : {}) },
            };
            result[record.id] = record; break;
          }
          case "preparation": {
            const key = JSON.stringify([row.advisory_id, row.revision, row.household_signature]);
            result[key] = { key, checked: row.checked, updatedAt: iso(row.updated_at) }; break;
          }
          case "plans": {
            if (row.snapshot_image_path) previousImages.set(`plans:${row.advisory_id}`, String(row.snapshot_image_path));
            const advisory = row.advisory_snapshot as ReviewedAdvisory;
            result[String(row.advisory_id)] = { version: "brownout-ui-v1", id: row.advisory_id,
              advisory: { ...advisory, original: { ...advisory.original, ...(row.snapshot_image_path ? { image: await download("advisory-originals", String(row.snapshot_image_path)) } : {}) } },
              relevanceConfirmed: row.relevance_confirmed, sourceConfirmed: row.source_confirmed, checked: row.checked,
              acknowledgedUpdates: row.acknowledged_updates, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) }; break;
          }
          case "tips": result.current = row.snapshot; break;
          case "scenarios": result[String(row.id)] = row.payload; break;
          case "setup": result.current = { version: 1, ...(row.reviewed_tips ? { reviewedTips: row.reviewed_tips } : {}), ...(row.acknowledged ? { acknowledged: row.acknowledged } : {}) }; break;
        }
      }
      return result;
    },
    async put(store, id, value) {
      check();
      if (store === "settings") {
        switch (id) {
          case "name": await updateHousehold({ name: value }); await updateProfile({ full_name: value }); return;
          case "email": await updateProfile({ contact_email: value }); return;
          case "photo": {
            const path = `${accountId}/avatar.jpg`;
            if (value) { await upload("avatars", path, String(value)); await updateProfile({ avatar_path: path }); }
            else { await updateProfile({ avatar_path: null }); await unwrap(db.storage.from("avatars").remove([path])); }
            return;
          }
          case "budget": await updateHousehold({ monthly_budget_centavos: value ? cents(Number(value)) : null }); return;
          case "monthlySubsidy": await updateHousehold({ monthly_subsidy_centavos: value === null ? null : cents(Number(value)) }); return;
          case "location": await updateHousehold({ location: value }); return;
          case "provider": await updateHousehold(providerColumns(value as string | undefined)); return;
          case "locality": {
            const local = value as PreviewHousehold["locality"];
            await updateHousehold({ province: local?.province || null, municipality: local?.municipality || null, barangay: local?.barangay || null }); return;
          }
          case "notifications": {
            const prefs = (value as PreviewHousehold["notifications"]) ?? defaultNotifications;
            await updateProfile({ notify_brownouts: prefs.brownouts, notify_bill_reminders: prefs.billReminders, notify_tips: prefs.tips }); return;
          }
          default: throw new Error("Unknown household setting");
        }
      }
      if (store === "dismissed") {
        const next = { ...dismissed, [id]: true };
        await updateHousehold({ dismissed_provider_advisories: Object.keys(next) }); dismissed = next; return;
      }
      let row: Row, conflict = "household_id,id";
      switch (store) {
        case "bills": row = billToRow(value as PreviewBill, householdId); conflict = "household_id,billing_month"; break;
        case "appliances": row = applianceToRow(value as PreviewAppliance, householdId); break;
        case "advisories": {
          const record = value as ReviewedAdvisory;
          row = { household_id: householdId, id: record.id, revision: record.revision, details: json(record.details), match: json(record.match),
            original_kind: record.original.kind, original_name: record.original.name, original_text: record.original.text,
            original_image_path: await advisoryImage(record), original_feed: record.original.feed ? json(record.original.feed) : null,
            original_captured_at: record.original.capturedAt, reviewed_at: record.reviewedAt, created_at: record.createdAt };
          break;
        }
        case "preparation": {
          const entry = value as AdvisoryPreparationProgress, [advisoryId, revision, signature] = JSON.parse(id);
          row = { household_id: householdId, advisory_id: advisoryId, revision, household_signature: signature, checked: entry.checked, updated_at: entry.updatedAt };
          conflict = "household_id,advisory_id,revision,signature_hash"; break;
        }
        case "plans": {
          const plan = value as BrownoutPreviewPlan, { image: _image, ...original } = plan.advisory.original;
          row = { household_id: householdId, advisory_id: plan.id, advisory_snapshot: json({ ...plan.advisory, original }),
            snapshot_image_path: await advisoryImage(plan.advisory), relevance_confirmed: plan.relevanceConfirmed, source_confirmed: plan.sourceConfirmed,
            checked: plan.checked, acknowledged_updates: json(plan.acknowledgedUpdates), created_at: plan.createdAt, updated_at: plan.updatedAt };
          conflict = "household_id,advisory_id"; break;
        }
        case "tips": {
          const snapshot = value as PreviewTipsSnapshot;
          row = { household_id: householdId, snapshot: json(snapshot), generated_at: snapshot.generatedAt, input_signature: snapshot.inputSignature };
          conflict = "household_id"; break;
        }
        case "scenarios": { const scenario = value as PreviewScenario; row = { household_id: householdId, id: scenario.id, title: scenario.title, payload: json(scenario) }; break; }
        case "setup": {
          const setup = value as SetupState;
          row = { household_id: householdId, reviewed_tips: setup.reviewedTips ?? null, acknowledged: setup.acknowledged ?? null };
          conflict = "household_id"; break;
        }
        default: throw new Error("Unknown record store");
      }
      const saved = await unwrap(db.from(tables[store as keyof typeof tables]).upsert(row, { onConflict: conflict }).select("household_id").abortSignal(signal));
      if (!saved?.length) throw new Error("Record upload was not acknowledged");
      const previousImage = previousImages.get(`${store}:${id}`);
      if (previousImage) imageCandidates.add(previousImage);
    },
    async remove(store, id) {
      check();
      if (store === "settings") { await backend.put(store, id, null); return; }
      if (store === "dismissed") {
        const next = { ...dismissed }; delete next[id];
        await updateHousehold({ dismissed_provider_advisories: Object.keys(next) }); dismissed = next; return;
      }
      const table = tables[store as keyof typeof tables];
      if (!table) throw new Error("Unknown record store");
      let query = db.from(table).delete().eq("household_id", householdId);
      if (store === "bills") query = query.eq("billing_month", `${id}-01`);
      else if (store === "preparation") {
        const [advisoryId, revision, signature] = JSON.parse(id);
        query = query.eq("advisory_id", advisoryId).eq("revision", revision).eq("household_signature", signature);
      } else if (store === "plans") query = query.eq("advisory_id", id);
      else if (store !== "tips" && store !== "setup") query = query.eq("id", id);
      await unwrap(query.abortSignal(signal));
      const previousImage = previousImages.get(`${store}:${id}`);
      if (previousImage) imageCandidates.add(previousImage);
    },
    cleanup: () => cleanupImages(),
  };
  return backend;
}
