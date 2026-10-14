import {populateChallenges} from './challenge-select.js';
import {upload} from '@vercel/blob/client';
const form=document.querySelector('form'),status=document.querySelector('#status'),progress=document.querySelector('progress');
populateChallenges(form.elements.challenge,document.querySelector('#challenge-task'));
fetch('/api/gallery/status').then(r=>r.json()).then(data=>{form.hidden=!data.enabled;status.textContent=data.enabled?'ALL CONTENT SUBJECT TO REVIEW BEFORE BEING PUBLISHED':'Submissions aren’t open yet. Please check back soon.'}).catch(()=>status.textContent='Couldn’t connect. Please refresh to try again.');
async function photo(file){
 const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});const ratio=Math.min(1,1800/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.84));if(!blob)throw Error('Couldn’t prepare this photo. Try a JPEG or PNG.');return new File([blob],'photo.webp',{type:'image/webp'});
}
form.addEventListener('submit',async e=>{
 e.preventDefault();if(!form.reportValidity())return;
 const files=Array.from(form.media.files),data=Object.fromEntries(new FormData(form));delete data.media;data.consent=form.consent.checked;
 const extensions={'image/webp':'webp','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'};
 // Validate the whole selection before sending anything.
 for(const file of files){
  if(!['image/jpeg','image/png',...Object.keys(extensions)].includes(file.type)){status.textContent=file.name+': unsupported file type.';return}
  if(file.size>(file.type.startsWith('image/')?25:50)*1024*1024){status.textContent=file.name+': file is too large.';return}
  if(file.type.startsWith('video/')&&!data.transcript.trim()){status.textContent='Please add a video description or transcript.';return}
 }
 const controls=[...form.elements];controls.forEach(el=>el.disabled=true);progress.hidden=false;progress.value=0;
 let received=0;const delayed=[],failed=[];
 try{
  for(const [index,original] of files.entries()){
   let uploaded=false;const item={...data,id:crypto.randomUUID(),receipt:crypto.randomUUID()};
   try{
    status.textContent='Preparing '+(index+1)+' of '+files.length+': '+original.name;
    const file=original.type.startsWith('image/')?await photo(original):original;item.mime=file.type;
    status.textContent='Uploading '+(index+1)+' of '+files.length+': '+original.name;
    await upload('incoming/'+item.id+'.'+extensions[file.type],file,{access:'private',handleUploadUrl:'/api/gallery/upload',clientPayload:JSON.stringify(item),multipart:file.size>5*1024*1024,onUploadProgress:event=>{progress.value=(index+event.percentage/100)/files.length*100}});
    uploaded=true;let confirmed=false;
    status.textContent='Confirming '+(index+1)+' of '+files.length+'…';
    for(let attempt=0;attempt<20;attempt++){
     const response=await fetch('/api/gallery/receipt?'+new URLSearchParams({id:item.id,receipt:item.receipt}));
     if(response.ok&&(await response.json()).received){confirmed=true;break}
     await new Promise(resolve=>setTimeout(resolve,1500));
    }
    if(confirmed)received++;else delayed.push(original.name+' (reference '+item.id+')');
   }catch(error){if(uploaded)delayed.push(original.name+' (reference '+item.id+')');else failed.push(original.name+': '+(error.message||'Upload failed'))}
   progress.value=(index+1)/files.length*100;
  }
  status.textContent=received+' of '+files.length+' files received for review.'+(delayed.length?' Uploaded but confirmation is delayed; do not resend: '+delayed.join('; ')+'.':'')+(failed.length?' Please reselect only these failed files to retry: '+failed.join('; ')+'.':'');
  form.media.value='';
 }finally{controls.forEach(el=>el.disabled=false)}
});
