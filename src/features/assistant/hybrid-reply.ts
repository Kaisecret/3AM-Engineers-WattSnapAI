import { localAgentReply, type LocalAgentResult, type LocalPending } from './local-agent';
import { householdReply, type ChatContext } from './replies';

export interface IntentScore { label: string; score: number; }
export type IntentInference = (text: string) => Promise<IntentScore[]>;
export type HybridResult = LocalAgentResult & { source: 'keywords' | 'tinybert' };
// Each value is a read-only query understood by the existing saved-data resolver.
const topics = {
  budget: 'my budget', bill: 'latest bill', history: 'bill history',
  comparison: 'compare bill change', appliances: 'my appliances',
  estimate: 'calculate estimate', tips: 'saved tips saving advice',
  advisories: 'saved advisories brownout', readiness: 'preparation checklist',
  scenarios: 'saved scenarios', rate: 'rate per kwh', subsidy: 'subsidy', due: 'bill due date',
} as const;
type Intent = keyof typeof topics;

export function confidentIntent(scores: IntentScore[]): Intent | undefined {
  if (!scores.length || scores.some(item => !Number.isFinite(item.score) || item.score < 0 || item.score > 1)) return;
  const [best, second] = [...scores].sort((a,b) => b.score-a.score);
  if (best.score < .9 || best.score-(second?.score ?? 0) < .2 || !Object.hasOwn(topics,best.label)) return;
  return best.label as Intent;
}

/** Inference selects a topic only. Exact values, calculations and confirmation stay in the grammar. */
export async function hybridLocalReply(raw: string, context: ChatContext, pending: LocalPending | undefined, infer: IntentInference): Promise<HybridResult> {
  const parsed = localAgentReply(raw,context,pending);
  if (parsed.handled || parsed.pending || parsed.actions.length) return {...parsed,source:'keywords'};
  // An unrecognized edit is never converted into a saved-data answer or a model-created action.
  if (/^(?:set|add|save|record|change|update|remove|delete|cancel|itakda|gawin|idagdag|dagdag|ilagay|alisin|tanggalin|baguhin|burahin)\b/i.test(raw.trim())) return {...parsed,source:'keywords'};
  try {
    const intent = confidentIntent(await infer(raw.trim().slice(0,500)));
    if (intent) {
      // Keep the original periods, units and names; add only the read-only topic.
      const reply = householdReply(`${raw}\n${topics[intent]}`,context);
      return {reply,actions:[],handled:true,source:'tinybert'};
    }
  } catch { /* Missing assets, unsupported WASM and timeouts use the existing keyword assistant. */ }
  return {...parsed,source:'keywords'};
}
