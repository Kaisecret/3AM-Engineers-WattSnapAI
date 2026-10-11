import { Fragment } from "react";

const values = /((?:₱\s*|PHP\s+)-?\d[\d,]*(?:\.\d+)?|(?<![\w.])-?\d[\d,]*(?:\.\d+)?\s*(?:kWh|kW|W|watts?)(?!\w))/gi;

function Highlights({ value }: { value: string }) {
  return <>{value.split(values).map((part, index) => index % 2
    ? <mark key={index} className={`chat-value ${/^(?:₱|PHP)/i.test(part) ? "is-money" : "is-energy"}`}>{part}</mark>
    : <Fragment key={index}>{part}</Fragment>)}</>;
}

function Inline({ value }: { value: string }) {
  return <>{value.split(/\*\*(.+?)\*\*/g).map((part, index) => index % 2
    ? <strong key={index}><Highlights value={part} /></strong>
    : <Highlights key={index} value={part} />)}</>;
}

/** Small, safe formatting vocabulary; model text never becomes raw HTML. */
export default function ChatMessageText({ value }: { value: string }) {
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
    if (block.kind === "paragraph") return <p key={index}>{block.lines.map((line, i) => <Fragment key={i}>{i > 0 && <br />}<Inline value={line} /></Fragment>)}</p>;
    const List = block.kind === "ordered" ? "ol" : "ul";
    return <List key={index}>{block.lines.map((line, i) => <li key={i}><Inline value={line} /></li>)}</List>;
  })}</>;
}
