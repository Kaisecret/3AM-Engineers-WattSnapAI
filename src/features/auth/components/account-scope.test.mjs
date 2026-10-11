import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

const identityKey='wattsnap-account-display-v1', identityEvent='wattsnap-preview-session-change';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const code=ts.transpileModule(readFileSync(new URL('./AccountSynchronizer.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
function tab(id,store) {
 const listeners=new Map(), navigation=[], states=[];let scope=null, authListener, cleanup;
 const session={displayIdentityKey:identityKey,displayIdentityEvent:identityEvent,rememberAccount(account){scope=account.id;store.set(identityKey,JSON.stringify({identity:{id:account.id}}));},readDisplayIdentity:()=>scope?{id:scope}:null,clearDisplayIdentityMemory(){scope=null;},forgetAccount(){scope=null;store.delete(identityKey);listeners.get(identityEvent)?.();}};
 const exports={};
 vm.runInNewContext(code,{exports,localStorage:{getItem:key=>store.get(key)??null},window:{addEventListener:(name,listener)=>listeners.set(name,listener),removeEventListener:name=>listeners.delete(name),location:{replace:path=>navigation.push(path)}},require:name=>{
  if(name==='react/jsx-runtime')return jsx;
  if(name==='react')return {useState:initial=>[initial,value=>states.push(value)],useEffect:callback=>{cleanup=callback();}};
  if(name==='next/navigation')return {useRouter:()=>({refresh:()=>navigation.push('refresh')})};
  if(name==='../session')return session;
  if(name==='../../../lib/supabase/browser')return {getBrowserSupabase:()=>({auth:{onAuthStateChange:listener=>{authListener=listener;return {data:{subscription:{unsubscribe(){}}}};}}})};
  throw new Error('Unexpected dependency '+name);
 }});
 exports.AccountSynchronizer({account:{id,email:id+'@example.test',profile:{fullName:'Home'}},children:'private child'});
 return {navigation,states,get scope(){return scope;},auth:(event,id)=>authListener(event,id?{user:{id}}:null),storage:()=>listeners.get('storage')?.({key:identityKey}),cleanup:()=>cleanup()};
}
test('changing account closes an older tab without deleting the new household scope',()=>{
 const store=new Map(),old=tab(a,store),current=tab(b,store);
 old.auth('SIGNED_IN',b);current.storage();
 assert.equal(JSON.parse(store.get(identityKey)).identity.id,b);
 assert.equal(old.scope,null);assert.equal(current.scope,b);assert.deepEqual(current.navigation,[]);
 old.cleanup();current.cleanup();
});
test('offline logout in another tab drops the verified page memory through the storage event',()=>{
 const store=new Map(),current=tab(a,store);store.delete(identityKey);current.storage();
 assert.equal(current.scope,null);assert.equal(current.states.at(-1),null);assert.deepEqual(current.navigation,['/login']);current.cleanup();
});
