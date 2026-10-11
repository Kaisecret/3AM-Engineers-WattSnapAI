import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const file=new URL('./ChatMessageText.tsx',import.meta.url);
const exports={};
if(fs.existsSync(file)){
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code,{exports,require});
}
const render=value=>renderToStaticMarkup(React.createElement(exports.default??(()=>null),{value}));

test('currency and energy values receive highlights while preserving their text',()=>{
  const html=render('Your bill is ₱1,738.14 for 109 kWh at PHP 15.95 per kWh. The fan is 60 W.');
  assert.match(html,/<mark class="chat-value is-money">₱1,738\.14<\/mark>/);
  assert.match(html,/<mark class="chat-value is-money">PHP 15\.95<\/mark>/);
  assert.match(html,/<mark class="chat-value is-energy">109 kWh<\/mark>/);
  assert.match(html,/<mark class="chat-value is-energy">60 W<\/mark>/);
});
test('bold, paragraphs and ordered lists have semantic markup without markdown symbols',()=>{
  const html=render('**September bill**\n\n1. Review **109 kWh**\n2. Compare August\n\n- Check the rate');
  assert.match(html,/<strong>September bill<\/strong>/);assert.match(html,/<ol>/);assert.match(html,/<ul>/);
  assert.doesNotMatch(html,/\*\*|1\. Review/);assert.match(html,/<strong><mark[^>]+>109 kWh<\/mark><\/strong>/);
});
test('model HTML and links remain escaped text',()=>{
  const html=render('<img src=x onerror=alert(1)> [Open](javascript:alert(1))');
  assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img|<a /);assert.ok(html.includes('javascript:alert(1)'));
});
