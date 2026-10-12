import assert from 'node:assert/strict';
import test from 'node:test';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
registerHooks({resolve(specifier,context,nextResolve){if(specifier.startsWith('@/'))return nextResolve(pathToFileURL(path.resolve('src',specifier.slice(2)+'.ts')).href,context);try{return nextResolve(specifier,context);}catch(error){if(error.code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return nextResolve(`${specifier}.ts`,context);throw error;}}});
const {runHouseholdAgent}=await import('./agent.ts');
test('online incomplete changes ask Gemini with history and the household snapshot',async t=>{
  const previousKey=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='test-only-key';t.after(()=>{if(previousKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=previousKey;});
  let body;t.mock.method(globalThis,'fetch',async(_url,request)=>{body=JSON.parse(request.body);return Response.json({candidates:[{content:{parts:[{text:'How many watts does the fan use?'}]}}]});});
  const result=await runHouseholdAgent({message:'Add an electric fan, 8 hours a day',context:{appliances:[]},history:[{role:'user',text:'My fan is in the bedroom'}]});
  assert.ok(body,'Gemini was called');assert.match(JSON.stringify(body),/bedroom/);assert.equal(result.actions.length,0);assert.match(result.reply.text,/watts/);
});
