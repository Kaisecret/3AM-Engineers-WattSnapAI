import assert from 'node:assert/strict';
import test from 'node:test';
const {createTinyBertClient}=await import('./tinybert-client.ts');
function fakeWorker(){return {onmessage:null,onerror:null,sent:[],stopped:false,postMessage(value){this.sent.push(value);},terminate(){this.stopped=true;}};}
test('matches out-of-order model replies to their requests',async()=>{
  const worker=fakeWorker(),client=createTinyBertClient(()=>worker);
  const a=client.infer('a'),b=client.infer('b');
  worker.onmessage({data:{id:worker.sent[1].id,scores:[{label:'bill',score:1}]}});
  worker.onmessage({data:{id:worker.sent[0].id,scores:[{label:'budget',score:1}]}});
  assert.equal((await a)[0].label,'budget');assert.equal((await b)[0].label,'bill');client.dispose();
});
test('a stuck worker times out and a later request creates a new session',async()=>{
  const workers=[],client=createTinyBertClient(()=>{const worker=fakeWorker();workers.push(worker);return worker;},15);
  await assert.rejects(client.infer('a'),/timed out/);assert.equal(workers[0].stopped,true);
  const next=client.infer('b');workers[1].onmessage({data:{id:workers[1].sent[0].id,scores:[]}});
  assert.deepEqual(await next,[]);client.dispose();
});
test('disposing or a worker failure rejects pending requests',async()=>{
  for(const failure of ['dispose','error']){
    const worker=fakeWorker(),client=createTinyBertClient(()=>worker),pending=client.infer('private text');
    if(failure==='dispose')client.dispose();else worker.onerror({});
    await assert.rejects(pending,/stopped|unavailable/);assert.equal(worker.stopped,true);
  }
});
