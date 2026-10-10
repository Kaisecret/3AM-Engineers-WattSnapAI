import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
function render(file, name, state, services = {}, props = {}) {
  const changes = [], navigation = []; let cursor = 0;
  const ui = new Proxy({ useCountdown: () => ({ remaining: 0, restart() {} }), fakeDelay: async () => {}, EMAIL_PATTERN: /@/ }, { get: (target, key) => target[key] ?? (() => null) });
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dependencies = {
    'react/jsx-runtime': jsx,
    react: { useState: initial => { const index = cursor++; return [index < state.length ? state[index] : initial, value => changes.push([index, value])]; }, useRef: initial => ({ current: initial }), useEffect() {} },
    'next/navigation': { useRouter: () => ({ push: path => navigation.push(path), replace: path => navigation.push(path), refresh() {} }) },
    'next/link': { default: () => null }, 'lucide-react': ui,
    './AuthUi': ui, './AuthShell': { AuthShell: () => null, AUTH_ART: {} }, './AuthSteps': ui,
    '../preview-session': { beginPreviewSession: () => navigation.push('preview') },
    '../../../lib/supabase/browser': { getBrowserSupabase: () => ({}) },
    '../service': services, '../actions': services, '../session': { forgetAccount() {}, rememberAccount() {} },
    '../schemas': { passwordRules: () => [{ label: 'strong', met: true }], safeNextPath: () => '/dashboard' },
  };
  vm.runInNewContext(code, { exports, require: key => { assert.ok(key in dependencies, key); return dependencies[key]; }, window: { location: { origin: 'https://wattsnap.test' } }, URL, console });
  const tree = exports[name](props);
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return null;
    if (predicate(node)) return node;
    for (const child of [node.props?.children].flat(Infinity)) { const found = find(child, predicate); if (found) return found; }
    return null;
  }
  return { changes, navigation, tree, find: predicate => find(tree, predicate) };
}
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
