import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const asModule=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const modelUrl=asModule(readFileSync(new URL('../lib/delivery.ts',import.meta.url),'utf8'));
const {normalizeCode,wellFormed,searchQuery,suggestionCode}=await import(modelUrl);
const securityUrl=asModule('export async function currentUser(){return {id:"unit-test-seller"}};export async function rateLimit(){};export function apiError(){return Response.json({error:"Denied"},{status:401})}');
const routeSource=readFileSync(new URL('../app/api/postcode/route.ts',import.meta.url),'utf8').replace('@/lib/delivery',modelUrl).replace('@/lib/security',securityUrl);
const {GET}=await import(asModule(routeSource));
const request=query=>new Request('http://localhost/api/postcode?'+query);

test('normalizes human-entered postcodes and rejects legacy or malformed codes',()=>{
 assert.equal(normalizeCode('la 11 w06 tc 10'),'LA-11-W06-TC-10');
 assert.equal(wellFormed(normalizeCode('la11w06tc10')),true);
 assert.equal(wellFormed('100001'),false);
 assert.equal(wellFormed('LA-11-W06-TC-1'),false);
});
test('autocomplete formats partial queries and retains segment context',()=>{
 assert.equal(searchQuery('FC-01-A'),'FC 01 A');
 assert.equal(searchQuery('FC01A01'),'FC 01 A01');
 assert.equal(suggestionCode('F','state','FC'),'FC ');
 assert.equal(suggestionCode('FC 0','lga','01'),'FC 01 ');
 assert.equal(suggestionCode('FC 01 A','district','A01'),'FC 01 A01 ');
 assert.equal(suggestionCode('FC 01 A01 K','area','KP'),'FC 01 A01 KP ');
 assert.equal(suggestionCode('FC 01 A01 KP 2','unit','27'),'FC-01-A01-KP-27');
 assert.equal(suggestionCode('FC 01 A','district','FC 01 A01'),'FC 01 A01 ');
 assert.equal(suggestionCode('FC 01 A','district','LA 01 A01'),null);
 assert.equal(suggestionCode('F','state','<script>'),null);
});
test('demo and live route behaviour', async t=>{
 const originalKey=process.env.POSTCODE_API_KEY;
 const originalFetch=globalThis.fetch;
 t.after(()=>{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.POSTCODE_API_KEY;else process.env.POSTCODE_API_KEY=originalKey;});
 delete process.env.POSTCODE_API_KEY;
 globalThis.fetch=()=>{throw Error('Demo must not contact upstream');};
 await t.test('demo results remain explicitly labelled',async()=>{
  const response=await GET(request('code=la11w06tc10'));const data=await response.json();
  assert.equal(response.status,200);assert.equal(data.valid,true);assert.equal(data.mode,'demo');assert.equal(data.code,'LA-11-W06-TC-10');
  const missing=await GET(request('code=LA-99-Z99-ZZ-99'));assert.equal((await missing.json()).valid,false);
 });
 await t.test('malformed code returns a useful client error',async()=>{const response=await GET(request('code=100001'));assert.equal(response.status,400);assert.match((await response.json()).error,/full postcode/);});
 await t.test('search returns only matching fixture codes',async()=>{const data=await (await GET(request('action=search&q=FC03'))).json();assert.equal(data.suggestions.length,1);assert.equal(data.suggestions[0].code,'FC-03-B06-AG-12');});
 await t.test('NIPOST test credentials report sandbox while reaching the API',async()=>{
  process.env.POSTCODE_API_KEY='nipost_test_placeholder';
  const config=await(await GET(request('action=config'))).json();assert.equal(config.mode,'sandbox');
  globalThis.fetch=async(url,options)=>{assert.equal(url.searchParams.get('code'),'FC-01-A01-KP-27');assert.equal(options.headers['X-API-Key'],'nipost_test_placeholder');return Response.json({data:{valid:true}});};
  const result=await(await GET(request('code=FC01A01KP27'))).json();assert.equal(result.mode,'sandbox');assert.equal(result.valid,true);assert.equal(result.code,'FC-01-A01-KP-27');
 });
 await t.test('a rejected sandbox request never becomes a demo success',async()=>{
  globalThis.fetch=async()=>new Response('',{status:403});
  const response=await GET(request('code=LA11W06TC10'));const data=await response.json();assert.equal(response.status,502);assert.equal(data.mode,'sandbox');assert.equal(data.valid,undefined);
 });
 process.env.POSTCODE_API_KEY='test-only-placeholder';
 await t.test('live lookup uses the documented host, server header, and free L1',async()=>{
  globalThis.fetch=async(url,options)=>{assert.equal(url.origin,'https://api.postcode.gov.ng');assert.equal(url.pathname,'/v1/lookup');assert.equal(url.searchParams.get('level'),'1');assert.equal(options.headers['X-API-Key'],'test-only-placeholder');return Response.json({data:{valid:true}});};
  const data=await (await GET(request('code=LA11W06TC10'))).json();assert.equal(data.mode,'live');assert.equal(data.valid,true);assert.equal(JSON.stringify(data).includes('test-only-placeholder'),false);
 });
 await t.test('validity false is not promoted to validated',async()=>{globalThis.fetch=async()=>Response.json({data:{valid:false}});const data=await(await GET(request('code=LA11W06TC10'))).json();assert.equal(data.valid,false);assert.equal(data.mode,'live');});
 await t.test('live search normalizes code results',async()=>{globalThis.fetch=async()=>Response.json({data:[{postcode:'LA11W06TC10'},{code:'bad'}]});const data=await(await GET(request('action=search&q=LA'))).json();assert.deepEqual(data.suggestions,[{code:'LA-11-W06-TC-10',label:'Select postcode'}]);});
 await t.test('documented autocomplete envelope preserves partial suggestions and labels',async()=>{
  globalThis.fetch=async url=>{assert.equal(url.searchParams.get('q'),'FC 01 A');return Response.json({data:{segment:'district',suggestions:[{code:'A01',label:'Example district'}]}});};
  const data=await(await GET(request('action=search&q=FC01A'))).json();assert.deepEqual(data.suggestions,[{code:'FC 01 A01 ',label:'Example district'}]);
 });
 await t.test('upstream permission errors do not fall back to sample data',async()=>{globalThis.fetch=async()=>new Response('',{status:403});const response=await GET(request('code=LA11W06TC10'));const data=await response.json();assert.equal(response.status,502);assert.equal(data.mode,'live');assert.equal(data.valid,undefined);assert.match(data.error,/access was refused/);});
 await t.test('upstream malformed response fails closed',async()=>{globalThis.fetch=async()=>Response.json({data:{valid:'true'}});const response=await GET(request('code=LA11W06TC10'));assert.equal(response.status,502);});
 await t.test('network errors do not fall back to sample data',async()=>{globalThis.fetch=async()=>{throw Error('network');};const response=await GET(request('code=LA11W06TC10'));assert.equal(response.status,502);assert.equal((await response.json()).mode,'live');});
});
