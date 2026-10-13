import {upload} from '@vercel/blob/client';
const form=document.querySelector('form'),status=document.querySelector('#status'),progress=document.querySelector('progress');
fetch('/api/gallery/status').then(r=>r.json()).then(data=>{form.hidden=!data.enabled;status.textContent=data.enabled?'Ready when you are. Nothing is published automatically.':'Submissions aren’t open yet. Please check back soon.'}).catch(()=>status.textContent='Couldn’t connect. Please refresh to try again.');
async function photo(file){
 const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});const ratio=Math.min(1,1800/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.84));if(!blob)throw Error('Couldn’t prepare this photo. Try a JPEG or PNG.');return new File([blob],'photo.webp',{type:'image/webp'});
}
form.addEventListener('submit',async e=>{
 e.preventDefault();if(!form.reportValidity())return;const button=form.querySelector('button');button.disabled=true;progress.hidden=false;progress.value=0;
 try{
  const data=Object.fromEntries(new FormData(form));let file=form.media.files[0];const isImage=file.type.startsWith('image/');
  if(file.size>(isImage?25:50)*1024*1024)throw Error('That file is too large. Choose a smaller file.');
  status.textContent=isImage?'Preparing your photo…':'Preparing your video…';if(isImage)file=await photo(file);
  const extensions={'image/webp':'webp','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'};if(!extensions[file.type])throw Error('Please choose a supported photo or video.');
  if(!isImage&&!data.transcript.trim())throw Error('Please add a video description or transcript.');
  delete data.media;data.consent=form.consent.checked;data.mime=file.type;data.id=crypto.randomUUID();data.receipt=crypto.randomUUID();
  status.textContent='Uploading privately…';await upload('incoming/'+data.id+'.'+extensions[file.type],file,{access:'private',handleUploadUrl:'/api/gallery/upload',clientPayload:JSON.stringify(data),multipart:file.size>5*1024*1024,onUploadProgress:e=>{progress.value=e.percentage}});
  status.textContent='Upload complete. Confirming receipt…';
  let received=false;
  for(let attempt=0;attempt<20;attempt++){
   const response=await fetch('/api/gallery/receipt?'+new URLSearchParams({id:data.id,receipt:data.receipt}));
   if(response.ok&&(await response.json()).received){received=true;break}
   await new Promise(resolve=>setTimeout(resolve,1500));
  }
  if(!received){status.textContent='Your file uploaded, but confirmation is delayed. Please do not upload it again yet. Reference: '+data.id;form.media.value='';return}
  status.textContent='Upload received! It will appear only after our crew reviews it. You can send another below.';form.media.value='';progress.value=100;
 }catch(e){status.textContent=e.message||'Upload failed. Please try again.'}finally{button.disabled=false;}
});
