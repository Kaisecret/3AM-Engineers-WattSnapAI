import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({resolve(specifier,context,nextResolve){try{return nextResolve(specifier,context);}catch(error){if(error.code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return nextResolve(`${specifier}.ts`,context);throw error;}}});
const { localAgentReply } = await import('./local-agent.ts');
const context={appliances:[{name:'Bedroom fan',watts:60,hours:8,quantity:1}],bills:[]};

test('offline budget and subsidy commands use validated positive pesos',()=>{
  assert.deepEqual(localAgentReply('Set my budget to ₱2,500',context).actions,[{type:'set_budget',amount:2500}]);
  assert.deepEqual(localAgentReply('Itakda ang budget sa 1500 pesos',context).actions,[{type:'set_budget',amount:1500}]);
  assert.deepEqual(localAgentReply('Set my monthly subsidy to 0',context).actions,[{type:'set_monthly_subsidy',amount:0}]);
  assert.equal(localAgentReply('Set my budget to -200',context).actions.length,0);
  assert.equal(localAgentReply('Set my budget to 999999999',context).actions.length,0);
});
test('offline appliance commands preserve watts, hours, quantity and days',()=>{
  const result=localAgentReply('Add 2 electric fans, 0.06 kW, 8 hours a day, 20 days',context);
  assert.equal(result.actions[0].type,'add_appliance');
  assert.deepEqual(result.actions[0].appliance,{name:'electric fans',kind:'fan',watts:60,hours:8,quantity:2,days:20,source:'manual',wattageBasis:'approximate'});
});
test('missing watts asks a question and a short follow-up completes the request',()=>{
  const first=localAgentReply('Add an electric fan, 8 hours a day',context);
  assert.equal(first.actions.length,0);assert.match(first.reply.text,/watts/);assert.ok(first.pending);
  const second=localAgentReply('60 W',context,first.pending);
  assert.equal(second.actions[0].appliance.watts,60);assert.equal(second.actions[0].appliance.hours,8);assert.equal(second.pending,undefined);
});
test('bare numbers complete only the specific missing field',()=>{
  const first=localAgentReply('Add Bedroom fan 60 W',context);
  const second=localAgentReply('8',context,first.pending);
  assert.equal(second.actions[0].appliance.hours,8);
  assert.equal(localAgentReply('60 W',context).actions.length,0);
  assert.equal(localAgentReply('cancel',context,first.pending).pending,undefined);
});
test('a month-name follow-up continues an incomplete bill request',()=>{
  const first=localAgentReply('Add my bill',context);
  const second=localAgentReply('September 2026',context,first.pending);
  assert.match(second.reply.text,/kWh/);
  const third=localAgentReply('33',context,second.pending);
  const fourth=localAgentReply('418.85',context,third.pending);
  assert.equal(fourth.actions[0].bill.month,'2026-09');assert.equal(fourth.actions[0].bill.amount,418.85);
});
test('numbers outside a budget amount are not mistaken for money',()=>{
  assert.equal(localAgentReply('Set my 2026 budget to 2500',context).actions[0].amount,2500);
});
test('updates are checked against the current appliance before proposal',()=>{
  assert.equal(localAgentReply('Change Bedroom fan to 30 hours a day',context).actions.length,0);
});
test('unsafe or incomplete appliance values never produce an action',()=>{
  for(const command of ['Add a fan -60 W 8 hours','Add a fan 60 W 30 hours','Add a fan 60 W 8 hours 999 days'])assert.equal(localAgentReply(command,context).actions.length,0,command);
});
test('existing appliances can be updated or removed by name',()=>{
  assert.deepEqual(localAgentReply('Change Bedroom fan to 5 hours a day',context).actions,[{type:'update_appliance',name:'Bedroom fan',changes:{hours:5}}]);
  assert.deepEqual(localAgentReply('Remove Bedroom fan',context).actions,[{type:'remove_appliance',name:'Bedroom fan'}]);
  assert.equal(localAgentReply('Remove freezer',context).actions.length,0);
  const ambiguous={...context,appliances:[...context.appliances,{name:'Kitchen fan',watts:55,hours:4,quantity:1}]};
  assert.equal(localAgentReply('Remove fan',ambiguous).actions.length,0);
});
test('offline bills require explicit month, kWh and amount, with no invented subsidy',()=>{
  const result=localAgentReply('Add my September 2026 bill, 33 kWh, ₱418.85',context);
  assert.deepEqual(result.actions,[{type:'add_bill',bill:{month:'2026-09',kwh:33,amount:418.85,source:'manual'}}]);
  assert.equal(localAgentReply('Add my bill for this month',context).actions.length,0);
  assert.equal(localAgentReply('Add my September 2026 bill, 33 kWh',context).actions.length,0);
});
test('informational and hypothetical requests do not save anything',()=>{
  for(const command of ['What is my budget?','What if I add a fan 60 W 8 hours?','How do I set my budget to 2000?'])assert.equal(localAgentReply(command,context).actions.length,0);
});
test('multiple explicit commands prepare separate reviewed actions',()=>{
  const result=localAgentReply('Set my budget to 2000; Add a fan 60 W 8 hours',context);
  assert.equal(result.actions.length,2);assert.equal(result.actions[0].type,'set_budget');assert.equal(result.actions[1].type,'add_appliance');
});
test('offline navigation returns an internal link',()=>{
  assert.equal(localAgentReply('Open appliances',context).reply.links[0].href,'/appliances');
});
test('numeric tokens preserve leading decimals and reject malformed numbers',()=>{
  assert.equal(localAgentReply('Add a fan .06 kW 8 hours',context).actions[0]?.appliance.watts,60);
  assert.equal(localAgentReply('Add a fan 60 W .5 hours',context).actions[0]?.appliance.hours,.5);
  for(const command of ['Add a fan 1e3 W 8 hours','Set budget to 2,5','Set budget to 1e3']) assert.equal(localAgentReply(command,context).actions.length,0,command);
});
test('mixed setting targets never put the budget amount into subsidy',()=>{
  const result=localAgentReply('Set budget to 2000 and subsidy to 500',context);
  assert.equal(result.actions.length,0);assert.match(result.reply.text,/separate|one.*time/i);
});
test('invalid follow-ups retain the original request for a corrected value',()=>{
  const first=localAgentReply('Add fan 60 W',context);
  const invalid=localAgentReply('30',context,first.pending);
  assert.equal(invalid.actions.length,0);assert.match(invalid.reply.text,/24/);assert.deepEqual(invalid.pending,first.pending);
  const corrected=localAgentReply('8',context,invalid.pending);
  assert.equal(corrected.actions[0]?.appliance.hours,8);
  const budget=localAgentReply('Set budget',context);
  const invalidBudget=localAgentReply('-10',context,budget.pending);
  assert.deepEqual(invalidBudget.pending,budget.pending);
  assert.equal(localAgentReply('2000',context,invalidBudget.pending).actions[0]?.amount,2000);
});
test('a due date is not the billing month',()=>{
  const result=localAgentReply('Add my bill, 33 kWh, amount 418.85, due 2026-10-20',context);
  assert.equal(result.actions.length,0);assert.equal(result.pending?.field,'month');
});
test('one complete message retains both saved-data questions and confirmed changes',()=>{
 const result=localAgentReply('What is my budget?; Set my budget to 2500',{...context,budget:2000});
 assert.match(result.reply.text,/2,000\.00/);assert.equal(result.actions[0]?.amount,2500);
});
test('polite explicit changes are handled immediately while explanatory questions stay read-only',()=>{
 assert.equal(localAgentReply('Can you please set my budget to 2500?',context).actions[0]?.amount,2500);
 assert.equal(localAgentReply('How do I set my budget to 2500?',context).actions.length,0);
});
test('compound requests retain supported update and navigation commands',()=>{
 const result=localAgentReply('Set my budget to 2500 and update Bedroom fan to 4 hours',context);
 assert.deepEqual(result.actions.map(action=>action.type),['set_budget','update_appliance']);
 assert.equal(result.actions[1].changes.hours,4);
 assert.ok(localAgentReply('Set budget to 2500 and open appliances',context).reply.links.some(link=>link.href==='/appliances'));
});

test('natural missing-receipt bill edits ask for details instead of reading an old bill',()=>{
  const home={...context,today:'2026-10-12',bills:[{month:'2026-08',kwh:192,amount:3072.6}]};
  for(const text of ['Can you set up my bill in August the receipt is vanished plss. Set up to 10000','My September bill is vanished so I cannot scan so now plss setup plss10000','I mean my bill set to 10000']){
    const result=localAgentReply(text,home);
    assert.equal(result.actions.length,0,text);assert.ok(result.pending,text);assert.doesNotMatch(result.reply.text,/192 kWh|3,072/);
  }
});
test('offline bill entry retains the amount and named month across clarification',()=>{
  const home={...context,today:'2026-10-12'};
  const first=localAgentReply('Can you set up my September bill to 10000? I lost the receipt',home);
  assert.equal(first.pending?.field,'month');
  const second=localAgentReply('September 2026',home,first.pending);
  assert.equal(second.pending?.field,'kwh');
  const third=localAgentReply('120',home,second.pending);
  assert.equal(third.actions[0]?.bill.month,'2026-09');assert.equal(third.actions[0]?.bill.amount,10000);assert.equal(third.actions[0]?.bill.kwh,120);
});
test('offline missing-receipt requests never invent consumption',()=>{
  const first=localAgentReply('Set up my August 2026 bill to 10000',context);
  assert.equal(first.pending?.field,'kwh');assert.match(first.reply.text,/kWh/);
  const second=localAgentReply('I do not know the kWh because the receipt is lost',context,first.pending);
  assert.equal(second.actions.length,0);assert.match(second.reply.text,/kWh|bill.*manually/i);
});
test('an amount survives a direct kWh follow-up after a fully named billing period',()=>{
  const first=localAgentReply('Set up my August 2026 bill to 10000',context);
  for(const [text,kwh] of [['120',120],['.5',.5],['1,200',1200]]){
    const second=localAgentReply(text,context,first.pending);
    assert.equal(second.actions[0]?.bill.amount,10000);assert.equal(second.actions[0]?.bill.kwh,kwh);
  }
});
test('attached please wording keeps the supplied bill amount',()=>{
  const first=localAgentReply('My September bill vanished so now plss setup plss10000',context);
  const second=localAgentReply('September 2026',context,first.pending);
  const third=localAgentReply('120',context,second.pending);
  assert.equal(third.actions[0]?.bill.amount,10000);
});
test('explanations, hypothetical permission questions and negations do not prepare bill changes',()=>{
  for(const text of ['Explain how to set up my September 2026 bill to 10000 with 120 kWh','Can I set up my September 2026 bill to 10000 with 120 kWh?','I do not want to change my September 2026 bill to 10000 with 120 kWh','Can you explain how to set up my September 2026 bill to 10000 with 120 kWh?','Please explain how to set up my September 2026 bill to 10000 with 120 kWh','Would it be possible to set up my September 2026 bill to 10000 with 120 kWh?','I have not set up my September 2026 bill to 10000 with 120 kWh','Can you tell me how to set up my September 2026 bill to 10000 with 120 kWh?','Can you show me how to set up my September 2026 bill to 10000 with 120 kWh?']){
    const result=localAgentReply(text,context);assert.equal(result.actions.length,0,text);assert.equal(result.pending,undefined,text);
  }
});
test('a contextual bill mention does not change a budget, subsidy or appliance command target',()=>{
  assert.equal(localAgentReply('Set my budget to 2500 for my August 2026 bill, 120 kWh',context).actions[0]?.type,'set_budget');
  assert.equal(localAgentReply('Set my monthly subsidy to 500 for my September 2026 bill, 120 kWh',context).actions[0]?.type,'set_monthly_subsidy');
  const edit=localAgentReply('Change Bedroom fan to 4 hours because my September 2026 bill was 120 kWh',context);
  assert.equal(edit.actions[0]?.type,'update_appliance');assert.equal(edit.actions[0]?.changes.hours,4);
});
test('a lost receipt does not discard explicitly supplied consumption or a new bill request',()=>{
  const first=localAgentReply('Set up my August 2026 bill to 10000',context);
  const value=localAgentReply('120 kWh, the receipt was lost',context,first.pending);
  assert.equal(value.actions[0]?.bill.kwh,120);
  const next=localAgentReply('Set up my September 2026 bill to 5000, the receipt was lost',context,first.pending);
  const done=localAgentReply('80',context,next.pending);
  assert.equal(done.actions[0]?.bill.month,'2026-09');assert.equal(done.actions[0]?.bill.amount,5000);
  const iso=localAgentReply('2026-09 bill vanished, please set up to 2000',context,first.pending);
  const isoDone=localAgentReply('80',context,iso.pending);
  assert.equal(isoDone.actions[0]?.bill.month,'2026-09');assert.equal(isoDone.actions[0]?.bill.amount,2000);
});
test('ISO bill targets and repeated bill wording do not return an old bill',()=>{
 const home={...context,bills:[{month:'2026-09',kwh:192,amount:3072.6}]};
 for(const [text,amount] of [['Set up my 2026-09 bill to 10000, I lost the receipt',10000],['My September 2026 bill vanished, please set up my bill to 2000',2000]]){
   const first=localAgentReply(text,home);assert.equal(first.pending?.field,'kwh');assert.doesNotMatch(first.reply.text,/192 kWh|3,072/);
   const second=localAgentReply('120',home,first.pending);assert.equal(second.actions[0]?.bill.amount,amount);assert.equal(second.actions[0]?.bill.month,'2026-09');
 }
});
