import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import { registerHooks } from 'node:module';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return next(`${specifier}.ts`, context);
    throw error;
  }
} });
const { householdStores } = await import('../../src/lib/offline/database.ts');
const { syncRecords } = await import('../../src/lib/offline/sync.ts');
const { createSupabaseBackend } = await import('../../src/lib/offline/supabase-backend.ts');
const { generatePreviewTips } = await import('../../src/features/tipid-tips/preview-tips.ts');
const { createScenario } = await import('../../src/features/watt-if-simulator/calculations.ts');
const { planChanges } = await import('../../src/features/brownout-ready/calculations.ts');
const { sampleAdvisory, captureMatch } = await import('../../src/features/advisory-intelligence/review-preview.ts');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, ref = url ? new URL(url).hostname.split('.')[0] : null;
const options = { skip: !ref || ref !== process.env.WATTSNAP_TEST_PROJECT_REF ? 'Only the explicitly configured Supabase test project may be used.' : false, timeout: 180_000 };
const makeClient = key => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
let admin, client, accountId, householdId, stores;
const values = new Map();
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAACqzK7MwAAAABJRU5ErkJggg==';
const photo = 'data:image/jpeg;base64,/9j/2Q==';
const appliance = { id: randomUUID(), name: 'Electric fan', model: 'Test fan', kind: 'fan', watts: 55, hours: 8, quantity: 2, days: 30, source: 'manual', wattageBasis: 'nameplate' };
const bill = { id: randomUUID(), month: '2040-10', kwh: 120.5, amount: 1234.56, source: 'scan', sourceName: 'receipt.jpg', subsidy: 500, charges: [{ label: 'Distribution', amount: 250.5 }], readings: { previous: 100, present: 220.5 }, dueDate: '2040-11-10', provider: 'anteco' };
const home = { name: 'Sync test home', email: 'contact@example.com', photo, bills: [bill], appliances: [appliance], budget: 2000, monthlySubsidy: 500, provider: 'anteco', location: 'Payao, San Jose de Buenavista, Antique', locality: { province: 'Antique', municipality: 'San Jose de Buenavista', barangay: 'Payao' }, notifications: { brownouts: true, billReminders: false, tips: true } };
const stamp = '2040-10-01T00:00:00.000Z';
const advisory = { version: 'advisory-ui-v1', id: randomUUID(), revision: 1, createdAt: stamp, reviewedAt: stamp,
  details: sampleAdvisory('scheduled', new Date(stamp)).details, match: null,
  original: { kind: 'image', name: 'advisory.png', text: '', image: png, capturedAt: stamp } };
advisory.match = captureMatch(advisory.details, home, new Date(stamp));
const feedAdvisory = { ...advisory, id: randomUUID(), original: { kind: 'text', name: 'Provider post', text: 'Scheduled power interruption in Payao.', capturedAt: stamp, feed: { url: 'https://www.facebook.com/test/posts/123', fromImages: true } } };
const entry = { key: JSON.stringify([advisory.id, advisory.revision, advisory.match.householdSignature]), checked: ['charge'], updatedAt: stamp };
const plan = { version: 'brownout-ui-v1', id: advisory.id, advisory, relevanceConfirmed: true, sourceConfirmed: true, checked: ['charge'], acknowledgedUpdates: [], createdAt: stamp, updatedAt: stamp };
const save = (name, value) => storage.setItem(stores.find(store => store.name === name).key, JSON.stringify(value));
const run = async (offline = false) => {
  const backend = offline ? null : await createSupabaseBackend(client, accountId, () => true, new AbortController().signal);
  return syncRecords({ accountId, stores, storage, backend, isCurrent: () => true, isOffline: () => offline, changed() {}, onError(store, error) { console.error('Sync diagnostic:', store, error.cause?.message ?? error.message); } });
};
before(async () => {
  if (options.skip) return;
  admin = makeClient(process.env.SUPABASE_SECRET_KEY);
  client = makeClient(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const email = `wattsnap-sync-${randomUUID()}@example.com`, password = `Sync1-${randomUUID()}`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'Sync test home' } });
  assert.ifError(created.error); accountId = created.data.user.id;
  assert.ifError((await client.auth.signInWithPassword({ email, password })).error);
  const household = await client.from('households').select('id').eq('owner_id', accountId).single();
  assert.ifError(household.error); householdId = household.data.id;
  stores = householdStores(accountId);
});
after(async () => {
  if (!accountId) return;
  try {
    assert.ifError((await admin.storage.from('avatars').remove([`${accountId}/avatar.jpg`])).error);
    assert.ifError((await admin.storage.from('advisory-originals').remove([`${accountId}/${advisory.id}/r1.png`, `${accountId}/${advisory.id}/r2.png`])).error);
  } finally { assert.ifError((await admin.auth.admin.deleteUser(accountId)).error); }
});

