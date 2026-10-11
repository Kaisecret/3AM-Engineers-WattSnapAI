import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function chat({offline=false,fetch=async()=>Response.json({source:'gemini',reply:{text:'Gemini answer'}}),asyncLocalAgent}={}){
  const state=[],cleanups=[];
  const react={useState(initial){const index=state.length;state.push(initial);return [initial,value=>{state[index]=typeof value==='function'?value(state[index]):value;}];},useRef:current=>({current}),useEffect(callback){const cleanup=callback();if(cleanup)cleanups.push(cleanup);},useCallback:callback=>callback};
  const code=ts.transpileModule(fs.readFileSync(new URL('./use-chat.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const exports={};
  vm.runInNewContext(code,{exports,require:name=>name==='react'?react:{isDeviceOffline:()=>offline},fetch,Response,AbortController,setTimeout,clearTimeout});
  const grammar=()=>({reply:{text:'Keyword answer'},actions:[],handled:false});
  const result=exports.useChat(()=>({text:'Keyword answer'}),{endpoint:'/api/ai/assistant',context:{budget:1234},localAgent:grammar,asyncLocalAgent,explainFallback:true});
  return {result,state,dispose:()=>cleanups.forEach(callback=>callback())};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('offline questions await inference without sending a cloud request',async()=>{
  let calls=0;
  const app=chat({offline:true,fetch:()=>{calls++;throw Error('Offline');},asyncLocalAgent:async(text,context)=>({reply:{text:`Local model ${context.budget}`},actions:[],source:'tinybert'})});
  assert.equal(app.result.send('unfamiliar question'),true);assert.equal(app.state[1],true);
  await flush();assert.equal(calls,0);assert.equal(app.state[0].at(-1).text,'Local model 1234');assert.equal(app.state[1],false);app.dispose();
});
test('online questions go to Gemini and do not invoke the local model',async()=>{
  let localCalls=0,cloudCalls=0;
  const app=chat({fetch:async()=>{cloudCalls++;return Response.json({source:'gemini',reply:{text:'Gemini answer'}});},asyncLocalAgent:async()=>{localCalls++;throw Error('Should not run');}});
  app.result.send('a broader question');await flush();
  assert.equal(cloudCalls,1);assert.equal(localCalls,0);assert.equal(app.state[0].at(-1).text,'Gemini answer');app.dispose();
});
test('Gemini failure switches to asynchronous local inference',async()=>{
  const app=chat({fetch:async()=>{throw new TypeError('Network failure');},asyncLocalAgent:async()=>({reply:{text:'Local fallback'},actions:[],source:'tinybert'})});
  app.result.send('question');await flush();assert.equal(app.state[0].at(-1).text,'Local fallback');assert.equal(app.state[1],false);app.dispose();
});
test('reset discards late model answers and allows the next conversation',async()=>{
  let finish;
  const app=chat({offline:true,asyncLocalAgent:()=>new Promise(resolve=>{finish=resolve;})});
  app.result.send('old question');app.result.reset();finish({reply:{text:'Old private reply'},actions:[],source:'tinybert'});
  await flush();assert.equal(app.state[0].length,0);assert.equal(app.state[1],false);assert.equal(app.result.send('new question'),true);
  finish({reply:{text:'New reply'},actions:[],source:'tinybert'});await flush();assert.equal(app.state[0].at(-1).text,'New reply');app.dispose();
});
