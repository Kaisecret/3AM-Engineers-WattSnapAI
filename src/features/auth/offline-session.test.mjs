import assert from 'node:assert/strict';
import test from 'node:test';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const {displayIdentityKey,forgetAccount,readDisplayIdentity,restoreOfflineAccount}=await import('./session.ts');
const values=new Map();
globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
globalThis.window={dispatchEvent(){}};
const identity={id:'11111111-1111-4111-8111-111111111111',name:'Maria',email:'maria@example.test'};
const online=value=>Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:value}});
test('offline scope restores only the last display identity and never online authorization',()=>{
  online(false);values.set(displayIdentityKey,JSON.stringify({version:1,identity}));
  assert.equal(restoreOfflineAccount()?.id,identity.id);assert.equal(readDisplayIdentity()?.id,identity.id);
  forgetAccount();assert.equal(restoreOfflineAccount(),null);assert.equal(readDisplayIdentity(),null);
  values.set(displayIdentityKey,JSON.stringify({version:1,identity}));online(true);
  assert.equal(restoreOfflineAccount(),null);assert.equal(readDisplayIdentity(),null);
});
test('missing, malformed or legacy identities never open an offline household',()=>{
  online(false);
  for(const raw of ['null','{',JSON.stringify({version:2,identity}),JSON.stringify({version:1,identity:{...identity,id:'maria@example.test'}}),JSON.stringify({version:1,identity:{...identity,name:''}})]){
    values.set(displayIdentityKey,raw);assert.equal(restoreOfflineAccount(),null);
  }
});
test('a service-worker fallback restores the local scope even when the network indicator is wrong',()=>{
  online(true);globalThis.document={documentElement:{dataset:{offlineShell:'true'}}};
  values.set(displayIdentityKey,JSON.stringify({version:1,identity}));
  assert.equal(restoreOfflineAccount()?.id,identity.id);
  forgetAccount();delete globalThis.document;
});
