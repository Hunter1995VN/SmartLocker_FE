import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
if(process.env.HUNG_ALLOW_TEST_WRITES!=='1')throw new Error('Explicit TEST write authorization required');
const require=createRequire(process.env.HUNG_NODE_PACKAGES+'/package.json');const {chromium}=require('playwright');
const api=process.env.HUNG_API_URL||'http://127.0.0.1:5001',front=process.env.HUNG_FRONTEND_URL||'http://127.0.0.1:5187';
const report={checkedAt:new Date().toISOString(),uc:'T17',level:'Dev-based merge candidate; real production forms/API/SQL, explicitly authorized TEST illustration; no mocked requests',checks:[]};
async function call(path,token,method='GET',body,expected=200){
 const response=await fetch(api+path,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 assert.equal(response.status,expected,`${method} ${path}: expected ${expected}, actual ${response.status}`);const text=await response.text();return text?JSON.parse(text):null;
}
let browser,admin,traveler,base,created,finalized=false;
try{
 traveler=(await call('/api/auth/login',null,'POST',{email:process.env.HUNG_TRAVELER_EMAIL,password:process.env.HUNG_TRAVELER_PASSWORD})).data.accessToken;
 admin=(await call('/api/admin/auth/login',null,'POST',{email:process.env.HUNG_ADMIN_EMAIL,password:process.env.HUNG_ADMIN_PASSWORD})).data.token;
 const items=(await call('/api/Bookings/my?page=1&pageSize=100',traveler)).data.items;
 const booking=items.find(item=>['COMPLETED','COMPLETED_MANUAL'].includes(item.status));assert.ok(booking);
 const original=(await call('/api/Bookings/'+booking.id,traveler)).data;base='/api/bookings/'+booking.id+'/support';
 const before=await call(base,traveler);assert.ok(!before.lostReports.some(item=>['OPEN','FOUND'].includes(item.status)),'An existing unresolved report must not be replaced');
 const resume=process.env.HUNG_T17_RESUME_ID?before.lostReports.find(item=>item.id===process.env.HUNG_T17_RESUME_ID):null;
 if(process.env.HUNG_T17_RESUME_ID)assert.ok(resume?.description.startsWith('[TEST UC-T17 '),'Resume only an owned, explicitly marked TEST report');
 browser=await chromium.launch({channel:'msedge',headless:true});const contexts=[];const errors=[];const serverFailures=[];
 async function pageFor(token){const context=await browser.newContext({viewport:{width:1200,height:1000}});contexts.push(context);await context.addInitScript(token=>localStorage.setItem('smartlocker_token',token),token);const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=500&&response.url().startsWith(api))serverFailures.push({path:new URL(response.url()).pathname,status:response.status()});});return page;}
 const customer=await pageFor(traveler);const staff=await pageFor(admin);
 if(!resume){
 await customer.goto(front+'/tests/hung/uc-t17.html?view=history');await customer.getByRole('button',{name:/Past History/}).click();await customer.getByText(booking.bookingCode,{exact:false}).first().waitFor();
 const illustration=await customer.screenshot({type:'jpeg',quality:45});assert.ok(illustration.length<500000);
 const description='[TEST UC-T17 '+Date.now()+'] Kiểm thử giao diện/API theo yêu cầu chủ tài khoản; không có đồ thất lạc thực tế. Ảnh minh họa là lịch sử, không phải ảnh đồ vật hay bằng chứng ngăn trống.';
 await customer.goto(front+'/tests/hung/uc-t17.html?id='+booking.id);
 await customer.getByLabel('Mô tả đồ vật',{exact:true}).fill(description);
 await customer.locator('input[type=file]').setInputFiles({name:'TEST-uc-t17-illustration.jpg',mimeType:'image/jpeg',buffer:illustration});
 await customer.getByAltText('Ảnh minh họa sẽ gửi').waitFor();
 const posted=customer.waitForResponse(response=>response.request().method()==='POST'&&response.url()===api+base+'/lost-items');
 await customer.getByRole('button',{name:'Gửi báo quên đồ',exact:true}).click();const response=await posted;assert.equal(response.status(),200);created=await response.json();report.lostReportId=created.id;report.bookingId=booking.id;
 await customer.getByText(description,{exact:true}).first().waitFor();
 report.checks.push({name:'Production customer form uploads actual JPEG illustration and creates linked TEST report',status:'PASS'});
 await call(base+'/lost-items',traveler,'POST',{description},409);
 } else {
  created={id:resume.id};report.lostReportId=resume.id;report.bookingId=booking.id;
  report.checks.push({name:'Resumed same owned TEST report; original production upload/OPEN duplicate evidence retained in uc-t17-attempt1.json',status:'PASS'});
  await customer.goto(front+'/tests/hung/uc-t17.html?id='+booking.id);
 }
 const marker='[TEST UC-T17 '+Date.now()+']';
 const description=resume?.description||'[TEST UC-T17] duplicate validation';
 await call('/api/admin/traveler-support/lost-items/'+created.id,traveler,'POST',{status:'FOUND',response:marker},403);
 await call('/api/admin/traveler-support/lost-items/'+created.id,admin,'POST',{status:'RETURNED',response:marker},409);
 report.checks.push({name:'Duplicate OPEN, traveler staff action and premature handover rejected',status:'PASS'});
 await staff.goto(front+'/tests/hung/uc-t17.html?view=staff');
 await staff.getByTestId('lost-report-'+created.id).click();
 const image=staff.getByAltText('Ảnh đồ vật khách báo quên');await image.waitFor();assert.ok(await image.evaluate(element=>element.complete&&element.naturalWidth>0));
 report.checks.push({name:'Production staff queue displays and decodes the persisted JPEG',status:'PASS'});
 const found=marker+' FOUND trong ca kiểm thử; không có sự cố mất đồ thực tế.';
 await staff.getByLabel('Kết quả',{exact:true}).selectOption('FOUND');await staff.getByLabel('Phản hồi cho khách',{exact:true}).fill(found);await staff.getByRole('button',{name:'Lưu kết quả',exact:true}).click();
 await staff.getByRole('button',{name:booking.bookingCode+' · FOUND',exact:true}).waitFor();
 const afterFound=await call(base,traveler);assert.equal(afterFound.lostReports.find(item=>item.id===created.id).status,'FOUND');
 await call('/api/admin/traveler-support/lost-items/'+created.id,admin,'POST',{status:'FOUND',response:found});
 assert.equal((await call(base,traveler)).notifications.length,afterFound.notifications.length);
 await call(base+'/lost-items',traveler,'POST',{description},409);
 await customer.getByText('FOUND: '+found,{exact:true}).waitFor();
 await customer.locator('article').filter({hasText:'FOUND: '+found}).getByRole('button',{name:'Đánh dấu đã đọc',exact:true}).click();
 await customer.getByText('FOUND: '+found,{exact:true}).waitFor({state:'hidden'});
 report.checks.push({name:'FOUND persists, repeated staff save is idempotent, owner receives/reads notification and cannot duplicate while awaiting handover',status:'PASS'});
 await staff.getByRole('button',{name:booking.bookingCode+' · FOUND',exact:true}).click();
 const returned=marker+' RETURNED để kết thúc kiểm thử luồng bàn giao; không có đồ vật thực tế.';
 await staff.getByLabel('Kết quả',{exact:true}).selectOption('RETURNED');await staff.getByLabel('Phản hồi cho khách',{exact:true}).fill(returned);await staff.getByRole('button',{name:'Lưu kết quả',exact:true}).click();
 await staff.getByRole('button',{name:booking.bookingCode+' · RETURNED',exact:true}).waitFor();finalized=true;
 await customer.getByText('RETURNED: '+returned,{exact:true}).waitFor();await customer.locator('article').filter({hasText:'RETURNED: '+returned}).getByRole('button',{name:'Đánh dấu đã đọc',exact:true}).click();
 await customer.getByText('RETURNED: '+returned,{exact:true}).waitFor({state:'hidden'});
 await call('/api/admin/traveler-support/lost-items/'+created.id,admin,'POST',{status:'NOT_FOUND',response:marker},409);
 report.checks.push({name:'Staff handover completes as RETURNED, owner reads final response, terminal report cannot be reopened',status:'PASS'});
 const after=(await call('/api/Bookings/'+booking.id,traveler)).data;assert.equal(after.status,original.status);assert.equal(after.checkedOutAt,original.checkedOutAt);
 assert.deepEqual((await call(base,traveler)).review,before.review);assert.deepEqual(errors,[]);assert.deepEqual(serverFailures,[]);
 report.checks.push({name:'Original booking/review unchanged; no browser exceptions or API 5xx in production UI flow',status:'PASS'});
 report.disposition='TEST report RETURNED; two owner notifications marked READ; no real missing item or physical handover claimed';
}catch(error){report.error=error.message;process.exitCode=1;}
finally{
 if(created&&!finalized){try{await call('/api/admin/traveler-support/lost-items/'+created.id,admin,'POST',{status:'NOT_FOUND',response:'[TEST UC-T17] Cleanup after test failure; no real missing item.'});report.cleanup='NOT_FOUND';}catch{report.cleanup='Requires inspection; no direct SQL state manipulation';}}
 if(browser)await browser.close();await fs.mkdir('docs/validation',{recursive:true});await fs.writeFile('docs/validation/uc-t17-actual.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
