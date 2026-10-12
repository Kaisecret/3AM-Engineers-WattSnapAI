import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import { untilConnected } from '../until-connected.ts';
function render(file, name, state, services = {}, props = {}, pending = false) {
  const changes = [], navigation = [], transitions = []; let cursor = 0;
  const ui = new Proxy({ useCountdown: () => ({ remaining: 0, restart() {} }), fakeDelay: async () => {}, EMAIL_PATTERN: /@/ }, { get: (target, key) => target[key] ?? (() => null) });
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dependencies = {
    'react/jsx-runtime': jsx,
    react: { useState: initial => { const index = cursor++; return [index < state.length ? state[index] : initial, value => changes.push([index, value])]; }, useRef: initial => ({ current: initial }), useEffect() {}, useTransition: () => [pending, run => { const before = navigation.length; run(); transitions.push(navigation.slice(before)); }] },
    'next/navigation': { useRouter: () => ({ push: path => navigation.push(path), replace: path => navigation.push(path), refresh() {} }) },
    'next/link': { default: () => null }, 'lucide-react': ui,
    './AuthUi': ui, './AuthShell': { AuthShell: () => null, AUTH_ART: {} }, './AuthSteps': ui,
    '../preview-session': { beginPreviewSession: () => navigation.push('preview') },
    '../../../lib/supabase/browser': { getBrowserSupabase: () => ({}) },
    '../service': services, '../actions': services, '../session': { forgetAccount() {}, rememberAccount() {} },
    '../until-connected': { untilConnected, waitForSignal: async () => {} },
    '../schemas': { passwordRules: () => [{ label: 'strong', met: true }], safeNextPath: () => '/dashboard', parseIdentifier: value => value.includes('@') ? { kind: 'email', email: value } : { kind: 'username', username: value } },
  };
  vm.runInNewContext(code, { exports, require: key => { assert.ok(key in dependencies, key); return dependencies[key]; }, window: { location: { origin: 'https://wattsnap.test', href: 'https://wattsnap.test/login' } }, URL, console });
  const tree = exports[name](props);
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return null;
    if (predicate(node)) return node;
    for (const child of [node.props?.children].flat(Infinity)) { const found = find(child, predicate); if (found) return found; }
    return null;
  }
  return { changes, navigation, transitions, tree, find: predicate => find(tree, predicate) };
}
const account = { ok: true, value: { profile: { onboardedAt: '2026-01-01' } } };
const noSignal = { ok: false, kind: 'network', message: "You're offline or the server can't be reached. Please try again." };
const failure = { ok: false, message: 'That code is incorrect or has expired.' };
test('invalid recovery code keeps the verification step and shows the server failure', async () => {
  let advanced = false, received;
  const rendered = render('./AuthSteps.tsx', 'VerifyCodeStep', [['1','2','3','4','5','6'], false], { verifyRecoveryCode: async (_, input) => { received = input; return failure; } }, { email: 'maria@example.com', purpose: 'recovery', onVerified: () => advanced = true });
  await rendered.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(advanced, false); assert.equal(received.code, '123456');
  assert.ok(rendered.changes.some(([, value]) => value === failure.message));
});
test('failed signup send stays on the account form with visible feedback', async () => {
  const rendered = render('./SignupFlow.tsx', 'SignupFlow', ['account', 'Maria Santos', 'maria@example.com', 'abc12345x', true], { signUpWithEmail: async () => failure });
  await rendered.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(rendered.changes.some(([, value]) => value === 'verify'), false);
  assert.ok(rendered.changes.some(([, value]) => value === failure.message));
});
test('profile completion does not collect an unpersisted birth date', () => {
  const rendered = render('./AuthSteps.tsx', 'ProfileSetupStep', [], {}, { onContinue() {} });
  assert.equal(rendered.find(node => node.props?.id === 'profile-birthdate'), null);
});
test('failed password login stays on login and shows the returned failure', async () => {
  const rendered = render('./LoginForm.tsx', 'LoginForm', ['maria', 'abc12345x', null, false], { loginWithIdentifier: async () => failure });
  await rendered.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.deepEqual(rendered.navigation, []);
  assert.ok(rendered.changes.some(([, value]) => value === failure.message));
});
test('failed password reset does not show a success screen', async () => {
  const rendered = render('./ResetPasswordForm.tsx', 'ResetPasswordForm', ['abc12345x', 'abc12345x', false, false, null], { updatePassword: async () => failure });
  await rendered.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(rendered.changes.some(([index, value]) => index === 3 && value === true), false);
  assert.ok(rendered.changes.some(([, value]) => value === failure.message));
});
test('email login signs in from the browser, so Supabase limits attempts per visitor', async () => {
  const calls = [];
  const rendered = render('./LoginForm.tsx', 'LoginForm', ['maria@gmail.com', 'abc12345x', null, false], {
    signInWithEmail: async (_client, input) => { calls.push(['browser', input.email, input.password]); return failure; },
    loginWithIdentifier: async () => { calls.push(['server']); return failure; },
  });
  await rendered.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.deepEqual(calls, [['browser', 'maria@gmail.com', 'abc12345x']]);
  assert.deepEqual(rendered.navigation, []);
  assert.ok(rendered.changes.some(([, value]) => value === failure.message));
});
test('username login goes to the server, which looks up the email privately', async () => {
  const calls = [];
  const rendered = render('./LoginForm.tsx', 'LoginForm', ['maria', 'abc12345x', null, false], {
    signInWithEmail: async () => { calls.push(['browser']); return failure; },
    loginWithIdentifier: async input => { calls.push(['server', input.identifier]); return failure; },
  });
  await rendered.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.deepEqual(calls, [['server', 'maria']]);
});
const submit = rendered => rendered.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
test('a login with no signal waits and finishes by itself once the signal returns', async () => {
  const answers = [noSignal, noSignal, { ok: true, value: undefined }]; let signIns = 0, accounts = 0;
  const rendered = render('./LoginForm.tsx', 'LoginForm', ['maria@gmail.com', 'abc12345x', null, false], {
    signInWithEmail: async () => answers[signIns++],
    getAccount: async () => accounts++ === 0 ? noSignal : account,
  });
  await submit(rendered);
  assert.equal(signIns, 3); assert.equal(accounts, 2, 'a lost signal after signing in repeats only the account check');
  assert.deepEqual(rendered.navigation, ['/dashboard']);
  assert.equal(rendered.changes.some(([, value]) => value === noSignal.message), false, 'no error asks for another tap');
});
test('the Log in button keeps loading until the next page has opened', async () => {
  const services = { signInWithEmail: async () => ({ ok: true, value: undefined }), getAccount: async () => account };
  const rendered = render('./LoginForm.tsx', 'LoginForm', ['maria@gmail.com', 'abc12345x', null, false], services);
  await submit(rendered);
  assert.deepEqual(rendered.transitions, [['/dashboard']], 'opening the next page is tracked as pending');
  const opening = render('./LoginForm.tsx', 'LoginForm', ['maria@gmail.com', 'abc12345x', null, false], services, {}, true);
  assert.equal(opening.find(node => node.props?.id === 'login-submit-button').props.loading, true);
});
test('a username login waits for signal when this device cannot reach the server', async () => {
  let calls = 0;
  const rendered = render('./LoginForm.tsx', 'LoginForm', ['maria', 'abc12345x', null, false], {
    loginWithIdentifier: async () => { if (calls++ === 0) throw new TypeError('Failed to fetch'); return { ok: true, value: undefined }; },
    toFailure: () => noSignal, getAccount: async () => account,
  });
  await submit(rendered);
  assert.equal(calls, 2); assert.deepEqual(rendered.navigation, ['/dashboard']);
});
test('a username login the server itself could not complete is shown, not retried', async () => {
  let calls = 0;
  const rendered = render('./LoginForm.tsx', 'LoginForm', ['maria', 'abc12345x', null, false], { loginWithIdentifier: async () => { calls++; return noSignal; } });
  await submit(rendered);
  assert.equal(calls, 1, 'retries never use up the sign-in attempt limit');
  assert.ok(rendered.changes.some(([, value]) => value === noSignal.message));
});
test('Cancel stops a login that is waiting for signal', async () => {
  let signIns = 0;
  const rendered = render('./LoginForm.tsx', 'LoginForm', ['maria@gmail.com', 'abc12345x', null, true, true], {
    signInWithEmail: async () => { if (++signIns === 2) cancel.props.onClick(); assert.ok(signIns < 5, 'retries stopped'); return noSignal; },
  });
  const cancel = rendered.find(node => node.type === 'button' && node.props.children === 'Cancel');
  assert.ok(cancel, 'the waiting notice offers a way out');
  await submit(rendered);
  assert.equal(signIns, 2); assert.deepEqual(rendered.navigation, []);
});
