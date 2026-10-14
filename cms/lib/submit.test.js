import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../editor/submit-source.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
async function submitBatch(failAt=-1){
 let submit;const calls=[],status={},progress={},controls=[{disabled:false}];
 const files=['first.mp4','second.mp4'].map(name=>({name,type:'video/mp4',size:10}));
 const form={elements:Object.assign(controls,{challenge:{}}),media:{files,value:'selected'},consent:{checked:true},reportValidity:()=>true,addEventListener:(event,fn)=>{submit=fn}};
 let id=0;
 const context={document:{querySelector:s=>s==='form'?form:s==='#status'?status:s==='progress'?progress:{}},populateChallenges:()=>{},fetch:async()=>({ok:true,json:async()=>({enabled:true,received:true})}),FormData:class{*[Symbol.iterator](){yield ['credit',''];yield ['challenge',''];yield ['alt','Friends riding bikes'];yield ['transcript','Video description']}},crypto:{randomUUID:()=>String(++id)},URLSearchParams,setTimeout,upload:async(path,file,options)=>{calls.push({file,path,meta:JSON.parse(options.clientPayload)});if(calls.length-1===failAt)throw Error('Network error');options.onUploadProgress({percentage:100})}};
 vm.runInNewContext(source,context);await submit({preventDefault(){}});return {calls,status,progress,form,controls};
}
test('batch uploads each selected file with unique IDs and optional metadata',async()=>{const r=await submitBatch();assert.equal(r.calls.length,2);assert.notEqual(r.calls[0].meta.id,r.calls[1].meta.id);assert.equal(r.calls[0].meta.credit,'');assert.equal(r.calls[0].meta.challenge,'');assert.match(r.status.textContent,/2 of 2 files received/);assert.equal(r.progress.value,100);assert.equal(r.form.media.value,'');assert.equal(r.controls[0].disabled,false)});
test('a failed file does not prevent other files uploading and retry report names it',async()=>{const r=await submitBatch(0);assert.equal(r.calls.length,2);assert.match(r.status.textContent,/1 of 2 files received/);assert.match(r.status.textContent,/first.mp4: Network error/);assert.equal(r.controls[0].disabled,false)});
