import type { IntentScore } from './hybrid-reply';

interface WorkerReply { id: number; scores?: IntentScore[]; error?: string; }
interface WorkerLike {
  postMessage(message: {id:number;text?:string}): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<WorkerReply>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

/** One worker per page. Timeouts terminate a stuck session so a later request can retry. */
export function createTinyBertClient(factory: () => WorkerLike, timeout = 20_000) {
  let worker: WorkerLike | undefined, next = 0;
  const waiting = new Map<number,{resolve:(scores:IntentScore[])=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
  function stop(reason: string) {
    if (worker) { worker.onmessage=null; worker.onerror=null; worker.terminate(); }
    worker=undefined;
    for (const request of waiting.values()) { clearTimeout(request.timer); request.reject(new Error(reason)); }
    waiting.clear();
  }
  function request(text?: string): Promise<IntentScore[]> {
    if (!worker) {
      worker=factory();
      worker.onmessage=({data})=>{
        const pending=waiting.get(data.id);
        if (!pending) return;
        clearTimeout(pending.timer); waiting.delete(data.id);
        if (data.error) pending.reject(new Error(data.error)); else pending.resolve(data.scores??[]);
      };
      worker.onerror=()=>stop('Local language model unavailable');
    }
    const id=++next;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>stop('Local language model timed out'),timeout);
      waiting.set(id,{resolve,reject,timer});
      worker!.postMessage({id,...(text ? {text} : {})});
    });
  }
  return {infer:(text:string)=>request(text),warm:()=>request(),dispose:()=>stop('Local language model stopped')};
}

let client: ReturnType<typeof createTinyBertClient> | undefined;
function browserClient() {
  client ??= createTinyBertClient(()=>new Worker(new URL('./tinybert.worker.ts',import.meta.url),{type:'module'}));
  return client;
}
export async function inferTinyBert(text: string) { return browserClient().infer(text); }
export async function warmTinyBert() { return browserClient().warm(); }
