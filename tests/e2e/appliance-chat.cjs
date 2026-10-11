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
  await build({ stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import Appliances from './src/features/dashboard/components/AppliancesScreen'; import Chat from './src/features/assistant/components/ChatScreen'; import './src/app/globals.css'; import './src/features/onboarding/theme.css'; import './src/features/onboarding/accessibility.css'; import './src/features/dashboard/frontend-refinements.css'; import './src/app/(household)/dashboard/dashboard.css'; import './src/features/dashboard/app-ui.css'; import './src/features/dashboard/appliances.css'; import './src/features/assistant/assistant.css'; createRoot(document.getElementById('root')).render(location.pathname==='/assistant'?<Chat/>:<Appliances startAdding/>);`, resolveDir: root, loader: 'tsx' }, bundle: true, outfile: path.join(output, 'app.js'), jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [{ name: 'next-shell', setup(build) {
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
    if(['/app.js','/app.css'].includes(url.pathname)){res.setHeader('Content-Type',url.pathname.endsWith('.css')?'text/css':'text/javascript');res.end(await fs.readFile(path.join(output,path.basename(url.pathname))));}
    else if(url.pathname.startsWith('/assets/')){const asset=path.resolve(root,'public','.'+decodeURIComponent(url.pathname));assert.ok(asset.startsWith(path.join(root,'public')+path.sep));res.end(await fs.readFile(asset));}
    else {res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html data-theme="${process.env.APP_THEME === 'dark' ? 'dark' : 'light'}"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--font-sans:Arial;--ws-header-height:0px}body{margin:0;font-family:Arial}</style><div id="root"></div><script src="/app.js"></script></html>`);}
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
    await scenario('complete typed changes are local immediately while online',390,async page=>{
      let calls=0;await page.route('**/api/ai/assistant',route=>{calls++;return route.fulfill({status:503,json:{error:'Unavailable'}});});
      await page.goto(base+'/assistant');await message(page,'Set my budget to 2100');
      await page.getByRole('button',{name:/Confirm: Set your monthly budget to ₱2,100/}).waitFor();
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).budget),0);
      await page.getByText('Saved data · on this device',{exact:true}).waitFor();assert.equal(calls,0);
    });
    await scenario('online saved-data questions answer together without AI calls',390,async page=>{
      let calls=0;await page.route('**/api/ai/assistant',route=>{calls++;return route.fulfill({status:503,json:{error:'Unavailable'}});});
      await page.goto(base+'/assistant');await page.evaluate(()=>{localStorage.setItem('wattsnap-ui-preview-v1',JSON.stringify({name:'Test home',budget:2000,bills:[{id:'aug',month:'2026-08',kwh:192,amount:3072.6}],appliances:[]}));window.dispatchEvent(new Event('wattsnap-preview-change'));});
      await message(page,'Magkano ang budget ko at bill history?');
      const answer=page.locator('.chat-row.is-bot').last();await answer.getByText(/3,072\.60/).first().waitFor();assert.match(await answer.innerText(),/2,000\.00/);assert.equal(calls,0);
    });
    await scenario('expired authentication does not prepare a fallback action',390,async page=>{
      await page.route('**/api/ai/assistant',route=>route.fulfill({status:401,json:{error:'Sign in required'}}));
      await page.goto(base+'/assistant');await message(page,'Help me plan an energy audit');await page.getByText('Your session ended. Please log in again.',{exact:true}).waitFor();
      assert.equal(await page.locator('.chat-action').count(),0);
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
