import { callGemini } from "./client";
import { agentTools, parseAgentCall, type AgentAction } from "@/features/assistant/agent-actions";
import type { ChatContext, ChatLink, Reply } from "@/features/assistant/replies";
import type { ChatTurn } from "@/lib/ai/chat-request";

export type AgentResult = { reply: Reply; actions: AgentAction[] };

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
const conversation = (history: ChatTurn[] = [], message: string) =>
  `${history.slice(-6).map(turn => `${turn.role === "user" ? "Person" : "WattSnap AI"}: ${turn.text}`).join("\n")}${history.length ? "\n" : ""}Person: ${message}`;

const householdInstruction = (context: ChatContext) => `You are WattSnap AI, the personal energy assistant for one Philippine household inside the WattSnap app. Today is ${today()}. Money is in Philippine pesos (₱).
You can answer questions, and you can prepare changes with your tools: set_budget, set_monthly_subsidy, add_appliance, update_appliance, remove_appliance, add_bill and open_page.
Rules:
- Use a tool only when the person asks to add, change, set, save or remove something, or to open a page. The app shows every change on a card and applies it only after the person taps Confirm, so say briefly what you prepared and ask them to confirm.
- When several appliances are mentioned, call add_appliance once for each.
- Never invent bill numbers. For an appliance without a wattage, use a typical Philippine value and say it is an estimate they can change.
- Use the exact names from the appliance list when changing or removing.
- Estimates: kWh per month = watts × hours × quantity × days ÷ 1000. Use the household's price per kWh when it is given.
- Antique's Provincial Electric Power Subsidy (PEPS) covers up to ₱500 of an ANTECO bill each month. The price per kWh uses the bill before the subsidy.
- You cannot see live power status or provider systems.
- Reply in 1 to 3 short sentences of plain text. No markdown tables or headings. Reply in the person's language (English, Filipino or Hiligaynon).
Household snapshot (JSON): ${JSON.stringify(context)}`;

/** In-app agent: answers questions and proposes household changes for the person to confirm. */
export async function runHouseholdAgent({ message, context = {}, history }: { message: string; context?: ChatContext; history?: ChatTurn[] }): Promise<AgentResult> {
  const result = await callGemini({ systemInstruction: householdInstruction(context), parts: [{ text: conversation(history, message) }], tools: agentTools, temperature: 0.3, maxOutputTokens: 1024 });
  const actions: AgentAction[] = [], links: ChatLink[] = [], problems: string[] = [];
  for (const call of result.functionCalls.slice(0, 8)) {
    const parsed = parseAgentCall(call.name, call.args);
    if (parsed.kind === "action") actions.push(parsed.action);
    else if (parsed.kind === "link") { if (!links.some(link => link.href === parsed.link.href)) links.push(parsed.link); }
    else problems.push(parsed.reason);
  }
  const text = result.text
    || (actions.length ? "Here’s what I prepared. Check it and tap Confirm to apply." : problems.length ? `I couldn’t prepare that: ${problems[0]}` : links.length ? "Here you go:" : "Sorry, I didn’t catch that. Could you say it another way?");
  return { reply: { text, ...(links.length ? { links: links.slice(0, 3) } : {}) }, actions };
}

const landingInstruction = `You are WattSnap AI on the public WattSnap website. Answer visitors' questions about the WattSnap app in 1 to 3 short sentences of plain text, in the visitor's language.
What WattSnap does: helps Philippine households, starting in Antique and Panay, understand and lower their electricity bills. People can photograph or type their electricity bill, track monthly kWh and pesos, add appliances to see which use the most, get personalized Tipid Tips, try changes in the Watt-If simulator, set a monthly budget (including Antique's ₱500 PEPS subsidy), read provider advisories and prepare for brownouts with Brownout Ready. Supported providers: ANTECO, AKELCO, CAPELCO, ILECO I, II and III, MORE Power, or any other provider. It works in the browser on phones and computers, and records are saved on the person's device. After signing up, WattSnap AI can also add appliances, save bills and set the budget for them, with their confirmation.
Only use these facts. If you are not sure, say so and suggest signing up to try it. Never ask for or discuss personal account details.`;

/** Public landing-page chat: product questions only, no tools and no household data. */
export async function answerLandingQuestion({ message, history }: { message: string; history?: ChatTurn[] }): Promise<Reply> {
  const result = await callGemini({ systemInstruction: landingInstruction, parts: [{ text: conversation(history, message) }], temperature: 0.3, maxOutputTokens: 300 });
  if (!result.text) throw new Error("Gemini returned no answer.");
  return { text: result.text };
}
