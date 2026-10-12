import { Fragment } from "react";

const values = /((?:₱\s*|PHP\s+)-?\d[\d,]*(?:\.\d+)?|(?<![\w.])-?\d[\d,]*(?:\.\d+)?\s*(?:kWh|kW|W|watts?)(?!\w))/gi;

/** Named things worth spotting in an answer, such as feature and provider names. Longer names win over the names inside them. */
function termPattern(terms: string[] | undefined) {
  const list = Array.from(new Set(terms ?? [])).filter(Boolean).sort((a, b) => b.length - a.length).map(term => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return list.length ? new RegExp(`(?<![\\w-])(${list.join("|")})(?![\\w-])`, "g") : null;
}

function Terms({ value, terms }: { value: string; terms: RegExp | null }) {
  if (!terms) return <>{value}</>;
  return <>{value.split(terms).map((part, index) => index % 2
    ? <mark key={index} className="chat-term">{part}</mark>
    : <Fragment key={index}>{part}</Fragment>)}</>;
}

function Highlights({ value, terms }: { value: string; terms: RegExp | null }) {
  return <>{value.split(values).map((part, index) => index % 2
    ? <mark key={index} className={`chat-value ${/^(?:₱|PHP)/i.test(part) ? "is-money" : "is-energy"}`}>{part}</mark>
    : <Terms key={index} value={part} terms={terms} />)}</>;
}

function Inline({ value, terms }: { value: string; terms: RegExp | null }) {
  return <>{value.split(/\*\*(.+?)\*\*/g).map((part, index) => index % 2
    ? <strong key={index}><Highlights value={part} terms={null} /></strong>
    : <Highlights key={index} value={part} terms={terms} />)}</>;
}

/** Small, safe formatting vocabulary; model text never becomes raw HTML. */
export default function ChatMessageText({ value, terms }: { value: string; terms?: string[] }) {
  const pattern = termPattern(terms);
  const blocks: Array<{ kind: "paragraph" | "ordered" | "unordered"; lines: string[] }> = [];
  for (const line of value.trim().split("\n")) {
    if (!line.trim()) { blocks.push({ kind: "paragraph", lines: [] }); continue; }
    const ordered = /^\s*\d+[.)]\s+/.test(line);
    const unordered = /^\s*[•*-]\s+/.test(line);
    const kind = ordered ? "ordered" : unordered ? "unordered" : "paragraph";
    const content = line.replace(/^\s*(?:\d+[.)]|[•*-])\s+/, "").trim();
    const last = blocks.at(-1);
    if (last?.kind === kind && last.lines.length) last.lines.push(content);
    else blocks.push({ kind, lines: [content] });
  }
  return <>{blocks.filter(block => block.lines.length).map((block, index) => {
    if (block.kind === "paragraph") return <p key={index}>{block.lines.map((line, i) => <Fragment key={i}>{i > 0 && <br />}<Inline value={line} terms={pattern} /></Fragment>)}</p>;
    const List = block.kind === "ordered" ? "ol" : "ul";
    return <List key={index}>{block.lines.map((line, i) => <li key={i}><Inline value={line} terms={pattern} /></li>)}</List>;
  })}</>;
}
