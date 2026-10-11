import { env, pipeline } from '@huggingface/transformers';

env.allowRemoteModels=false;
env.allowLocalModels=true;
env.localModelPath='/models/';
// The service worker owns public asset caching and versioning.
env.useBrowserCache=false;
env.useWasmCache=false;
const wasm=env.backends.onnx.wasm;
if (!wasm) throw new Error('WASM inference unavailable');
wasm.wasmPaths={
  mjs:new URL('/ai-runtime/ort-wasm-simd-threaded.mjs',self.location.origin).href,
  wasm:new URL('/ai-runtime/ort-wasm-simd-threaded.wasm',self.location.origin).href,
};
wasm.numThreads=1;
wasm.proxy=false;

let classifier: ReturnType<typeof pipeline<'text-classification'>> | undefined;
function load() {
  classifier ??= pipeline('text-classification','wattsnap-tinybert-v1',{device:'wasm',dtype:'q8',local_files_only:true}).catch(error=>{classifier=undefined;throw error;});
  return classifier;
}
// Serialize inference: a low-end phone only needs one model invocation at a time.
let queue=Promise.resolve();
self.onmessage=({data}:MessageEvent<{id:number;text?:string}>)=>{
  queue=queue.then(async()=>{
    try {
      const model=await load();
      const scores=data.text ? await model(data.text,{top_k:14}) : [];
      self.postMessage({id:data.id,scores});
    } catch { self.postMessage({id:data.id,error:'Local language model unavailable'}); }
  });
};
