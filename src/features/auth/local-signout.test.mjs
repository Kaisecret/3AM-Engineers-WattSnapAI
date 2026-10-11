import assert from 'node:assert/strict';
import test from 'node:test';
import { clearLocalAuth } from './local-signout.ts';

function storage(values) {
  const entries = new Map(Object.entries(values));
  return { get length(){return entries.size;}, key:index=>[...entries.keys()][index]??null, getItem:key=>entries.get(key)??null, removeItem:key=>entries.delete(key) };
}
function browser(blockCookies=false) {
  const cookies=new Map([['sb-project-auth-token.0','expired-token'],['sb-project-auth-token.1','refresh-token'],['sb-project-auth-token-code-verifier','verifier'],['sb-other-auth-token','another-project']]);
  globalThis.document={get cookie(){return [...cookies].map(([key,value])=>key+'='+value).join('; ');},set cookie(value){if(!blockCookies)cookies.delete(value.split('=')[0]);}};
  globalThis.localStorage=storage({'sb-project-auth-token':'expired-token','sb-project-auth-token-user':'cached-user','sb-other-auth-token':'keep','wattsnap-ui-preview-v1:household:123':'keep'});
  globalThis.sessionStorage=storage({'sb-project-auth-token-flows-code-verifier':'pending-flow'});
  globalThis.location={protocol:'https:'};
  return cookies;
}
test('offline sign-out removes expired credentials and PKCE chunks without network access',()=>{
  const cookies=browser();
  clearLocalAuth('https://project.supabase.co');
  assert.deepEqual([...cookies.keys()],['sb-other-auth-token']);
  assert.equal(localStorage.getItem('sb-project-auth-token'),null);
  assert.equal(localStorage.getItem('sb-project-auth-token-user'),null);
  assert.equal(sessionStorage.length,0);
  assert.equal(localStorage.getItem('sb-other-auth-token'),'keep');
  assert.equal(localStorage.getItem('wattsnap-ui-preview-v1:household:123'),'keep');
});
test('blocked credential removal cannot report a completed local sign-out',()=>{
  browser(true);assert.throws(()=>clearLocalAuth('https://project.supabase.co'),/sign.out/i);
});
