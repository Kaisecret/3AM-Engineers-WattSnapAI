import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

const code=ts.transpileModule(readFileSync(new URL('./OfflineSupport.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function mounted(){
  const listeners=new Map(),workerListeners=new Map(),messages=[],cleanups=[];
  let controller={postMessage:message=>messages.push(['old',message.type])};
  const serviceWorker={get controller(){return controller;},register:async()=>({}),ready:Promise.resolve({}),addEventListener:(name,handler)=>workerListeners.set(name,handler),removeEventListener:name=>workerListeners.delete(name)};
  const exports={};
  vm.runInNewContext(code,{exports,URL,Event,process:{env:{NODE_ENV:'production'}},navigator:{serviceWorker},location:{origin:'https://wattsnap.test'},performance:{getEntriesByType:()=>[]},document:{documentElement:{dataset:{}},addEventListener:()=>{},removeEventListener:()=>{}},window:{addEventListener:(name,handler)=>listeners.set(name,handler),removeEventListener:name=>listeners.delete(name),dispatchEvent:()=>{}},MessageChannel:class{constructor(){this.port1={close:()=>{}};this.port2={close:()=>{}};}},fetch:async()=>{},require:name=>{
    if(name==='react/jsx-runtime')return jsx;
    if(name==='react')return {useState:initial=>[initial,()=>{}],useEffect:effect=>{const cleanup=effect();if(cleanup)cleanups.push(cleanup);}};
    return {isDeviceOffline:()=>false};
  }});
  exports.default();
  return {messages,emit:name=>listeners.get(name)?.(),upgrade:()=>{controller={postMessage:message=>messages.push(['new',message.type])};workerListeners.get('controllerchange')?.();},cleanup:()=>cleanups.forEach(cleanup=>cleanup())};
}

test('an upgraded worker prepares all artwork without waiting for another page load',async()=>{
  const app=mounted();await tick();assert.deepEqual(app.messages,[['old','PREPARE_OFFLINE']]);
  app.upgrade();await tick();assert.deepEqual(app.messages,[['old','PREPARE_OFFLINE'],['new','PREPARE_OFFLINE']]);app.cleanup();
});

test('reconnecting retries preparation when pictures were not yet saved',async()=>{
  const app=mounted();await tick();app.emit('online');await tick();
  assert.equal(app.messages.length,2);app.cleanup();
});