test('offline records reconnect into every real database table, with private images and receipt details', options, async () => {
  save('settings', home); save('advisories', [advisory, feedAdvisory]); save('preparation', { version: 1, entries: [entry], sampleChecklist: null });
  save('plans', [plan]); save('tips', generatePreviewTips(home, new Date(stamp))); save('scenarios', [createScenario(home.appliances, randomUUID())]);
  save('setup', { version: 1, reviewedTips: 'reviewed', acknowledged: 'complete' }); save('dismissed', ['post-123']);
  assert.equal((await run(true)).state, 'offline');
  const empty = await client.from('appliances').select('id').eq('household_id', householdId); assert.ifError(empty.error); assert.equal(empty.data.length, 0);
  const result = await run(); assert.deepEqual(result.failed, []); assert.equal(result.state, 'synced');
  const tables = ['bills', 'appliances', 'advisories', 'advisory_preparation', 'brownout_plans', 'tips_snapshots', 'scenarios', 'setup_progress'];
  for (const table of tables) {
    const response = await client.from(table).select('*').eq('household_id', householdId); assert.ifError(response.error); assert.equal(response.data.length, table === 'advisories' ? 2 : 1, table);
    if (table === 'bills') { assert.equal(response.data[0].amount_centavos, 123456); assert.equal(response.data[0].subsidy_centavos, 50000); assert.equal(response.data[0].charges[0].amount, 250.5); assert.equal(response.data[0].readings.present, 220.5); }
    if (table === 'advisories') { assert.equal(response.data.find(row => row.id === advisory.id).original_image_path, `${accountId}/${advisory.id}/r1.png`); assert.equal(response.data.find(row => row.id === feedAdvisory.id).original_feed.fromImages, true); }
  }
  const profile = await client.from('profiles').select('*').eq('id', accountId).single(); assert.ifError(profile.error);
  assert.equal(profile.data.contact_email, home.email); assert.equal(profile.data.avatar_path, `${accountId}/avatar.jpg`); assert.equal(profile.data.notify_bill_reminders, false);
  const household = await client.from('households').select('*').eq('id', householdId).single(); assert.ifError(household.error);
  assert.equal(household.data.monthly_budget_centavos, 200000); assert.equal(household.data.monthly_subsidy_centavos, 50000); assert.deepEqual(household.data.dismissed_provider_advisories, ['post-123']);
});

test('a fresh device restores every record and private image from the real database', options, async () => {
  values.clear(); const result = await run(); assert.deepEqual(result.failed, []);
  const restored = JSON.parse(storage.getItem(stores.find(store => store.name === 'settings').key));
  assert.equal(restored.appliances[0].id, appliance.id); assert.equal(restored.bills[0].id, bill.id); assert.equal(restored.bills[0].subsidy, 500);
  assert.equal(restored.photo, photo); assert.equal(restored.monthlySubsidy, 500); assert.equal(restored.provider, 'anteco');
  assert.equal(JSON.parse(storage.getItem(stores.find(store => store.name === 'advisories').key)).find(record => record.id === advisory.id).original.image, png);
  const plans = JSON.parse(storage.getItem(stores.find(store => store.name === 'plans').key));
  const advisories = JSON.parse(storage.getItem(stores.find(store => store.name === 'advisories').key));
  assert.equal(planChanges(plans[0], advisories, restored).sourceChanged, false, 'equivalent database timestamps must not mark the source as changed');
  for (const store of stores) assert.notEqual(storage.getItem(store.key), null, store.name);
});

test('offline edits and deletions update the real database when the next sync runs', options, async () => {
  const key = stores.find(store => store.name === 'settings').key, restored = JSON.parse(storage.getItem(key));
  restored.appliances[0].watts = 75; restored.bills = []; delete restored.photo;
  storage.setItem(key, JSON.stringify(restored));
  assert.equal((await run(true)).state, 'offline');
  const result = await run(); assert.deepEqual(result.failed, []);
  const applianceRow = await client.from('appliances').select('watts').eq('household_id', householdId).single(); assert.ifError(applianceRow.error); assert.equal(applianceRow.data.watts, 75);
  const bills = await client.from('bills').select('id').eq('household_id', householdId); assert.ifError(bills.error); assert.equal(bills.data.length, 0);
  const profile = await client.from('profiles').select('avatar_path').eq('id', accountId).single(); assert.ifError(profile.error); assert.equal(profile.data.avatar_path, null);
});

test('image cleanup preserves saved plan snapshots and releases deleted advisory revisions', options, async () => {
  const store = stores.find(store => store.name === 'advisories');
  const reviewed = JSON.parse(storage.getItem(store.key));
  const image = reviewed.find(record => record.id === advisory.id); image.revision = 2; image.reviewedAt = '2040-10-02T00:00:00.000Z';
  save('advisories', reviewed); assert.deepEqual((await run()).failed, []);
  const list = async () => { const result = await client.storage.from('advisory-originals').list(`${accountId}/${advisory.id}`); assert.ifError(result.error); return result.data.map(file => file.name).sort(); };
  assert.deepEqual(await list(), ['r1.png', 'r2.png']);
  save('advisories', reviewed.filter(record => record.id !== advisory.id)); assert.deepEqual((await run()).failed, []);
  assert.deepEqual(await list(), ['r1.png'], 'the saved plan still owns revision 1');
  save('plans', []); assert.deepEqual((await run()).failed, []);
  assert.deepEqual(await list(), [], 'no unreferenced originals remain after deleting the last plan');
});
