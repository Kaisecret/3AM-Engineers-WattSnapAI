import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const { hybridLocalReply, confidentIntent } = await import('./hybrid-reply.ts');
const context={budget:2000,rate:10,bills:[{month:'2026-08',kwh:100,amount:1000},{month:'2026-09',kwh:120,amount:1200}],today:'2026-10-11'};
const scores=(label,score=.96)=>[{label,score},{label:'unknown',score:1-score}];

test('rejects uncertain, invalid, unknown and closely competing predictions',()=>{
  for(const result of [[],scores('budget',.5),scores('budget',.89),scores('unknown'),scores('made_up'),[{label:'budget',score:NaN}],[{label:'budget',score:.91},{label:'bill',score:.79}]]) assert.equal(confidentIntent(result),undefined);
  assert.equal(confidentIntent(scores('budget')),'budget');
});
test('validated grammar takes priority over inference and preserves confirmation',async()=>{
  let calls=0;
  const result=await hybridLocalReply('Set my budget to 2500',context,undefined,async()=>{calls++;return scores('bill');});
  assert.equal(calls,0);assert.deepEqual(result.actions,[{type:'set_budget',amount:2500}]);
});
test('model routes unfamiliar wording to saved records without inventing values',async()=>{
  const result=await hybridLocalReply('How much room do I have left to spend?',context,undefined,async()=>scores('budget'));
  assert.match(result.reply.text,/2,000\.00/);assert.match(result.reply.text,/800\.00/);assert.equal(result.source,'tinybert');assert.equal(result.actions.length,0);
});
test('original dates and units survive intent routing',async()=>{
  const result=await hybridLocalReply('Work out 100 W for 8 hours, 20 days, 2 units',context,undefined,async()=>scores('estimate'));
  assert.match(result.reply.text,/32 kWh/);assert.match(result.reply.text,/320\.00/);
  const bill=await hybridLocalReply('What was the charge for August 2026?',context,undefined,async()=>scores('bill'));
  assert.match(bill.reply.text,/August 2026/);assert.match(bill.reply.text,/1,000\.00/);assert.doesNotMatch(bill.reply.text,/September 2026/);
});
test('unknown questions and model failures leave the keyword assistant usable',async()=>{
  for(const infer of [async()=>scores('unknown'),async()=>scores('budget',.4),async()=>{throw new Error('Model not saved');}]){
    const result=await hybridLocalReply('quantum bananas?',context,undefined,infer);
    assert.equal(result.source,'keywords');assert.equal(result.actions.length,0);assert.ok(result.reply.suggestions?.length);
  }
});
