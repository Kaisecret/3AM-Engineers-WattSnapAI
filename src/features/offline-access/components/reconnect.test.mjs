import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

const code=ts.transpileModule(readFileSync(new URL('./OfflineApp.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
function opened() {
 const listeners=new Map(),navigation=[],states=[];let reachable=false,requests=0,cleanup,persisted=true;
 const exports={},location={pathname:'/assistant',search:'',replace:path=>navigation.push(path)};
 vm.runInNewContext(code,{exports,location,navigator:{onLine:true},AbortController,setTimeout,clearTimeout,localStorage:{getItem:()=>persisted?JSON.stringify({identity:{id:'home'}}):null},window:{addEventListener:(name,listener)=>listeners.set(name,listener),removeEventListener:name=>listeners.delete(name)},fetch:async()=>{requests++;if(!reachable)throw new TypeError('Failed to fetch');return {ok:true,redirected:false};},require:name=>{
  if(name==='react/jsx-runtime')return jsx;
  if(name==='react')return {useState:initial=>[initial,value=>states.push(value)],useEffect:callback=>{cleanup=callback();}};
  if(name==='../connectivity')return {isDeviceOffline:()=>true};
  if(name==='@/features/auth/session')return {displayIdentityKey:'identity',displayIdentityEvent:'identity-event',restoreOfflineAccount:()=>({id:'home'}),readDisplayIdentity:()=>({id:'home'})};
  return {default:()=>null,WifiOff:()=>null};
 }});
 exports.default();
 return {navigation,states,get requests(){return requests;},connect:()=>{reachable=true;},removeScope:()=>{persisted=false;},emit:(name,event)=>listeners.get(name)?.(event),cleanup:()=>cleanup()};
}
test('a transient online event during document navigation cannot reopen the previous offline screen',async()=>{
 const app=opened();app.emit('beforeunload');await app.emit('online');
 assert.deepEqual(app.navigation,[]);assert.equal(app.requests,0);app.cleanup();
});
test('automatic reconnect verifies the server before leaving cached data',async()=>{
 const app=opened();await app.emit('online');assert.deepEqual(app.navigation,[]);
 app.connect();await app.emit('online');assert.deepEqual(app.navigation,['/assistant']);app.cleanup();
});
test('returning from browser history resets the unload guard and rechecks account scope',async()=>{
 const app=opened();app.emit('beforeunload');app.removeScope();
 await app.emit('pageshow',{persisted:true});assert.equal(app.states.at(-1),null);
 app.connect();await app.emit('online');assert.deepEqual(app.navigation,['/assistant']);app.cleanup();
});
