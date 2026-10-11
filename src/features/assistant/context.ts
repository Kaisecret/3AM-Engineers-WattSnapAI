import { dailyApplianceKwh, effectiveRate, monthlySubsidyFor, sortBillsByMonth, type PreviewHousehold } from "../dashboard/preview-data";
import { previewProviderName } from "../household-profile/provider-preview";
import { advisoryTypeLabels, formatAdvisoryDate } from "../advisory-intelligence/advisory-preview";
import { advisoryTab, matchIsStale, matchPreviewAdvisory, scheduleLabel } from "../advisory-intelligence/review-preview";
import { preparationItems, planChanges, scheduleState } from "../brownout-ready/calculations";
import { compareScenario, isStaleScenario } from "../watt-if-simulator/calculations";
import { tipsInputSignature } from "../tipid-tips/preview-tips";
import type { ReviewedAdvisory } from "../advisory-intelligence/types";
import type { BrownoutPreviewPlan } from "../brownout-ready/types";
import type { PreviewScenario } from "../watt-if-simulator/types";
import type { PreviewTipsSnapshot } from "../tipid-tips/types";
import type { ChatContext } from "./replies";

export function buildChatContext(household: PreviewHousehold, records: ReviewedAdvisory[], extras: {tips?:PreviewTipsSnapshot|null;plans?:BrownoutPreviewPlan[];scenarios?:PreviewScenario[];unavailable?:string[]} = {}): ChatContext {
  const bills = sortBillsByMonth(household.bills);
  const top = [...household.appliances].sort((a,b)=>dailyApplianceKwh(b)*(b.days??30)-dailyApplianceKwh(a)*(a.days??30))[0];
  const advisory = records.find(item=>advisoryTab(item)==="active" && !matchIsStale(item,household) && matchPreviewAdvisory(item.details,household).status==="affected" && ["scheduled","unscheduled"].includes(item.details.type));
  const today = new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Manila",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const notice = (item:ReviewedAdvisory) => ({title:item.details.title||advisoryTypeLabels[item.details.type],when:`${item.details.date ? formatAdvisoryDate(item.details.date) : "Date unknown"} · ${scheduleLabel(item.details)}`,area:item.details.areaText});
  return {
    name:household.name,latest:bills.at(-1),previous:bills.at(-2),budget:household.budget,rate:effectiveRate(bills),today,
    topAppliance:top ? {name:top.name,monthlyKwh:dailyApplianceKwh(top)*(top.days??30)} : undefined,
    applianceCount:household.appliances.length,location:household.location,provider:household.provider ? previewProviderName(household.provider) : undefined,monthlySubsidy:monthlySubsidyFor(household),
    // Local parsing receives all records. The online request applies its own payload limits.
    bills:bills.map(({month,kwh,amount,subsidy,dueDate})=>({month,kwh,amount,...(subsidy!==undefined?{subsidy}:{}),...(dueDate?{dueDate}:{})})),
    appliances:household.appliances.map(({name,watts,hours,quantity,days})=>({name,watts,hours,quantity,...(days?{days}:{})})),
    advisory:advisory ? {...notice(advisory),reason:advisory.details.reason||"Not provided"} : undefined,
    savedAdvisories:records.map(item=>({...notice(item),status:matchPreviewAdvisory(item.details,household).status,reviewedAt:item.reviewedAt,stale:matchIsStale(item,household)})),
    savedTips:{generatedAt:extras.tips?.generatedAt??"",stale:!!extras.tips&&extras.tips.inputSignature!==tipsInputSignature(household),tips:extras.tips?.tips.map(({title,action})=>({title,action}))??[]},
    savedScenarios:(extras.scenarios??[]).flatMap(item=>{const result=compareScenario(item);return result.comparison ? [{title:item.title,kwh:result.comparison.scenarioKwh,cost:result.comparison.scenarioCost,days:Number(item.days),stale:isStaleScenario(item,household.appliances)}] : [];}),
    readinessPlans:(extras.plans??[]).map(plan=>{const changes=planChanges(plan,records,household);return {title:plan.advisory.details.title||"Saved preparation plan",checked:plan.checked.length,total:preparationItems.length,updatedAt:plan.updatedAt,stale:changes.missing||changes.sourceChanged||changes.householdChanged||changes.updates.length>0||scheduleState(plan.advisory.details,Date.now()).state==="elapsed"};}),
    unavailable:extras.unavailable,
  };
}
