import assert from 'node:assert/strict';
import test from 'node:test';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
registerHooks({resolve(specifier,context,nextResolve){if(specifier.startsWith('@/'))return nextResolve(pathToFileURL(path.resolve('src',specifier.slice(2)+'.ts')).href,context);try{return nextResolve(specifier,context);}catch(error){if(error.code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return nextResolve(`${specifier}.ts`,context);throw error;}}});
const {runHouseholdAgent}=await import('./agent.ts');
test('missing action values ask a direct question before calling the online model',async t=>{
  const previousKey=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='test-only-key';t.after(()=>{if(previousKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=previousKey;});
  let called=false;t.mock.method(globalThis,'fetch',async()=>{called=true;throw new Error('Unexpected network request');});
  const result=await runHouseholdAgent({message:'Add an electric fan, 8 hours a day',context:{appliances:[]}});
  assert.equal(called,false);assert.equal(result.actions.length,0);assert.match(result.reply.text,/watts/);
});
