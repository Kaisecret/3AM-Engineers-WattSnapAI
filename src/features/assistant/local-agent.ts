import { parseAgentCall, type AgentAction } from './agent-actions';
import { householdReply, knownHouseholdReply, type ChatContext, type Reply } from './replies';
import { validateAppliance } from '../dashboard/preview-data';

export type LocalPending = { message: string; field: 'watts' | 'hours' | 'month' | 'kwh' | 'amount' };
export type LocalAgentResult = { reply: Reply; actions: AgentAction[]; pending?: LocalPending; handled?: boolean };
const numeric = '-?(?:(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?|\\.\\d+)';
const numberToken = `(?<![\\w.,+-])(${numeric})(?![\\d.,+-])`;
const amountToken = `(?<![\\w.,+-])(${numeric})(?![\\w.,+-])`;
const value = (text: string, pattern: RegExp) => {
  const match = text.match(pattern);
  return match ? Number(match[1].replace(/,/g, '')) : undefined;
};
const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
function monthOf(text: string) {
  const iso = text.match(/\b(20\d{2}-(?:0[1-9]|1[012]))\b(?!-\d)/);
  if (iso) return iso[1];
  const named = text.toLowerCase().match(/\b([a-z]+)\s+(20\d{2})\b/);
  const index = named ? months.findIndex(month => month === named[1] || month.slice(0,3) === named[1]) : -1;
  return index >= 0 ? `${named![2]}-${String(index+1).padStart(2,'0')}` : undefined;
}
const response = (text: string): LocalAgentResult => ({reply:{text},actions:[],handled:true});
const ask = (message: string, field: LocalPending['field'], text: string): LocalAgentResult => ({...response(text),pending:{message,field}});
function checked(type: string, args: Record<string, unknown>): LocalAgentResult {
  const parsed = parseAgentCall(type,args);
  return parsed.kind === 'action' ? {reply:{text:'I prepared this change. Review the values, then tap Confirm to save.'},actions:[parsed.action]}
    : parsed.kind === 'link' ? {reply:{text:'Here you go.',links:[parsed.link]},actions:[]}
    : response(parsed.reason);
}
function usage(text: string) {
  const power = text.match(new RegExp(`${numberToken}\\s*(k?w)(?:atts?)?\\b`,'i'));
  const watts = power ? Number(power[1].replace(/,/g,'')) * (power[2].toLowerCase()==='kw'?1000:1) : undefined;
  const hours = value(text,new RegExp(`${numberToken}\\s*(?:hours?|hrs?|oras|h)\\b`,'i'));
  const days = value(text,new RegExp(`${numberToken}\\s*(?:days?|araw|adlaw)\\b`,'i'));
  const quantity = value(text,new RegExp(`${numberToken}\\s*(?:units?|pieces?|pcs)\\b`,'i'))
    ?? value(text,new RegExp(`\\bquantity\\s*(?:to|is|=)?\\s*${amountToken}`,'i'));
  return { ...(watts !== undefined ? {watts}:{}), ...(hours !== undefined ? {hours}:{}), ...(days !== undefined ? {days}:{}), ...(quantity !== undefined ? {quantity}: {}) };
}
function applianceName(text: string) {
  return text.replace(/^(?:an?|my|the|ang)\s+/i,'').replace(/^\d+\s+/,'')
    .split(new RegExp(`,|\\s+(?:for|to|at|rated|using|gamit)\\b|\\s+${numeric}\\s*(?:k?w(?:atts?)?|hours?|hrs?|oras|h|days?|units?|pcs)\\b`,'i'))[0].trim();
}

function requestsBillEntry(message: string) {
  const explanatory = /^(?:what|why|how|should|is|does|if|tell me how|show me how|would it|(?:can|could|may) (?:i|we)|ano|paano|bakit|magkano|kailan)\b/i.test(message)
    || /\b(?:explain|describe|teach|tell me how|show me how)\b/i.test(message)
    || /\b(?:do not|don't|have not|haven't|never|huwag|wag)\b.*\b(?:set|add|save|record|change|update|create|enter)\b/i.test(message);
  if (explanatory) return false;
  const command = /\b(?:set(?:\s+up)?|setup|add|save|record|change|update|create|enter|idagdag|ilagay)\b/i.exec(message);
  if (!command) return false;
  const mentions = [...message.matchAll(/\bbills?\b/gi)];
  const bill = mentions.find(item=>item.index>command.index) ?? mentions[0];
  if (!bill) return false;
  if (command.index < bill.index) {
    // Only a bill may be the command target. A bill mentioned later as context
    // must not turn a budget, subsidy or appliance command into bill entry.
    const target = message.slice(command.index+command[0].length,bill.index)
      .replace(/\b20\d{2}-(?:0[1-9]|1[012])\b/g,'')
      .replace(new RegExp(`\\b(?:${months.flatMap(month=>[month,month.slice(0,3)]).join('|')}|20\\d{2})\\b`,'gi'),'')
      .replace(/\b(?:up|my|the|a|an|monthly|electricity|electric|billing|amount|of|ng|ang|please|pls|plss*)\b/gi,'')
      .replace(/[\s,]/g,'');
    return !target;
  }
  const rest = message.slice(command.index+command[0].length).trim();
  return !rest || /^(?:(?:up|please|pls|plss*|to|at|is)\s*)*(?:[=:]\s*)?(?:₱|php\s*)?[\d.-]/i.test(rest);
}
const billFields = (message: string) => message.replace(new RegExp(`,(?=\\s+(?:[a-z]|${numeric}\\s+kwh\\b))`,'gi'),' ');

