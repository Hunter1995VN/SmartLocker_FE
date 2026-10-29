import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';

const require = createRequire(process.env.REPORT5_NODE_PACKAGES ? path.join(process.env.REPORT5_NODE_PACKAGES,'package.json') : import.meta.url);
const { chromium } = require('playwright');
const out=path.resolve('docs/report5/results/evidence');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[];
const station={id:'00000000-0000-0000-0000-000000000002',name:'ST-A fixture',address:'Isolated fixture',status:'ACTIVE',opensAt:'00:00',closesAt:'23:59',totalS:2,totalM:2,totalL:2,availableS:2,availableM:2,availableL:2,priceS:15000,priceM:25000,priceL:40000};
async function pageFor({prices={},payment={},view='booking'}={}){
 const context=await browser.newContext({timezoneId:'Asia/Ho_Chi_Minh',viewport:{width:1440,height:1100}});
 const page=await context.newPage();page.setDefaultTimeout(10000);const requests=[];
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  // Intercept every API request before any real backend can receive it.
  if(url.pathname.startsWith('/api/')){
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}});
   let data;
   if(url.pathname.toLowerCase().startsWith('/api/stations')) data={success:true,data:{...station,...prices}};
   else if(req.method()==='POST'){
    const body=req.postDataJSON();requests.push(body);
    data={success:true,data:{bookingId:'TEST-ONLY',bookingCode:'TEST-ONLY',amount:45000,paymentUrl:'https://payment.test.invalid',paymentExpiresAt:new Date(Date.now()+600000).toISOString()}};
   } else data={success:true,data:{status:'CONFIRMED',lockerCode:null,accessCode:'TESTA123',...payment}};
   return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(data)});
  }
  if(url.origin==='http://127.0.0.1:5185')return route.continue();
  return route.abort(); // no PayOS, production, analytics or external image calls
 });
 await page.goto('http://127.0.0.1:5185/tests/report5/harness.html'+(view==='payment'?'?page=payment':''));
 if(view==='booking')await page.getByRole('heading',{name:'Choose Compartment Size'}).waitFor();
 return {page,context,requests};
}
async function run(ids,name,fn){
 const r={ids,name,level:'browser component / API mocked',startedAt:new Date().toISOString(),status:'Passed',actual:[],evidence:[]};
 try{await fn(r);}catch(e){r.status='Failed';r.error=e.message;}finally{r.finishedAt=new Date().toISOString();results.push(r);await fs.writeFile(path.join(out,'frontend-round1.json'),JSON.stringify(results,null,2));console.log(`${r.status} ${ids.join(',')} ${name}: ${r.error||r.actual.join('; ')}`);}
}
async function submit(t,h){await t.page.getByRole('button',{name:'Continue to Payment'}).click();await t.page.waitForFunction(()=>window.__report5Navigation);const q=t.requests.at(-1);assert.equal((Date.parse(q.endAt)-Date.parse(q.startAt))/3600000,h);return q;}
async function custom(value,r){const t=await pageFor();try{await t.page.getByRole('button',{name:'Custom',exact:true}).click();const input=t.page.getByPlaceholder('Hours');if(value==='abc'){await input.pressSequentially('abc');await input.fill('');}else await input.fill(value);await input.press('Enter');const h=Number(await input.inputValue());await submit(t,h);r.actual.push(`input=${JSON.stringify(value)} normalized=${h}; ISO interval=${h}h`);return h;}finally{await t.context.close();}}

await run(['UT-BP02-01'],'custom 6 hours',async r=>assert.equal(await custom('6',r),6));
await run(['UT-BP02-02'],'clamp 0 and 73',async r=>{assert.equal(await custom('0',r),1);assert.equal(await custom('73',r),72);});
await run(['UT-BP02-03'],'empty and nonnumeric number input',async r=>{assert.equal(await custom('',r),1);assert.equal(await custom('abc',r),1);});
await run(['FT-BP02-01'],'preset 3 and 6 hours',async r=>{for(const h of [3,6]){const t=await pageFor();try{await t.page.getByRole('button',{name:`${h} Hours`,exact:true}).click();await t.page.getByText(`Duration: ${h} Hours`,{exact:true}).waitFor();await submit(t,h);r.actual.push(`display=${h}h; submitted ISO interval=${h}h`);}finally{await t.context.close();}}});
await run(['FT-BP02-02'],'custom boundaries 1 and 72 hours',async r=>{assert.equal(await custom('1',r),1);assert.equal(await custom('72',r),72);});
await run(['FT-BP02-03'],'custom invalid values',async r=>{for(const [v,h] of [['',1],['abc',1],['0',1],['-1',1],['73',72]])assert.equal(await custom(v,r),h);});
await run(['FT-BP01-01'],'supported sizes retain selection',async r=>{const t=await pageFor();try{for(const [label,size] of [['Small (S)','S'],['Medium (M)','M'],['Large (L)','L']]){await t.page.getByRole('heading',{name:label,exact:true}).click();await submit(t,3);await t.page.waitForTimeout(50);assert.equal(t.requests.at(-1).size,size);r.actual.push(`selected=${size}; request.size=${size}`);}await t.page.screenshot({path:path.join(out,'sizes-component.png'),fullPage:true});r.evidence.push('sizes-component.png');}finally{await t.context.close();}});
await run(['UT-BP11-04'],'server-issued access code and missing credential',async r=>{const errors=[];for(const accessCode of ['TESTA123',null]){const t=await pageFor({view:'payment',payment:{accessCode}});try{await t.page.getByRole('button',{name:'Kiểm tra ngay'}).click();await t.page.getByText('729 416',{exact:true}).waitFor();const text=await t.page.locator('body').innerText();r.actual.push(`server accessCode ${accessCode?'present':'absent'} -> UI static 729 416`);const image=`credential-${accessCode?'present':'absent'}.png`;await t.page.screenshot({path:path.join(out,image),fullPage:true});r.evidence.push(image);if(accessCode&&!text.includes(accessCode))errors.push('real accessCode not displayed');if(text.includes('729 416'))errors.push('fabricated static code displayed');}finally{await t.context.close();}}assert.equal(errors.length,0,errors.join('; '));});
// Supplementary observations are not automatically counted as complete functional cases.
await run([],'PRICE-B UI estimate observation',async r=>{const t=await pageFor({prices:{priceS:30000}});try{await t.page.getByRole('button',{name:'Custom',exact:true}).click();await t.page.getByPlaceholder('Hours').fill('2');await t.page.getByPlaceholder('Hours').press('Enter');await t.page.getByText('60,000 VND',{exact:true}).first().waitFor();r.actual.push('PRICE-B unit amount=30000, 2h UI=60000; backend pricing test expects 30000 for 2h block. UI DTO has no block duration.');await t.page.screenshot({path:path.join(out,'price-block-mismatch.png'),fullPage:true});r.evidence.push('price-block-mismatch.png');}finally{await t.context.close();}});
await browser.close();
