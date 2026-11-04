import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import ts from 'typescript';
try{process.loadEnvFile('.env.local');}catch{}
const moduleUrl=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const source=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8').replaceAll('import "server-only";','');
const validationUrl=moduleUrl(source('lib/validation.ts').replace('"zod"',JSON.stringify(import.meta.resolve('zod'))));
const validation=await import(validationUrl);
test('input validation rejects forged ownership and unsafe status changes',()=>{
 const good={name:'QA Seller',phone:'08000000000',address:'Fictional test address',draft:true};assert.equal(validation.orderInput.safeParse(good).success,true);
 assert.equal(validation.orderInput.safeParse({...good,owner_id:'someone-else'}).success,false);
 assert.equal(validation.orderInput.safeParse({...good,verification:'live'}).success,false);
 assert.equal(validation.allowedTransition('Awaiting check','Dispatched'),false);assert.equal(validation.allowedTransition('Ready to dispatch','Dispatched'),true);assert.equal(validation.allowedTransition('Dispatched','Delivered'),true);
 assert.equal(validation.safeReturnPath('//evil.example'),'/dashboard');assert.equal(validation.safeReturnPath('/dashboard'),'/dashboard');
});
test('database-backed ownership, versions, lifecycle and request limits',{skip:!process.env.DATABASE_URL},async()=>{
 const dbUrl=moduleUrl(source('lib/db.ts').replace('"@neondatabase/serverless"',JSON.stringify(import.meta.resolve('@neondatabase/serverless'))));
 const authUrl=moduleUrl('export const getAuth=()=>({getSession:async()=>({data:globalThis.__deliverypassTestSession??null})});');
 const secUrl=moduleUrl(source('lib/security.ts').replace('"zod"',JSON.stringify(import.meta.resolve('zod'))).replace('@/lib/auth/server',authUrl).replace('@/lib/db',dbUrl));
 const deliveryUrl=moduleUrl(source('lib/delivery.ts'));
 const storeUrl=moduleUrl(source('lib/order-store.ts').replace('@/lib/db',dbUrl));
 const checkUrl=moduleUrl(source('lib/check-order.ts').replace('@/lib/security',secUrl).replace('@/lib/validation',validationUrl).replace('@/lib/delivery',deliveryUrl));
 const replace=s=>s.replaceAll('@/lib/security',secUrl).replaceAll('@/lib/db',dbUrl).replaceAll('@/lib/validation',validationUrl).replaceAll('@/lib/order-store',storeUrl).replaceAll('@/lib/check-order',checkUrl);
 const orders=await import(moduleUrl(replace(source('app/api/orders/route.ts'))));const single=await import(moduleUrl(replace(source('app/api/orders/[id]/route.ts'))));const security=await import(secUrl);
 const runId=crypto.randomUUID();const sellerA='qa-owner-a-'+runId,sellerB='qa-owner-b-'+runId;
 const as=id=>{globalThis.__deliverypassTestSession={user:{id,name:'QA Seller',email:'qa@example.com',emailVerified:true}};};
 const request=(body,method='POST',origin=process.env.APP_URL)=>new Request((process.env.APP_URL??'http://127.0.0.1:3000')+'/api/orders',{method,headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const fields={name:'QA Fixture',phone:'08000000000',item:'Synthetic integration test',code:'FC-01-A01-KP-27',address:'Fictional QA address',instructions:'No delivery required',draft:true};
 try{
  globalThis.__deliverypassTestSession=null;assert.equal((await orders.GET()).status,401);
  as(sellerA);assert.equal((await orders.POST(request(fields,'POST','https://evil.example'))).status,403);
  const created=await orders.POST(request(fields));assert.equal(created.status,201);const order=(await created.json()).order;const context={params:Promise.resolve({id:order.id})};
  assert.equal(order.status,'Awaiting check');assert.equal(order.verification,'unchecked');
  const own=(await(await orders.GET()).json()).orders;assert.ok(own.some(o=>o.id===order.id));
  assert.equal((await single.PATCH(request({status:'Dispatched',version:1},'PATCH'),context)).status,409);
  as(sellerB);assert.equal((await single.GET(request({},'POST'),context)).status,404);assert.equal((await single.PUT(request({...fields,version:1},'PUT'),context)).status,404);assert.equal((await single.PATCH(request({status:'Archived',version:1},'PATCH'),context)).status,404);
  assert.equal((await(await orders.GET()).json()).orders.some(o=>o.id===order.id),false);
  as(sellerA);assert.equal((await orders.POST(request({...fields,verification:'live'}))).status,400);
  const edited=await single.PUT(request({...fields,item:'Updated synthetic test',version:1},'PUT'),context);assert.equal(edited.status,200);assert.equal((await edited.json()).order.version,2);
  assert.equal((await single.PUT(request({...fields,version:1},'PUT'),context)).status,409);
  const originalFetch=globalThis.fetch;
  globalThis.fetch=(input,options)=>String(input).startsWith('https://api.postcode.gov.ng/')?Promise.resolve(Response.json({data:{valid:true}})):originalFetch(input,options);
  let ready;try{const response=await orders.POST(request({...fields,draft:false}));assert.equal(response.status,201);ready=(await response.json()).order;}finally{globalThis.fetch=originalFetch;}
  const ctx={params:Promise.resolve({id:ready.id})};
  let r=await single.PATCH(request({status:'Dispatched',version:1},'PATCH'),ctx);assert.equal(r.status,200);
  assert.equal((await single.PATCH(request({status:'Delivered',version:1},'PATCH'),ctx)).status,409);
  assert.equal((await single.PATCH(request({status:'Delivered',version:2},'PATCH'),ctx)).status,200);
  assert.equal((await single.PATCH(request({status:'Archived',version:3},'PATCH'),ctx)).status,200);
  r=await single.PATCH(request({status:'Awaiting check',version:4},'PATCH'),ctx);assert.equal(r.status,200);assert.equal((await r.json()).order.verification,'unchecked');
  await security.rateLimit('qa-rate',runId,2,60);await security.rateLimit('qa-rate',runId,2,60);await assert.rejects(()=>security.rateLimit('qa-rate',runId,2,60),e=>e.status===429);
 }finally{globalThis.__deliverypassTestSession=null;}
});
