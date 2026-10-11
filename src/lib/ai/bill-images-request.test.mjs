import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(`${s}.ts`,c);throw e;}}});
const { readBillImagesRequest } = await import('./bill-images-request.ts');
const image=(label)=>({imageBase64:Buffer.from(label).toString('base64'),mimeType:'image/jpeg'});
const request=body=>new Request('https://example.test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
test('ordered receipt sections and provider hint are preserved',async()=>{
  const result=await readBillImagesRequest(request({images:[image('top'),image('bottom')],providerHint:' ANTECO '}));
  assert.equal(result.ok,true);assert.deepEqual(result.value.images,[image('top'),image('bottom')]);assert.equal(result.value.hint,'ANTECO');
});
test('legacy single photo and PDF remain supported',async()=>{
  const result=await readBillImagesRequest(request({...image('bill'),providerHint:'ANTECO'}));assert.equal(result.value.images.length,1);
  assert.equal((await readBillImagesRequest(request({imageBase64:'JVBERi0=',mimeType:'application/pdf'}))).ok,true);
});
test('rejects empty, too many, malformed, mixed PDF and oversized sections',async()=>{
  for(const images of [[],Array(5).fill(image('part')),[{...image('part'),mimeType:'text/plain'}],[{imageBase64:'not base64!',mimeType:'image/jpeg'}],[{imageBase64:'JVBERi0=',mimeType:'application/pdf'},image('part')]])assert.equal((await readBillImagesRequest(request({images}))).ok,false);
  const big={imageBase64:'AAAA'.repeat(534_000),mimeType:'image/jpeg'};
  assert.equal((await readBillImagesRequest(request({images:[big,big]}))).status,413);
});
test('bounds streamed JSON even without a content-length header',async()=>{
  let cancelled=false;
  const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(4_400_001));},cancel(){cancelled=true;}});
  const result=await readBillImagesRequest(new Request('https://example.test',{method:'POST',headers:{'content-type':'application/json'},body:stream,duplex:'half'}));
  assert.equal(result.status,413);assert.equal(cancelled,true);
});
test('legacy multipart photos retain their hint',async()=>{
  const form=new FormData();form.set('image',new File(['bill'],'bill.jpg',{type:'image/jpeg'}));form.set('providerHint','ANTECO');
  const result=await readBillImagesRequest(new Request('https://example.test',{method:'POST',body:form}));
  assert.equal(result.ok,true);assert.equal(result.value.images[0].imageBase64,'YmlsbA==');assert.equal(result.value.hint,'ANTECO');
});