/** Small offline grammar. Values remain proposed actions; this function never writes records. */
export function localAgentReply(raw: string, context: ChatContext = {}, pending?: LocalPending): LocalAgentResult {
  let message = raw.trim().slice(0,500);
  let continuing = false;
  if (/^(?:cancel|never mind|nevermind|stop|huwag|wag)$/i.test(message)) return response('Okay, I cancelled that request. Your saved records are unchanged.');
  if (pending?.field === 'kwh' && !requestsBillEntry(message) && !new RegExp(`${numberToken}\\s*kwh\\b`,'i').test(message)
      && /\b(?:do not know|don't know|not sure|lost|vanished|missing|hindi alam|nawala)\b/i.test(message)) {
    const result = ask(pending.message,'kwh','I still need the actual consumption in kWh to prepare this bill. A peso amount alone cannot tell me your usage. You can enter the details manually when you find a copy.');
    result.reply.links = [{label:'Enter bill manually',href:'/bills/new'}];
    return result;
  }
  if (pending && !requestsBillEntry(message) && (/^(?:[₱\d.-]|php\b)/i.test(message) || (pending.field === 'month' && monthOf(message))) && !/[?;]/.test(message)) {
    continuing = true;
    const bare = new RegExp(`^${numeric}$`).test(message);
    const unit = {watts:' W',hours:' hours',month:'',kwh:' kWh',amount:' pesos'}[pending.field];
    message = `${pending.message}, ${message}${bare ? unit : ''}`.slice(0,1000);
  }
  const preserve = (result: LocalAgentResult): LocalAgentResult => continuing && !result.actions.length && !result.pending ? {...result,pending} : result;
  message=message.replace(/^(?:can|could|would) you (?:please )?(?=set|add|change|update|remove|open)/i,"").replace(/\?$/,"");
  const commands = message.split(/;|\n|\s+(?:and|at)\s+(?=(?:add|save|record|set|change|update|remove|delete|open|go to|show|what|why|how|can|could|would|ano|magkano|kailan|sino|saan|buksan|itakda|gawin|idagdag|dagdag|ilagay|alisin|tanggalin|baguhin)\b)/i).map(part=>part.trim()).filter(Boolean);
  if (commands.length > 1) {
    if (commands.length > 8) return response('Please send up to 8 changes at a time.');
    const results = commands.map(command=>localAgentReply(command,context));
    if (results.some(result=>result.pending || (!result.handled&&!result.actions.length))) return response('Let’s finish one change at a time. Include each appliance’s watts and hours, or the exact budget amount.');
    const actions=results.flatMap(result=>result.actions);
    const links=results.flatMap(result=>result.reply.links??[]).filter((item,index,all)=>all.findIndex(other=>other.href===item.href)===index);
    return {reply:{text:results.filter(result=>!result.actions.length).map(result=>result.reply.text).concat(actions.length?['I prepared these changes. Review each one before confirming.']:[]).join('\n\n'),...(links.length?{links}:{})},actions,handled:true};
  }
  // Natural bill edits must reach the validated entry flow before read-only
  // keyword matching. Preserve all supplied fields and ask for missing ones.
  if (requestsBillEntry(message)
      && !/^(?:add|save|record|dagdag|idagdag|ilagay|dugang)\s/i.test(message)) {
    message = billFields(message).replace(/\b(plss*|please)(?=\d)/gi,'$1 ');
    const amount = value(message,new RegExp(`\\b(?:to|amount)\\s*(?:is|of|:|=)?\\s*(?:₱|php\\s*)?${amountToken}`,'i'))
      ?? value(message,new RegExp(`\\b(?:setup|set\\s+up)\\s+(?:(?:plss*|please)\\s*)*(?:to\\s+)?(?:₱|php\\s*)?${amountToken}`,'i'));
    message = `Add bill, ${message}${amount !== undefined ? `, amount ${amount}` : ''}`;
  }
  if (/^(?:what|why|how|can|could|should|is|does|if|ano|paano|bakit|magkano|kailan|sino|saan)\b/i.test(message)) {
    const reply=knownHouseholdReply(message,context);
    return {reply:reply??householdReply(message,context),actions:[],handled:!!reply};
  }
  const text = message.toLowerCase();
  if (/^(?:set|change|update|itakda|gawin|ibutang)\b/.test(text) && /\b(?:budget|subsidy|peps)\b/.test(text)) {
    if (/\bbudget\b/.test(text) && /\b(?:subsidy|peps)\b/.test(text)) return response('Please send budget and subsidy as separate requests, each with its own amount.');
    const amount = value(message,new RegExp(`\\b(?:budget|subsidy|peps)\\b\\s*(?:to|at|is|sa|=|:|,)?\\s*(?:₱|php\\s*)?${amountToken}`,'i'));
    if (amount === undefined) return ask(message,'amount','What amount in pesos would you like to set?');
    return preserve(checked(/subsidy|peps/.test(text)?'set_monthly_subsidy':'set_budget',{amount}));
  }
  const adding = message.match(/^(?:add|save|record|dagdag|idagdag|ilagay|dugang)\s+(.+)$/i);
  if (adding && /\b(?:bill|billing)\b/.test(text)) {
    const month = monthOf(message);
    if (!month) return ask(message,'month','Which billing month and year? For example, September 2026.');
    const kwh = value(message,new RegExp(`${numberToken}\\s*kwh\\b`,'i'));
    if (kwh === undefined) return ask(message,'kwh','How many kWh are printed on that bill?');
    if (kwh <= 0) return preserve(response('Bill usage must be greater than zero kWh.'));
    const subsidyMatch = message.match(new RegExp(`\\bsubsidy\\s*(?:of|is|:|=)?\\s*(?:₱|php)?\\s*${amountToken}`,'i'));
    // A comma before another named field is punctuation, not a malformed
    // numeric token. Keep commas inside numbers intact for validation.
    const amountText = billFields(subsidyMatch ? message.replace(subsidyMatch[0],'') : message);
    const amount = value(amountText,new RegExp(`(?:₱|php\\s*|amount\\s*(?:of|is|:|=)?\\s*)${amountToken}`,'i'))
      ?? value(amountText,new RegExp(`${numberToken}\\s*pesos\\b`,'i'));
    if (amount === undefined) return ask(message,'amount','What is the current month bill in pesos, before any subsidy?');
    const dueDate = message.match(/\bdue(?:\s+date)?\s*(?:on|is|:)?\s*(20\d{2}-\d{2}-\d{2})\b/i)?.[1];
    return preserve(checked('add_bill',{month,kwh,amount,...(subsidyMatch?{subsidy:Number(subsidyMatch[1].replace(/,/g,''))}:{}),...(dueDate?{dueDate}:{})}));
  }
  if (adding) {
    const name = applianceName(adding[1]);
    if (!name || /^(?:my )?appliances?$/i.test(name)) return response('Tell me the appliance name, its watts and hours a day. For example: Add Bedroom fan, 60 W, 8 hours a day.');
    const fields = usage(message);
    const quantity = fields.quantity ?? value(adding[1],/^\s*(\d+)\s+/) ?? 1;
    const issue = validateAppliance({name,...fields,watts:fields.watts ?? 1,hours:fields.hours ?? 0,quantity});
    if (issue) return preserve(response(issue));
    if (fields.watts === undefined) return ask(message,'watts',`How many watts does ${name} use? Check the W or kW on its label.`);
    if (fields.hours === undefined) return ask(message,'hours',`How many hours a day do you use ${name}?`);
    return preserve(checked('add_appliance',{name,...fields,quantity}));
  }
  const editing = message.match(/^(remove|delete|change|update|alisin|tanggalin|baguhin)\s+(?:my\s+|the\s+)?(.+)$/i);
  if (editing) {
    const name = applianceName(editing[2]);
    const exact = context.appliances?.filter(item=>item.name.toLowerCase()===name.toLowerCase()) ?? [];
    const matches = exact.length ? exact : context.appliances?.filter(item=>name && item.name.toLowerCase().includes(name.toLowerCase())) ?? [];
    if (matches.length !== 1) return response(matches.length ? `Which appliance do you mean: ${matches.map(item=>item.name).join(', ')}? Use its full name.` : `I couldn’t find ${name} in your saved appliances. Check the name in your list.`);
    if (/remove|delete|alisin|tanggalin/i.test(editing[1])) return checked('remove_appliance',{name:matches[0].name});
    const fields = usage(message);
    if (!Object.keys(fields).length) return response('Tell me the new watts, hours a day, quantity or days.');
    const issue = validateAppliance({...matches[0],...fields});
    if (issue) return response(issue);
    return checked('update_appliance',{name:matches[0].name,...fields});
  }
  const page = text.match(/^(?:open|go to|show|buksan)\s+(?:my\s+|the\s+)?(.+)$/)?.[1];
  if (page) {
    const aliases: Record<string,string> = {home:'dashboard',energy:'bills',history:'bills','bill history':'bills','snap ai':'add-bill','scan bill':'add-bill','add appliance':'add-appliance','tipid tips':'tips','watt-if':'simulator','home setup':'setup',checklist:'brownout-ready','brownout ready':'brownout-ready',profile:'settings',bahay:'dashboard',badyet:'budget'};
    const parsed = parseAgentCall('open_page',{page:aliases[page] ?? page});
    if (parsed.kind === 'link') return {reply:{text:'Here you go.',links:[parsed.link]},actions:[],handled:true};
  }
  const reply=knownHouseholdReply(message,context);
  return {reply:reply??householdReply(message,context),actions:[],handled:!!reply};
}
