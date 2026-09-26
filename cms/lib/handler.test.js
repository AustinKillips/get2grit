import {test} from 'node:test';import assert from 'node:assert/strict';import handler from '../api/handler.js';import {seal} from './security.js';
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(v){this.body=v},end(){}}}
process.env.CMS_ORIGIN='https://editor.example';process.env.GITHUB_CLIENT_ID='test';process.env.GITHUB_CLIENT_SECRET='test';process.env.SESSION_SECRET='aa'.repeat(32);
test('anonymous reads and writes are denied',async()=>{for(const method of ['GET','POST']){const res=response();await handler({url:'/api/content',method,headers:{}},res);assert.equal(res.statusCode,401)}});
test('cross-origin writes rejected before GitHub access',async()=>{const res=response(),value=seal({token:'test',exp:Date.now()+10000},process.env.SESSION_SECRET);await handler({url:'/api/content',method:'POST',headers:{cookie:`grit_session=${value}`,origin:'https://bad.example','x-grit-editor':'1'}},res);assert.equal(res.statusCode,403)});
test('callback rejects missing or mismatched OAuth state',async()=>{const res=response();await handler({url:'/api/callback?code=test&state=wrong',method:'GET',headers:{}},res);assert.equal(res.statusCode,403)});
test('stale revisions never write',async()=>{const original=global.fetch;let calls=0;global.fetch=async()=>({ok:true,json:async()=>++calls===1?{permissions:{push:true}}:{object:{sha:'new'}}});try{const res=response(),value=seal({token:'test',exp:Date.now()+10000},process.env.SESSION_SECRET);await handler({url:'/api/content',method:'POST',headers:{cookie:`grit_session=${value}`,origin:'https://editor.example','x-grit-editor':'1'},body:{revision:'old',schedule:[],rides:[],raffle:{prizes:[]},copy:{pages:{},coaches:{}}}},res);assert.equal(res.statusCode,409);assert.equal(calls,2)}finally{global.fetch=original}});

test('repository permission check uses canonical URL and loads editor data',async()=>{
 const original=global.fetch;const urls=[];
 global.fetch=async(url)=>{urls.push(url);assert.ok(!url.endsWith('/'));let body;
 if(url==='https://api.github.com/repos/AustinKillips/get2grit')body={permissions:{push:true}};
 else if(url.includes('git/ref/'))body={object:{sha:'head'}};
 else {const files={'content-data.js':'window.GRIT_CONTENT = {"schedule":[]};','raffle-data.js':'window.GRIT_RAFFLE = {"prizes":[]};','rides-data.js':'window.GRIT_RIDES = [];','site-copy-data.js':'window.GRIT_COPY = {"pages":{},"coaches":{}};'};const name=url.split('/contents/')[1].split('?')[0];body={content:Buffer.from(files[name]).toString('base64')}}
 return {ok:true,json:async()=>body};};
 try{const res=response(),value=seal({token:'test',exp:Date.now()+10000},process.env.SESSION_SECRET);await handler({url:'/api/content',method:'GET',headers:{cookie:`grit_session=${value}`}},res);assert.equal(res.statusCode,200);assert.equal(res.body.revision,'head');assert.deepEqual(res.body.schedule,[]);assert.equal(urls.length,6)}finally{global.fetch=original}
});
