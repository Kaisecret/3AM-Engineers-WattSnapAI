import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBillDraft } from './local-draft.ts';
test('unfinished bill fields recover without photos, confirmation or fabricated extraction', () => {
  const draft = normalizeBillDraft({ version: 1, draft: { month: '2026-10', amount: '1420', kwh: '102', notes: 'Check period', image: 'private photo', reviewed: true } });
  assert.equal(draft.amount, '1420'); assert.equal(draft.kwh, '102');
  assert.equal(draft.image, undefined); assert.equal(draft.reviewed, undefined);
  assert.equal(draft.dueDate, '');
});
test('unknown versions, malformed fields and oversized drafts remain unreadable', () => {
  assert.throws(() => normalizeBillDraft({ version: 2, draft: {} }));
  assert.throws(() => normalizeBillDraft({ version: 1, draft: { amount: 50 } }));
  assert.throws(() => normalizeBillDraft({ version: 1, draft: { notes: 'a'.repeat(501) } }));
});

test('a typed subsidy survives a refresh, and an untouched one stays automatic', () => {
  assert.equal(normalizeBillDraft({ version: 1, draft: { month: '2026-09', amount: '418.85', kwh: '33', subsidy: '418.85' } }).subsidy, '418.85');
  assert.equal(normalizeBillDraft({ version: 1, draft: { month: '2026-09', amount: '418.85', kwh: '33' } }).subsidy, undefined);
  assert.throws(() => normalizeBillDraft({ version: 1, draft: { month: '2026-09', subsidy: 500 } }));
});
