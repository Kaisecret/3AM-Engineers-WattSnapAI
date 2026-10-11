import assert from 'node:assert/strict';
import test from 'node:test';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const {savedHouseholdReply}=await import('./saved-queries.ts');
const context={today:'2026-10-11',budget:2000,provider:'ANTECO',location:'San Jose, Antique',name:'Maria',rate:16,bills:[{month:'2026-08',kwh:192,amount:3072.6},{month:'2026-09',kwh:33,amount:418.85,subsidy:418.85,dueDate:'2026-09-29'}],appliances:[{name:'Bedroom fan',watts:60,hours:8,quantity:2,days:20}],monthlySubsidy:500};
test('budget is available even without bills',()=>{assert.match(savedHouseholdReply('Magkano ang current budget ko?',{budget:2000}).text,/2,000\.00/);});
test('one message answers budget and history with the actual cached amounts',()=>{
 const reply=savedHouseholdReply('My budget and bill history please',context);
 for(const value of ['2,000.00','August 2026','September 2026','3,072.60','418.85'])assert.ok(reply.text.includes(value),value);
 assert.ok(reply.links.some(link=>link.href==='/bills'));assert.ok(reply.links.some(link=>link.href==='/budget'));
});
test('specific and relative months never silently use the latest bill',()=>{
 assert.match(savedHouseholdReply('Bill ko noong August 2026',context).text,/192 kWh/);
 assert.match(savedHouseholdReply('My bill last month',context).text,/33 kWh/);
 assert.match(savedHouseholdReply('My bill this month',context).text,/No saved bill.*October 2026/);
 assert.match(savedHouseholdReply('My January 2025 bill',context).text,/No saved bill.*January 2025/);
});
test('budget remainder and payable use the printed subsidy',()=>{
 const text=savedHouseholdReply('How much budget is left?',context).text;
 assert.match(text,/2,000\.00.*room|room.*2,000\.00/);assert.match(text,/0\.00.*after.*subsidy/);
});
test('history totals include older records beyond the display limit',()=>{
 const bills=Array.from({length:24},(_,i)=>({month:`${2025+Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}`,amount:100,kwh:10}));
 assert.match(savedHouseholdReply('total bill history', {...context,bills}).text,/2,400\.00/);
 assert.match(savedHouseholdReply('bill January 2025',{...context,bills}).text,/100\.00/);
});
test('named month comparisons calculate the difference without claiming a cause',()=>{
 const text=savedHouseholdReply('Compare August 2026 and September 2026 bills',context).text;
 assert.match(text,/159.*kWh/);assert.match(text,/2,653\.75/);assert.match(text,/period|cause/i);
});
test('offline why-cost questions compare saved periods instead of defining kWh',()=>{
 const home={...context,bills:[{month:'2026-08',kwh:207,amount:1491.15},{month:'2026-09',kwh:109,amount:1738.14}]};
 for(const question of ['September is low why the cost is no?','Why august is more high']){
   const text=savedHouseholdReply(question,home)?.text??'';
   for(const value of ['207 kWh','109 kWh','1,491.15','1,738.14','7.20','15.95'])assert.ok(text.includes(value),`${question}: ${value}`);
   assert.match(text,/effective|average/i);assert.match(text,/charges|breakdown/i);
 }
});
test('due-date answers describe printed dates, not payment status',()=>{
 assert.match(savedHouseholdReply('Kailan due date ng bill?',context).text,/2026-09-29/);
 assert.match(savedHouseholdReply('Is my bill paid?',context).text,/payment status.*not.*recorded/i);
});
test('appliance estimates honor days and quantity',()=>{
 const text=savedHouseholdReply('List my appliances and their cost',context).text;
 assert.match(text,/Bedroom fan/);assert.match(text,/19\.2 kWh/);assert.match(text,/307\.20/);
});
test('explicit what-if inputs calculate locally without making changes',()=>{
 const text=savedHouseholdReply('What if I use a fan 60 W for 8 hours, 20 days?',context).text;
 assert.match(text,/9\.6 kWh/);assert.match(text,/153\.60/);assert.match(text,/estimate/i);
});
test('saved tips, scenarios and checklist progress preserve their freshness',()=>{
 const saved={...context,savedTips:{generatedAt:'2026-09-01',stale:true,tips:[{title:'Review fan hours',action:'Check the schedule.'}]},savedScenarios:[{title:'Evening fan',kwh:10,cost:160,days:30,stale:false}],readinessPlans:[{title:'Saved interruption',checked:2,total:5,updatedAt:'2026-09-01',stale:true}]};
 assert.match(savedHouseholdReply('my saved tips',saved).text,/Review fan hours/);assert.match(savedHouseholdReply('my saved tips',saved).text,/older|changed/i);
 assert.match(savedHouseholdReply('my scenarios',saved).text,/Evening fan/);
 assert.match(savedHouseholdReply('my checklist progress',saved).text,/2 of 5/);
});
test('profile, subsidy and rate questions read saved settings',()=>{
 assert.match(savedHouseholdReply('Sino provider ko at saan ang household?',context).text,/ANTECO/);
 assert.match(savedHouseholdReply('monthly subsidy',context).text,/500\.00/);
 assert.match(savedHouseholdReply('my rate per kWh',context).text,/16\.00/);
});
test('ambiguous months ask for the year and unsupported text returns no match',()=>{
 assert.match(savedHouseholdReply('My August bill',{...context,bills:[...context.bills,{month:'2025-08',kwh:99,amount:2000}]}).text,/Which year/);
 assert.equal(savedHouseholdReply('weather tomorrow',context),undefined);
 assert.match(savedHouseholdReply('bill history',{}).text,/No saved bills/);
});
test('mixed topics retain dates, checklist and advisories rather than dropping answers',()=>{
 assert.match(savedHouseholdReply('My budget and August 2026 bill',context).text,/192 kWh/);
 const reply=savedHouseholdReply('My checklist and saved advisories',{...context,readinessPlans:[],savedAdvisories:[]});
 assert.ok(reply.links.some(link=>link.href==='/brownout-ready'));assert.ok(reply.links.some(link=>link.href==='/advisories'));
});
test('plural bill requests still honor an explicit month',()=>{
 const text=savedHouseholdReply('Show my bills for August 2026',context).text;
 assert.match(text,/192 kWh/);assert.doesNotMatch(text,/September 2026/);
});
test('polite May is not interpreted as a billing month',()=>{
 assert.match(savedHouseholdReply('May I know my current bill amount?',context).text,/September 2026/);
});
test('estimates reject malformed, negative and fractional period or quantity inputs',()=>{
 for(const suffix of ['-20 days','1.5 days','1e3 days','-2 units','1.5 units']) assert.match(savedHouseholdReply('What if I use a fan 60 W 8 hours '+suffix,context).text,/Check.*inputs/i,suffix);
});
test('ambiguous plural periods ask for a year and polite modal May preserves an explicit May date',()=>{
 const saved={...context,bills:[...context.bills,{month:'2025-08',amount:2000,kwh:99},{month:'2026-05',amount:1500,kwh:75}]};
 const ambiguous=savedHouseholdReply('My August bills',saved).text;
 assert.match(ambiguous,/Which year/);assert.doesNotMatch(ambiguous,/September/);
 assert.match(savedHouseholdReply('May I know my May 2026 bill amount?',saved).text,/75 kWh/);
});
