import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const require=createRequire(process.env.HUNG_NODE_PACKAGES+'/package.json');
const {chromium}=require('playwright');
const api=process.env.HUNG_API_URL||'http://127.0.0.1:5001';
const front=process.env.HUNG_FRONTEND_URL||'http://127.0.0.1:5187';
const report={checkedAt:new Date().toISOString(),uc:'T21',level:'Dev-based merge candidate; actual API, SQL and production React components; no HTTP mocks',checks:[]};
async function call(path,token,method='GET',body,expected=200){
 const response=await fetch(api+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 assert.equal(response.status,expected,`${method} ${path}: expected ${expected}, actual ${response.status}`);
 const text=await response.text();return text?JSON.parse(text):null;
}
let browser;
try{
 const traveler=(await call('/api/auth/login',null,'POST',{email:process.env.HUNG_TRAVELER_EMAIL,password:process.env.HUNG_TRAVELER_PASSWORD})).data.accessToken;
 const admin=(await call('/api/admin/auth/login',null,'POST',{email:process.env.HUNG_ADMIN_EMAIL,password:process.env.HUNG_ADMIN_PASSWORD})).data.token;
 const items=(await call('/api/Bookings/my?page=1&pageSize=100',traveler)).data.items;
 let booking,support;
 for(const item of items.filter(item=>['COMPLETED','COMPLETED_MANUAL'].includes(item.status))){
  const state=await call('/api/bookings/'+item.id+'/support',traveler);
  if(state.review?.comment?.startsWith('[TEST UC-T21]')){booking=item;support=state;break;}
 }
 assert.ok(booking,'An existing authorized TEST review is required; this runner creates no review.');
 const detail=(await call('/api/Bookings/'+booking.id,traveler)).data;
 const stationId=detail.stationId;assert.ok(stationId);
 const base='/api/bookings/'+booking.id+'/support';
 await call(base+'/review',traveler,'POST',{stars:3,comment:'[TEST duplicate rejection]',criteria:[]},409);
 for(const stars of [0,6])await call(base+'/review',traveler,'POST',{stars,comment:'[TEST validation]',criteria:[]},400);
 await call(base+'/review',traveler,'POST',{stars:3,criteria:['UNKNOWN']},400);
 const stored=items.find(item=>item.status==='STORED');assert.ok(stored);
 await call('/api/bookings/'+stored.id+'/support/review',traveler,'POST',{stars:3,criteria:[]},400);
 await call(base,admin,'GET',null,404);
 await call('/api/admin/traveler-support/ratings',traveler,'GET',null,403);
 report.checks.push({name:'Actual duplicate, validation, checkout and owner/role guards',status:'PASS'});
 const station=(await call('/api/Stations/'+stationId,null)).data;
 const ratings=await call('/api/admin/traveler-support/ratings',admin);
 const rating=ratings.find(item=>item.stationId===stationId);assert.ok(rating);
 assert.equal(station.ratingCount,rating.count);assert.equal(station.ratingAverage,rating.average);
 report.checks.push({name:'Actual public/staff aggregates agree with persisted review',status:'PASS',count:rating.count,average:rating.average});
 browser=await chromium.launch({channel:'msedge',headless:true});
 async function ui(name,token,query,test){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(token=>localStorage.setItem('smartlocker_token',token),token);
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{await page.goto(front+'/tests/hung/uc-t21.html?'+query);await test(page);assert.deepEqual(errors,[]);report.checks.push({name,status:'PASS'});}finally{await context.close();}
 }
 await ui('Production booking detail shows stored review and prevents duplicate form',traveler,'id='+booking.id,async page=>{
  await page.getByText('Đánh giá đã gửi: '+support.review.stars+'/5',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Gửi đánh giá',exact:true}).count(),0);
 });
 await ui('Manually completed booking remains accessible in production history',traveler,'view=history',async page=>{
  await page.getByRole('button',{name:/Past History/}).click();
  await page.getByText(booking.bookingCode,{exact:false}).first().waitFor();
 });
 await ui('Production station page replaces fixed rating with actual aggregate',traveler,'view=station&id='+stationId,async page=>{
  await page.getByText(rating.count+' lượt đánh giá',{exact:true}).waitFor();
  assert.ok(!(await page.locator('body').innerText()).includes('2.4k bookings'));
 });
 await ui('Staff production summary uses actual station scores',admin,'view=ratings',async page=>{
  await page.getByText(rating.average.toFixed(1)+'/5',{exact:true}).first().waitFor();
 });
 const after=await call(base,traveler);assert.deepEqual(after.review,support.review);
 report.checks.push({name:'Existing TEST review unchanged throughout merge-candidate verification',status:'PASS'});
}catch(error){report.error=error.message;process.exitCode=1;}
finally{if(browser)await browser.close();await fs.mkdir('docs/validation',{recursive:true});await fs.writeFile('docs/validation/uc-t21-actual.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
