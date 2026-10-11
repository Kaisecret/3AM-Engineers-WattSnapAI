import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) return nextResolve(pathToFileURL(path.resolve("src", specifier.slice(2) + ".ts")).href, context);
  try { return nextResolve(specifier, context); }
  catch (error) { if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context); throw error; }
} });
const { extractBillWithGemini, extractBillSectionsWithGemini } = await import("./client.ts");

test("bill image requests ask Gemini for high resolution and explicit nullable fields", async t => {
  const oldKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-only-key";
  t.after(() => { if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey; });
  let request;
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    request = JSON.parse(options.body);
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ provider: "ANTECO", billingMonth: "2026-09", kwhUsed: 33, currentMonthBill: 418.85, amountDue: 0, subsidy: 418.85, charges: [] }) }] }, finishReason: "STOP" }] });
  });
  const result = await extractBillWithGemini("data:image/jpeg;base64,YmlsbA==", "image/jpeg", "ANTECO");
  assert.equal(request.generationConfig.mediaResolution, "MEDIA_RESOLUTION_HIGH");
  assert.equal(request.contents[0].parts[1].inlineData.data, "YmlsbA==");
  assert.ok(request.generationConfig.responseSchema.required.includes("unreadable"));
  assert.match(request.systemInstruction.parts[0].text, /printed provider name wins/);
  assert.equal(result.consumptionKwh, 33);
  assert.equal(result.amountPayable, 0);
});

test("receipt sections are sent in order with overlap guidance and nullable results",async t=>{
  const oldKey=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='test-only-key';
  t.after(()=>{if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;});
  let request;t.mock.method(globalThis,'fetch',async(_url,options)=>{request=JSON.parse(options.body);return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({provider:'ANTECO',billingMonth:'2026-09',kwhUsed:null,currentMonthBill:418.85,amountDue:0,subsidy:418.85,unreadable:['kwhUsed'],charges:[]})}]},finishReason:'STOP'}]});});
  const result=await extractBillSectionsWithGemini([{imageBase64:'dG9w',mimeType:'image/jpeg'},{imageBase64:'Ym90dG9t',mimeType:'image/jpeg'}],'ANTECO');
  assert.deepEqual(request.contents[0].parts.filter(part=>part.inlineData).map(part=>part.inlineData.data),['dG9w','Ym90dG9t']);
  assert.match(request.contents[0].parts[0].text,/same.*receipt/i);assert.match(request.contents[0].parts[0].text,/overlap/i);assert.match(request.contents[0].parts[0].text,/twice/i);
  assert.equal(request.generationConfig.mediaResolution,'MEDIA_RESOLUTION_HIGH');assert.equal(result.consumptionKwh,null);
});

test('temporary scan-model overload retries with the configured fallback and all sections',async t=>{
  const old={key:process.env.GEMINI_API_KEY,scan:process.env.GEMINI_SCAN_MODEL,model:process.env.GEMINI_MODEL};
  process.env.GEMINI_API_KEY='test-only-key';process.env.GEMINI_SCAN_MODEL='test-primary';process.env.GEMINI_MODEL='test-fallback';
  t.after(()=>{for(const [key,value]of [['GEMINI_API_KEY',old.key],['GEMINI_SCAN_MODEL',old.scan],['GEMINI_MODEL',old.model]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}});
  const calls=[];t.mock.method(globalThis,'fetch',async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return calls.length===1?Response.json({error:{message:'High demand'}},{status:503}):Response.json({candidates:[{content:{parts:[{text:JSON.stringify({provider:'ANTECO',billingMonth:'2026-09',kwhUsed:33,currentMonthBill:418.85,amountDue:0,subsidy:418.85,charges:[]})}]}}]});});
  const result=await extractBillSectionsWithGemini([{imageBase64:'dG9w',mimeType:'image/jpeg'},{imageBase64:'Ym90dG9t',mimeType:'image/jpeg'}]);
  assert.equal(calls.length,2);assert.match(calls[1].url,/test-fallback/);assert.deepEqual(calls[0].body.contents,calls[1].body.contents);assert.equal(result.consumptionKwh,33);
});
