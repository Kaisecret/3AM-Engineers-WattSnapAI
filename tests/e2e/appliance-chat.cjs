const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const toolsPath = process.env.SCANNER_TOOLS || path.join(os.tmpdir(), 'wattsnap-scanner-tools', 'node_modules');
const { build } = require(path.join(toolsPath, 'esbuild'));
const { chromium } = require(path.join(toolsPath, 'playwright'));
const root = path.resolve(__dirname, '../..');
const output = path.join(os.tmpdir(), `wattsnap-appliance-chat${process.env.APP_THEME === 'dark' ? '-dark' : ''}`);

async function main() {
  await fs.mkdir(output, { recursive: true });
  await build({ stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import Appliances from './src/features/dashboard/components/AppliancesScreen'; import Chat from './src/features/assistant/components/ChatScreen'; import './src/app/globals.css'; import './src/features/onboarding/theme.css'; import './src/features/onboarding/accessibility.css'; import './src/features/dashboard/frontend-refinements.css'; import './src/app/(household)/dashboard/dashboard.css'; import './src/features/dashboard/app-ui.css'; import './src/features/dashboard/appliances.css'; import './src/features/assistant/assistant.css'; createRoot(document.getElementById('root')).render(location.pathname==='/assistant'?<Chat/>:<Appliances startAdding={location.pathname==='/appliances/new'}/>);`, resolveDir: root, loader: 'tsx' }, bundle: true, outfile: path.join(output, 'app.js'), jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' },
    format: 'esm', plugins: [{ name: 'next-shell', setup(build) {
      build.onResolve({filter:/^\/assets\//},args=>({path:args.path,external:true}));
      build.onResolve({filter:/^(next\/(image|link|navigation)|\.\/PageShell|.*\/AppHeader|.*\/AppNavigation)$/},args=>({path:args.path,namespace:'shell'}));
      build.onLoad({filter:/.*/,namespace:'shell'},args=>({loader:'jsx',resolveDir:root,contents:
        args.path==='next/navigation'?'export const useRouter=()=>({push:()=>{}}); export const usePathname=()=>location.pathname;':
        args.path==='./PageShell'?'import React from "react"; export default function Shell({children,className}){return <div className={"ws-home ui-page "+className}><div className="ws-shell"><main className="ui-main">{children}</main></div></div>}':
        args.path.endsWith('/AppHeader')||args.path.endsWith('/AppNavigation')?'export default function Chrome(){return null}':
        args.path==='next/link'?'import React from "react"; export default function Link({href,children,...rest}){return <a href={href} {...rest}>{children}</a>}':
        'import React from "react"; export default function Image({fill,unoptimized,priority,children,...rest}){return <img {...rest}/>}' }));
    }}] });
  const server=http.createServer(async(req,res)=>{try{
    const url=new URL(req.url,'http://localhost');
    if(['/app.js','/app.css'].includes(url.pathname)){res.setHeader('Content-Type',url.pathname.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8');res.end(await fs.readFile(path.join(output,path.basename(url.pathname))));}
    else if(url.pathname.startsWith('/assets/')){const asset=path.resolve(root,'public','.'+decodeURIComponent(url.pathname));assert.ok(asset.startsWith(path.join(root,'public')+path.sep));res.end(await fs.readFile(asset));}
    else {res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><html data-theme="${process.env.APP_THEME === 'dark' ? 'dark' : 'light'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--font-sans:Arial;--ws-header-height:0px}body{margin:0;font-family:Arial}</style><div id="root"></div><script type="module" src="/app.js"></script></html>`);}
  }catch{res.statusCode=404;res.end();}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const failures=[];
  async function scenario(name,width,run){
    if(process.env.APP_SCENARIO&&!new RegExp(process.env.APP_SCENARIO).test(name))return;
    const context=await browser.newContext({viewport:{width,height:740},reducedMotion:'reduce'});
    await context.addInitScript(()=>localStorage.setItem('wattsnap-ui-preview-v1',JSON.stringify({name:'Test home',budget:0,bills:[],appliances:[]})));
    const page=await context.newPage();page.setDefaultTimeout(6000);
    try{await run(page,context);console.log('PASS:',name);}catch(error){failures.push(name);console.error('FAIL:',name,error.message);await page.screenshot({path:path.join(output,`failure-${width}-${failures.length}.png`)});}finally{await context.close();}
  }
  async function message(page,text){await page.getByRole('textbox',{name:'Message WattSnap AI'}).fill(text);await page.getByRole('button',{name:'Send message',exact:true}).click();}
  try {
    for(const width of [320,390,768,1440])await scenario(`appliance summary card is compact and clear of the mascot at ${width}px`,width,async page=>{
      await page.addInitScript(()=>localStorage.setItem('wattsnap-ui-preview-v1',JSON.stringify({name:'Test home',budget:0,bills:[{id:'b1',month:'2026-09',kwh:109,amount:1738.14,source:'manual'}],appliances:[{id:'a1',name:'Electric fan',kind:'fan',watts:60,hours:1,quantity:1,days:30,source:'manual'},{id:'a2',name:'Aircon',kind:'aircon',watts:1000,hours:8,quantity:1,days:30,source:'manual'}]})));
      await page.goto(base+'/appliances');
      const card=page.locator('.ap-summary');await card.getByRole('heading',{name:'Monthly estimate',exact:true}).waitFor();
      assert.match(await card.innerText(),/241\.8\s*kWh \/ month/);assert.match(await card.innerText(),/Appliances\s*2/);assert.match(await card.innerText(),/Per day\s*8\.06\s*kWh/);
      const layout=await card.evaluate(element=>{
        const box=item=>item.getBoundingClientRect(),art=box(element.querySelector('.ap-summary-art')),button=box(element.querySelector('.ap-add'));
        // The mascot must never cover the estimate, the facts or the add action.
        const covered=[...element.querySelectorAll('.ap-summary-title, .ap-summary-figure, .ap-summary-cost, .ap-summary-stats, .ap-add')].filter(item=>{const b=box(item);return b.left<art.right&&b.right>art.left&&b.top<art.bottom&&b.bottom>art.top;}).map(item=>item.className);
        return {covered,parts:element.querySelectorAll('.ap-summary-title, .ap-summary-figure, .ap-summary-cost, .ap-summary-stats, .ap-add').length,art:art.width,height:box(element).height,buttonWidth:button.width,buttonHeight:button.height,copyWidth:box(element.querySelector('.ap-summary-copy')).width};
      });
      assert.equal(layout.parts,5);assert.ok(layout.art>60,'Mascot stays on the card');
      assert.deepEqual(layout.covered,[],`${width}px: mascot covers nothing`);
      assert.ok(layout.buttonHeight>=44,'Add button is a comfortable touch target');
      if(width<600){assert.ok(layout.buttonWidth>=layout.copyWidth-1,'Phone add button spans the card');assert.ok(layout.height<=240,`Phone card stays compact (${layout.height}px)`);}
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
      await card.screenshot({path:path.join(output,`summary-${width}.png`)});
    });
    for(const width of [320,390,1440])await scenario(`appliance rows show whole names, costs and side-by-side actions at ${width}px`,width,async page=>{
      await page.addInitScript(()=>localStorage.setItem('wattsnap-ui-preview-v1',JSON.stringify({name:'Test home',budget:0,bills:[{id:'b1',month:'2026-09',kwh:109,amount:1738.14,source:'manual'}],appliances:[{id:'a1',name:'Electric fan',kind:'fan',watts:20,hours:2,quantity:1,days:30,source:'manual',wattageBasis:'nameplate'},{id:'a2',name:'Washing machine (front load)',kind:'washer',watts:20,hours:1,quantity:1,days:30,source:'manual',wattageBasis:'nameplate'}]})));
      await page.goto(base+'/appliances');await page.locator('.ap-list > li').nth(1).waitFor();
      const rows=await page.locator('.ap-list > li').evaluateAll(items=>items.map(item=>{
        const box=element=>element.getBoundingClientRect(),row=box(item),panel=box(item.closest('.ap-list-panel')),name=item.querySelector('h3'),cost=box(item.querySelector('.ap-item-cost')),buttons=[...item.querySelectorAll('.ap-item-actions button')].map(box);
        const track=box(item.querySelector('.ap-share i')),fill=box(item.querySelector('.ap-share i span'));
        return {wholeName:name.scrollWidth<=name.clientWidth+1,nameRight:box(name).right,valueLeft:box(item.querySelector('.ap-item-top strong')).left,iconTop:box(item.querySelector('.ap-icon')).top-box(item.querySelector('.ap-item-main')).top,costInside:cost.left>=row.left-1&&cost.right<=row.right+1,sameLine:Math.abs(buttons[0].top-buttons[1].top)<2,touch:buttons.every(button=>button.width>=44&&button.height>=44),buttonsInside:buttons.every(button=>button.right<=panel.right-4),filled:fill.width/track.width,height:row.height};
      }));
      for(const row of rows){
        assert.ok(row.wholeName,'Appliance name is never cut off');assert.ok(row.nameRight<=row.valueLeft,'Name and monthly use do not collide');
        assert.ok(Math.abs(row.iconTop)<=2,'Icon lines up with the name');assert.ok(row.costInside,'Cost stays inside the row');
        assert.ok(row.sameLine&&row.touch&&row.buttonsInside,`Edit and remove sit side by side inside the panel as comfortable touch targets (${JSON.stringify(row)})`);
      }
      assert.ok(Math.abs(rows[0].filled-2/3)<.03&&Math.abs(rows[1].filled-1/3)<.03,`Bars share one track so shares compare (${rows.map(row=>row.filled)})`);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
      await page.locator('.ap-list-panel').screenshot({path:path.join(output,`rows-${width}.png`)});
    });
    // What the label reader answers for a floor-type air conditioner plate with a cooling input and a larger rated input.
    const labelReading={reviewRequired:true,unknownFields:[],applianceName:'Floor type air conditioner',applianceType:'aircon',model:'ET36FS/M-INT',ratedPower:4100,powerUnit:'W',powerLabel:'Standard rating conditions cooling input',otherRatings:[{label:'Rated input',watts:5400}],checks:[]};
    async function labelPhoto(page){
      const base64=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=600;canvas.height=800;const ctx=canvas.getContext('2d');ctx.fillStyle='#ddd';ctx.fillRect(0,0,600,800);ctx.fillStyle='#111';ctx.font='28px Arial';ctx.fillText('INPUT 4100W',60,120);return canvas.toDataURL('image/png').split(',')[1];});
      await page.locator('input[type=file]').first().setInputFiles({name:'label.png',mimeType:'image/png',buffer:Buffer.from(base64,'base64')});
    }
    const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).appliances);
    for(const width of [320,390])await scenario(`label photo is read by AI, fills empty fields and still needs confirmation at ${width}px`,width,async page=>{
      let sent,answer;await page.route('**/api/ai/appliances',async route=>{sent=route.request().postDataJSON();await new Promise(resolve=>answer=resolve);await route.fulfill({json:{ok:true,data:labelReading}});});
      await page.goto(base+'/appliances/new');await page.getByRole('dialog',{name:'Add an appliance',exact:true}).waitFor();await labelPhoto(page);
      const dialog=page.getByRole('dialog',{name:'Add appliance',exact:true});await dialog.getByText('Reading your label…',{exact:true}).waitFor();
      await dialog.getByLabel('Name',{exact:true}).fill('Sala aircon');
      while(!answer)await page.waitForTimeout(40);
      assert.ok(sent.imageBase64.length>500&&/^image\//.test(sent.mimeType),'The photo itself is sent for reading');
      answer();await dialog.getByText('WattSnap AI read your label',{exact:true}).waitFor();
      assert.equal(await dialog.getByLabel('Name',{exact:true}).inputValue(),'Sala aircon','A name typed while reading is kept');
      assert.equal(await dialog.getByLabel('Power',{exact:true}).inputValue(),'4100');
      assert.equal(await dialog.getByLabel(/^Model/).inputValue(),'ET36FS/M-INT');
      assert.equal(await dialog.getByRole('radio',{name:'Air conditioner',exact:true}).isChecked(),true);
      assert.equal(await dialog.getByRole('radio',{name:'The label',exact:true}).getAttribute('aria-checked'),'true');
      const cooling=dialog.getByRole('button',{name:/cooling input\s*4,100 W/}),rated=dialog.getByRole('button',{name:/Rated input\s*5,400 W/});
      assert.equal(await cooling.getAttribute('aria-pressed'),'true');
      await rated.click();assert.equal(await dialog.getByLabel('Power',{exact:true}).inputValue(),'5400','The other printed rating is one tap away');
      await cooling.click();assert.equal(await dialog.getByLabel('Power',{exact:true}).inputValue(),'4100');
      assert.equal(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth+1),true,'The form does not overflow sideways');
      await dialog.locator('.ad-label').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`label-read-${width}.png`)});
      await dialog.getByLabel('Hours a day',{exact:true}).fill('8');
      await dialog.getByRole('button',{name:'Add appliance',exact:true}).click();await dialog.getByText(/I checked these values/).first().waitFor();
      assert.equal((await saved(page)).length,0,'Nothing is saved before the person confirms the values');
      await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Add appliance',exact:true}).click();
      await page.getByRole('dialog',{name:'Appliance added',exact:true}).waitFor();
      const [appliance]=await saved(page);
      assert.deepEqual({name:appliance.name,kind:appliance.kind,watts:appliance.watts,model:appliance.model,hours:appliance.hours,wattageBasis:appliance.wattageBasis},{name:'Sala aircon',kind:'aircon',watts:4100,model:'ET36FS/M-INT',hours:8,wattageBasis:'nameplate'});
    });
    await scenario('an unread label keeps manual entry and can be read again',390,async page=>{
      let calls=0;await page.route('**/api/ai/appliances',route=>++calls===1?route.fulfill({status:502,json:{error:'We couldn’t read that nameplate. Please try another photo or type the values.',problem:'unavailable'}}):route.fulfill({json:{ok:true,data:labelReading}}));
      await page.goto(base+'/appliances/new');await page.getByRole('dialog',{name:'Add an appliance',exact:true}).waitFor();await labelPhoto(page);
      const dialog=page.getByRole('dialog',{name:'Add appliance',exact:true});await dialog.getByText('Label not read',{exact:true}).waitFor();
      assert.equal(await dialog.getByLabel('Power',{exact:true}).inputValue(),'');assert.equal(await dialog.getByLabel('Name',{exact:true}).isEnabled(),true,'The person can still type the values');
      await page.screenshot({path:path.join(output,'label-failed-390.png')});
      await dialog.getByRole('button',{name:'Read again',exact:true}).click();await dialog.getByText('WattSnap AI read your label',{exact:true}).waitFor();
      assert.equal(calls,2);assert.equal(await dialog.getByLabel('Power',{exact:true}).inputValue(),'4100');
    });
    await scenario('an offline label photo is not sent and asks for typed values',390,async(page,context)=>{
      let calls=0;await page.route('**/api/ai/appliances',route=>{calls++;return route.fulfill({json:{ok:true,data:labelReading}});});
      await page.goto(base+'/appliances/new');await page.getByRole('dialog',{name:'Add an appliance',exact:true}).waitFor();await context.setOffline(true);await labelPhoto(page);
      const dialog=page.getByRole('dialog',{name:'Add appliance',exact:true});await dialog.getByText('Label not read',{exact:true}).waitFor();
      assert.match(await dialog.locator('.ad-label').innerText(),/offline/i);assert.equal(calls,0);
    });
    await scenario('a new label photo replaces values the earlier label filled in',390,async page=>{
      let calls=0;await page.route('**/api/ai/appliances',route=>route.fulfill({json:{ok:true,data:++calls===1?labelReading:{reviewRequired:true,unknownFields:[],applianceName:'Stand fan',applianceType:'fan',model:null,ratedPower:55,powerUnit:'W',powerLabel:'Rated power',otherRatings:[],checks:[]}}}));
      await page.goto(base+'/appliances/new');await page.getByRole('dialog',{name:'Add an appliance',exact:true}).waitFor();await labelPhoto(page);
      const dialog=page.getByRole('dialog',{name:'Add appliance',exact:true});await dialog.getByText('WattSnap AI read your label',{exact:true}).waitFor();
      await dialog.getByLabel('Hours a day',{exact:true}).fill('6');await labelPhoto(page);
      await dialog.getByRole('button',{name:/Rated power\s*55 W/}).waitFor();
      assert.equal(await dialog.getByLabel('Power',{exact:true}).inputValue(),'55');assert.equal(await dialog.getByLabel('Name',{exact:true}).inputValue(),'Stand fan');
      assert.equal(await dialog.getByLabel(/^Model/).inputValue(),'','A model from the earlier label is not kept');
      assert.equal(await dialog.getByRole('radio',{name:'Electric fan',exact:true}).isChecked(),true);
      assert.equal(await dialog.getByLabel('Hours a day',{exact:true}).inputValue(),'6','Typed hours are kept');
    });
    for(const width of [320,390,768,1440])await scenario(`appliance form and save popup fit at ${width}px`,width,async page=>{
      await page.goto(base+'/appliances/new');
      await page.getByRole('button',{name:/^Type it in/}).click();
      const dialog=page.getByRole('dialog',{name:'Add appliance',exact:true});await dialog.waitFor();
      const size=await dialog.evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,body:el.querySelector('form').getBoundingClientRect().width}));
      assert.ok(size.scroll<=size.width+1,`Form overflows horizontally: ${JSON.stringify(size)}`);
      await page.screenshot({path:path.join(output,`initial-form-${width}.png`)});
      await dialog.getByLabel('Name',{exact:true}).fill('Bedroom fan');
      await dialog.getByLabel('Power',{exact:true}).fill('60');
      await dialog.getByLabel('Hours a day',{exact:true}).fill('8');
      await dialog.getByRole('checkbox').check();
      await page.screenshot({path:path.join(output,`form-${width}.png`)});
      await dialog.getByRole('button',{name:'Add appliance',exact:true}).click();
      const success=page.getByRole('dialog',{name:'Appliance added',exact:true});await success.waitFor();
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).appliances.length),1);
      assert.match(await success.innerText(),/14\.4 kWh/);
      await page.screenshot({path:path.join(output,`saved-${width}.png`)});
      assert.equal(await success.getByRole('button',{name:'Done',exact:true}).evaluate(el=>el===document.activeElement),true);
      await success.getByRole('button',{name:'Add another',exact:true}).click();
      await page.getByRole('dialog',{name:'Add an appliance',exact:true}).waitFor();
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).appliances.length),1);
    });
    await scenario('offline chat parses a budget and saves only after confirmation',390,async(page,context)=>{
      await page.goto(base+'/assistant');await page.getByRole('textbox',{name:'Message WattSnap AI'}).waitFor();await context.setOffline(true);
      await message(page,'Set my budget to 2500');
      const confirm=page.getByRole('button',{name:/Confirm: Set your monthly budget/});await confirm.waitFor();
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).budget),0);
      await confirm.click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).budget),2500);
      await page.getByText('Budget saved',{exact:true}).waitFor();
      await page.screenshot({path:path.join(output,'offline-budget.png')});
    });
    await scenario('offline chat asks for missing watts and understands the follow-up',320,async(page,context)=>{
      await page.goto(base+'/assistant');await page.getByRole('textbox',{name:'Message WattSnap AI'}).waitFor();await context.setOffline(true);
      await message(page,'Add an electric fan, 8 hours a day');
      await page.getByText(/What.*watts|How many watts/).waitFor();
      assert.equal(await page.locator('.chat-action').count(),0);
      await message(page,'60 W');const confirm=page.getByRole('button',{name:/Confirm: Add/});await confirm.waitFor();
      await confirm.click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).appliances[0].watts),60);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:path.join(output,'offline-appliance.png')});
    });
    await scenario('failed appliance storage does not open a success popup',390,async page=>{
      await page.goto(base+'/appliances/new');await page.getByRole('button',{name:/^Type it in/}).click();
      const dialog=page.getByRole('dialog',{name:'Add appliance',exact:true});
      await dialog.getByLabel('Name',{exact:true}).fill('Fan');await dialog.getByLabel('Power',{exact:true}).fill('60');await dialog.getByLabel('Hours a day',{exact:true}).fill('8');await dialog.getByRole('checkbox').check();
      await page.evaluate(()=>Storage.prototype.setItem=()=>{throw new Error('Unavailable storage');});
      await dialog.getByRole('button',{name:'Add appliance',exact:true}).click();await dialog.locator('.ui-error').waitFor();
      assert.equal(await page.getByRole('dialog',{name:'Appliance added',exact:true}).count(),0);
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).appliances.length),0);
    });
    await scenario('household switching closes the previous saved confirmation',390,async page=>{
      await page.goto(base+'/appliances/new');await page.getByRole('button',{name:/^Type it in/}).click();
      const dialog=page.getByRole('dialog',{name:'Add appliance',exact:true});
      await dialog.getByLabel('Name',{exact:true}).fill('Private household A fan');await dialog.getByLabel('Power',{exact:true}).fill('60');await dialog.getByLabel('Hours a day',{exact:true}).fill('8');await dialog.getByRole('checkbox').check();
      await dialog.getByRole('button',{name:'Add appliance',exact:true}).click();await page.getByRole('dialog',{name:'Appliance added',exact:true}).waitFor();
      await page.evaluate(()=>{localStorage.setItem('wattsnap-preview-session-v1',JSON.stringify({version:1,identity:{id:'household-b',name:'Household B',email:'b@example.test'}}));window.dispatchEvent(new Event('wattsnap-preview-session-change'));});
      await page.getByRole('dialog',{name:'Appliance added',exact:true}).waitFor({state:'hidden'});
      await page.getByText('Private household A fan',{exact:true}).waitFor({state:'hidden'});
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).appliances.length),1);
    });
    await scenario('invalid offline follow-ups show validation and can be corrected',320,async(page,context)=>{
      await page.goto(base+'/assistant');await page.getByRole('textbox',{name:'Message WattSnap AI'}).waitFor();await context.setOffline(true);
      await message(page,'Add fan 60 W');await page.getByText(/How many hours a day/).waitFor();
      await message(page,'30');await page.getByText(/Hours.*24/i).waitFor();assert.equal(await page.locator('.chat-action').count(),0);
      await message(page,'8');await page.getByRole('button',{name:/Confirm: Add/}).click();
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).appliances[0].hours),8);
    });
    await scenario('photo decoding cannot reopen a form after household switching',390,async page=>{
      await page.goto(base+'/appliances/new');await page.getByRole('dialog',{name:'Add an appliance',exact:true}).waitFor();
      await page.evaluate(()=>HTMLImageElement.prototype.decode=function(){return new Promise(resolve=>window.finishPhoto=resolve);});
      await page.locator('input[type=file]').first().setInputFiles({name:'household-a-label.png',mimeType:'image/png',buffer:Buffer.from('fixture')});
      await page.waitForFunction(()=>typeof window.finishPhoto==='function');
      await page.evaluate(()=>{localStorage.setItem('wattsnap-preview-session-v1',JSON.stringify({version:1,identity:{id:'household-b',name:'Household B',email:'b@example.test'}}));window.dispatchEvent(new Event('wattsnap-preview-session-change'));});
      await page.waitForFunction(()=>document.querySelector('.ap-empty'));
      await page.evaluate(()=>window.finishPhoto());await page.waitForTimeout(100);
      assert.equal(await page.locator('.ad-photo').count(),0);
      assert.equal(await page.getByRole('dialog',{name:'Add appliance',exact:true}).count(),0);
    });
    await scenario('complete online changes go to Gemini and still require confirmation',390,async page=>{
      let calls=0;await page.route('**/api/ai/assistant',route=>{calls++;return route.fulfill({json:{source:'gemini',reply:{text:'Review your proposed budget of ₱2,100.00.'},actions:[{type:'set_budget',amount:2100}]}});});
      await page.goto(base+'/assistant');await message(page,'Set my budget to 2100');
      await page.getByRole('button',{name:/Confirm: Set your monthly budget to ₱2,100/}).waitFor();
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).budget),0);
      await page.getByText('WattSnap AI · online',{exact:true}).waitFor();assert.equal(calls,1);
    });
    await scenario('the first online saved-data question goes to Gemini with the actual snapshot',390,async page=>{
      let calls=0;await page.route('**/api/ai/assistant',route=>{calls++;const data=route.request().postDataJSON();assert.equal(data.context.budget,2000);return route.fulfill({json:{source:'gemini',reply:{text:'Your **monthly budget** is ₱2,000.00.\n\n- August 2026: 192 kWh · ₱3,072.60.'}}});});
      await page.goto(base+'/assistant');await page.evaluate(()=>{localStorage.setItem('wattsnap-ui-preview-v1',JSON.stringify({name:'Test home',budget:2000,bills:[{id:'aug',month:'2026-08',kwh:192,amount:3072.6}],appliances:[]}));window.dispatchEvent(new Event('wattsnap-preview-change'));});
      await message(page,'Magkano ang budget ko at bill history?');
      const answer=page.locator('.chat-row.is-bot').last();await answer.getByText(/3,072\.60/).first().waitFor();assert.match(await answer.innerText(),/2,000\.00/);assert.equal(calls,1);
      assert.equal(await answer.locator('.chat-value.is-money').count(),2);assert.equal(await answer.locator('.chat-value.is-energy').count(),1);
    });
    for(const width of [320,390,768])await scenario(`conversation highlights and paragraphs fit at ${width}px`,width,async page=>{
      let calls=0;await page.route('**/api/ai/assistant',route=>{calls++;return route.fulfill({json:{source:'gemini',reply:{text:'**September 2026** used less electricity, but your saved bill total was higher.\n\n- August: 207 kWh · ₱1,491.15\n- September: 109 kWh · ₱1,738.14\n\nThe effective averages are ₱7.20/kWh and ₱15.95/kWh. Check the original bill for the charge breakdown.'}}});});
      await page.goto(base+'/assistant');await page.evaluate(()=>document.documentElement.dataset.offlineShell='true');
      await message(page,'September is low why the cost is no?');await page.getByText('WattSnap AI · online',{exact:true}).waitFor();assert.equal(calls,1);
      assert.equal(await page.locator('.chat-bubble strong').count(),1);assert.ok(await page.locator('.chat-value').count()>=6);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:path.join(output,`conversation-${width}.png`)});
    });
    await scenario('expired authentication does not prepare a fallback action',390,async page=>{
      await page.route('**/api/ai/assistant',route=>route.fulfill({status:401,json:{error:'Sign in required'}}));
      await page.goto(base+'/assistant');await message(page,'Help me plan an energy audit');await page.getByText('Your session ended. Please log in again.',{exact:true}).waitFor();
      assert.equal(await page.locator('.chat-action').count(),0);
    });
    await scenario('online bill clarification continues offline without losing its amount',390,async(page,context)=>{
      let calls=0;await page.route('**/api/ai/assistant',route=>{calls++;return route.fulfill({json:{source:'gemini',reply:{text:'Which billing month and year should I use?'}}});});
      await page.goto(base+'/assistant');await message(page,'Can you set up my September bill to 10000? I lost the receipt');
      await page.getByText('WattSnap AI · online',{exact:true}).waitFor();await context.setOffline(true);
      await message(page,'September 2026');await page.getByText('How many kWh are printed on that bill?',{exact:true}).waitFor();
      await message(page,'120');await page.getByRole('button',{name:/Confirm: Add your September 2026 bill: 120 kWh · ₱10,000/}).waitFor();
      assert.equal(calls,1);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).bills.length),0);
    });
    await scenario('offline missing-receipt wording prepares the requested amount after clarification',320,async(page,context)=>{
      await page.goto(base+'/assistant');await page.getByRole('textbox',{name:'Message WattSnap AI'}).waitFor();await context.setOffline(true);
      await message(page,'My September bill vanished so now plss setup plss10000');
      await page.getByText(/Which billing month and year/).waitFor();
      await message(page,'September 2026');await page.getByText('How many kWh are printed on that bill?',{exact:true}).waitFor();
      await message(page,'120');await page.getByRole('button',{name:/Confirm: Add your September 2026 bill: 120 kWh · ₱10,000/}).waitFor();
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).bills.length),0);
    });
    await scenario('reset cancels an unanswered request and ignores its later reply',390,async page=>{
      let release;await page.route('**/api/ai/assistant',async route=>{await new Promise(resolve=>release=resolve);await route.fulfill({json:{source:'gemini',reply:{text:'Old answer'},actions:[{type:'set_budget',amount:2100}]}}).catch(()=>{});});
      await page.goto(base+'/assistant');await message(page,'Help me plan an energy audit');await page.waitForFunction(()=>!!document.querySelector('.chat-typing'));
      await page.getByRole('button',{name:'Start a new chat'}).click();release?.();await page.waitForTimeout(100);
      assert.equal(await page.locator('.chat-action').count(),0);assert.equal(await page.getByText('Old answer',{exact:true}).count(),0);
    });
    await scenario('offline multi-actions can be cancelled and confirmed without duplicate saves',320,async(page,context)=>{
      await page.goto(base+'/assistant');await page.getByRole('textbox',{name:'Message WattSnap AI'}).waitFor();await context.setOffline(true);
      await message(page,'Set my budget to 2000; Add a fan 60 W 8 hours');
      await page.getByRole('button',{name:/Cancel: Set your monthly budget/}).click();
      const confirm=page.getByRole('button',{name:/Confirm: Add/});await confirm.waitFor();
      await confirm.evaluate(button=>{button.click();button.click();});
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).appliances.length),1);
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).budget),0);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:path.join(output,'offline-multi.png')});
    });
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
  console.log('Screenshots:',output);if(failures.length)throw new Error(`${failures.length} regressions failed`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
