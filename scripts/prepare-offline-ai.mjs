import {createHash} from 'node:crypto';
import {copyFile,mkdir,readFile,readdir,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const runtime=path.join(root,'public/ai-runtime');
await mkdir(runtime,{recursive:true});
const runtimeDist=path.dirname(require.resolve('onnxruntime-web/wasm'));
for(const filename of ['ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.wasm']) await copyFile(path.join(runtimeDist,filename),path.join(runtime,filename));
// Ship the notices for the ONNX Runtime revision locked by Transformers.js.
await copyFile(path.join(root,'scripts/tinybert/runtime-LICENSE.txt'),path.join(runtime,'LICENSE'));
await copyFile(path.join(root,'scripts/tinybert/runtime-THIRD-PARTY.txt'),path.join(runtime,'ThirdPartyNotices.txt'));
const files=['config.json','tokenizer.json','tokenizer_config.json','special_tokens_map.json','vocab.txt','onnx/model_quantized.onnx'].map(file=>'/models/wattsnap-tinybert-v1/'+file);
files.push('/ai-runtime/ort-wasm-simd-threaded.mjs','/ai-runtime/ort-wasm-simd-threaded.wasm');
const hash=createHash('sha256');
for(const file of files) hash.update(await readFile(path.join(root,'public',file)));
// Workers and lazy dependencies are not linked directly in the offline HTML.
// Precache the public browser scripts from this exact build, including every worker dependency.
async function browserScripts(directory){
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const absolute=path.join(directory,entry.name);
    if(entry.isDirectory())await browserScripts(absolute);
    else if(entry.name.endsWith('.js')){
      const relative=path.relative(path.join(root,'.next/static'),absolute).split(path.sep).join('/');
      files.push('/_next/static/'+relative);hash.update(await readFile(absolute));
    }
  }
}
if(!process.argv.includes('--runtime-only')) await browserScripts(path.join(root,'.next/static/chunks'));
const version=hash.digest('hex').slice(0,24);
await writeFile(path.join(root,'public/offline-ai.json'),JSON.stringify({version,files},null,2)+'\n');
const bytes=(await Promise.all(files.filter(file=>!file.startsWith('/_next/')).map(async file=>(await stat(path.join(root,'public',file))).size))).reduce((sum,size)=>sum+size,0);
console.log(`Offline TinyBERT: ${files.length} public assets, ${(bytes/1024/1024).toFixed(1)} MiB model and runtime, version ${version}`);
