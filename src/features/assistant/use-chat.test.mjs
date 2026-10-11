import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function chat({offline=false,offlineShell=false,fetch=async()=>Response.json({source:'gemini',reply:{text:'Gemini answer'}}),asyncLocalAgent,localAgent}={}){
  const state=[],hooks=[],cleanups=[];
  let cursor=0,result;
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
  const react={
    useState(initial){const slot=cursor++;if(!hooks[slot]){hooks[slot]={index:state.length};state.push(initial);}const index=hooks[slot].index;return [state[index],value=>{state[index]=typeof value==='function'?value(state[index]):value;render();}];},
    useRef(current){const slot=cursor++;return hooks[slot]??(hooks[slot]={current});},
    useEffect(callback,deps){const slot=cursor++;if(!same(hooks[slot]?.deps,deps)){const cleanup=callback();if(cleanup)cleanups.push(cleanup);hooks[slot]={deps};}},
    useCallback(callback,deps){const slot=cursor++;if(!same(hooks[slot]?.deps,deps))hooks[slot]={callback,deps};return hooks[slot].callback;}
  };
  const code=ts.transpileModule(fs.readFileSync(new URL('./use-chat.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const exports={};
  vm.runInNewContext(code,{exports,require:name=>name==='react'?react:{isDeviceOffline:()=>offline||offlineShell,isNetworkOffline:()=>offline},fetch,Response,AbortController,setTimeout,clearTimeout});
  const grammar=()=>({reply:{text:'Keyword answer'},actions:[],handled:false});
  const respond=()=>({text:'Keyword answer'}),context={budget:1234};
  function render(){cursor=0;result=exports.useChat(respond,{endpoint:'/api/ai/assistant',context,localAgent:localAgent??grammar,asyncLocalAgent,explainFallback:true});}
  render();
  return {get result(){return result;},state,setOffline:value=>{offline=value;},dispose:()=>cleanups.forEach(callback=>callback())};
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
test('the first recognized online question goes to Gemini instead of saved-data keywords',async()=>{
  let calls=0,parses=0;
  const app=chat({localAgent:()=>{parses++;return {reply:{text:'Cached appliance list'},actions:[],handled:true};},fetch:async()=>{calls++;return Response.json({source:'gemini',reply:{text:'Fresh Gemini appliance answer'}});}});
  app.result.send('List my appliances and their cost');await flush();
  assert.equal(calls,1);assert.equal(parses,0);assert.equal(app.state[0].at(-1).text,'Fresh Gemini appliance answer');
  assert.equal(app.state[0].at(-1).source,'gemini');assert.match(app.state[0].at(-1).notice,/WattSnap AI.*online/);app.dispose();
});
test('online bill edits and clarifications reach Gemini rather than the local grammar',async()=>{
  let calls=0;
  const app=chat({localAgent:()=>({reply:{text:'Local month question'},actions:[],pending:{message:'Add bill',field:'month'}}),fetch:async()=>{calls++;return Response.json({source:'gemini',reply:{text:'Which billing month?'}});}});
  app.result.send('Can you set up my bill to 10000?');await flush();
  assert.equal(calls,1);assert.equal(app.state[0].at(-1).text,'Which billing month?');app.dispose();
});
test('a cached offline shell does not suppress Gemini after network returns',async()=>{
  let calls=0;
  const app=chat({offlineShell:true,fetch:async()=>{calls++;return Response.json({source:'gemini',reply:{text:'Online again'}});}});
  app.result.send('Why did September cost more?');await flush();
  assert.equal(calls,1);assert.equal(app.state[0].at(-1).text,'Online again');app.dispose();
});
test('each send checks connectivity and switches from TinyBERT to Gemini',async()=>{
  let calls=0;
  const app=chat({offline:true,fetch:async()=>{calls++;return Response.json({source:'gemini',reply:{text:'Online reply'}});},asyncLocalAgent:async()=>({reply:{text:'Offline reply'},actions:[],source:'tinybert'})});
  app.result.send('first question');await flush();assert.equal(calls,0);
  app.setOffline(false);app.result.send('next question');await flush();assert.equal(calls,1);assert.equal(app.state[0].at(-1).text,'Online reply');app.dispose();
});
test('Gemini unavailability is visible even when TinyBERT answers the fallback',async()=>{
  const app=chat({fetch:async()=>Response.json({source:'local-fallback',problem:'busy',reply:{text:'Server keywords'}}),asyncLocalAgent:async()=>({reply:{text:'TinyBERT fallback'},actions:[],source:'tinybert'})});
  app.result.send('question');await flush();
  assert.equal(app.state[0].at(-1).text,'TinyBERT fallback');assert.match(app.state[0].at(-1).notice,/WattSnap AI.*busy.*TinyBERT/);app.dispose();
});
test('online clarification can continue offline using validated earlier user turns',async()=>{
  const grammar=(text,_context,pending)=>text.includes('Set up')?{reply:{text:'Which month?'},actions:[],pending:{message:text,field:'month'}}:
    pending?.message.includes('10000')?{reply:{text:'Consumption needed for your 10000 peso bill'},actions:[],pending:{message:pending.message+', '+text,field:'kwh'}}:{reply:{text:'No request context'},actions:[]};
  const app=chat({localAgent:grammar,asyncLocalAgent:async(text,context,pending)=>({...grammar(text,context,pending),source:'keywords'})});
  app.result.send('Set up my September bill to 10000');await flush();
  app.setOffline(true);app.result.send('September 2026');await flush();
  assert.match(app.state[0].at(-1).text,/10000 peso bill/);app.dispose();
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
