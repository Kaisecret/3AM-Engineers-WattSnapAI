// Real production worker/model, a closed page, and a disconnected fresh page.
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(process.env.TEMP,'wattsnap-scanner-tools/node_modules/playwright'));
const base=process.env.OFFLINE_BASE||'http://127.0.0.1:3110';
const id='11111111-1111-4111-8111-111111111111';

async function main(){
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const errors=[],external=[],cloud=[];
    context.on('request',request=>{
      if(new URL(request.url()).origin!==new URL(base).origin)external.push(request.url());
      if(new URL(request.url()).pathname.startsWith('/api/ai/'))cloud.push({method:request.method(),url:request.url()});
    });
    let page=await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'/login');
    await page.waitForFunction(()=>document.documentElement.dataset.offlineReady==='true'&&document.documentElement.dataset.offlineAiReady==='true',null,{timeout:120000});
    const manifest=await page.evaluate(async()=>{
      const response=await caches.match('/offline-ai.json');
      const manifest=await response.json();
      for(const file of manifest.files)if(!await caches.match(file))throw Error('Missing AI asset '+file);
      return manifest;
    });
    assert.ok(manifest.files.some(file=>file.endsWith('model_quantized.onnx')));
    await page.evaluate(({id})=>{
      localStorage.setItem('wattsnap-account-display-v1',JSON.stringify({version:1,identity:{id,name:'TinyBERT test',email:'tinybert@example.test'}}));
      localStorage.setItem('wattsnap-ui-preview-v1:household:'+id,JSON.stringify({name:'TinyBERT test',budget:2000,provider:'anteco',location:'San Jose, Antique',bills:[{id:'bill',month:'2026-09',kwh:120,amount:1200,source:'manual'}],appliances:[]}));
    },{id});
    await context.setOffline(true);await page.close();
    page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'/assistant');
    await page.locator('[data-offline-app=true]').waitFor();
    async function ask(text){
      await page.getByRole('textbox',{name:'Message WattSnap AI'}).fill(text);
      await page.getByRole('button',{name:'Send message',exact:true}).click();
      await page.getByRole('button',{name:'Send message',exact:true}).waitFor({state:'visible'});
      await page.waitForFunction(()=>!document.querySelector('.chat-typing'),null,{timeout:30000});
      const answer=page.locator('.chat-row.is-bot').last();
      await answer.waitFor();return answer;
    }
    let answer=await ask('How much room do I have left to spend?');
    await answer.getByText(/TinyBERT.*offline/).waitFor({timeout:30000});
    assert.match(await answer.innerText(),/2,000\.00/);assert.match(await answer.innerText(),/800\.00/);
    console.log('PASS: cold offline TinyBERT recognizes a budget paraphrase and answers from saved household values');
    answer=await ask('Work out 100 W for 8 hours, 20 days, 2 units');
    await answer.getByText(/32 kWh/).waitFor({timeout:30000});assert.match(await answer.innerText(),/320\.00/);
    console.log('PASS: TinyBERT plus exact-value parsing calculates the original watts, hours, days and quantity');
    answer=await ask('Set my budget to 2500');
    const confirm=page.getByRole('button',{name:/^Confirm:/});
    await confirm.waitFor();
    assert.equal(await page.evaluate(id=>JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1:household:'+id)).budget,id),2000);
    await confirm.click();
    assert.equal(await page.evaluate(id=>JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1:household:'+id)).budget,id),2500);
    console.log('PASS: local changes still require explicit confirmation');
    answer=await ask('quantum bananas?');
    await answer.getByText(/Try one of these/).waitFor();assert.doesNotMatch(await answer.innerText(),/TinyBERT/);
    assert.equal(cloud.length,0,'offline chat never calls Gemini: '+JSON.stringify(cloud));
    assert.equal(external.length,0,'no model, tokenizer or runtime CDN dependency');
    assert.deepEqual(errors,[]);
    console.log('PASS: unknown question rejected; zero cloud requests, external requests or page errors');
    await context.close();
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
