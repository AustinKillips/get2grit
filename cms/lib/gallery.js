import {createHash,randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import * as blobStore from '@vercel/blob';
import {handleUpload as blobUpload} from '@vercel/blob/client';
const types={'image/webp':'webp','image/jpeg':'jpg','image/png':'png','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'};
export const idOK=id=>typeof id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id);
const fail=(message,status=400)=>Object.assign(Error(message),{status});
export function metadata(value){
 if(!value||typeof value!=='object')throw fail('Missing submission details.');
 const text=(key,max,required=false)=>{if(value[key]!=null&&typeof value[key]!=='string')throw fail('Check '+key+'.');const s=(value[key]||'').trim();if(s.length>max||(required&&!s))throw fail('Check '+key+'.');return s};
 const result={credit:text('credit',100,true),creditUrl:text('creditUrl',300),challenge:text('challenge',300,true),caption:text('caption',600),alt:text('alt',500,true),transcript:text('transcript',4000)};
 if(result.creditUrl){let u;try{u=new URL(result.creditUrl)}catch{throw fail('Invalid credit link.')}if(u.protocol!=='https:'||u.username||u.password)throw fail('Credit links must use HTTPS.');}
 if(value.consent!==true)throw fail('Permission to share is required.');
 return {...result,consent:true};
}
export function recognized(bytes,mime){
 const b=Buffer.from(bytes);
 if(mime==='image/jpeg')return b[0]===255&&b[1]===216&&b[2]===255;
 if(mime==='image/png')return b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 if(mime==='image/webp')return b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP';
 if(mime==='video/webm')return b.subarray(0,4).equals(Buffer.from([26,69,223,163]));
 return ['video/mp4','video/quicktime'].includes(mime)&&b.toString('ascii',4,8)==='ftyp';
}
export function createGalleryService({get=blobStore.get,put=blobStore.put,list=blobStore.list,handleUpload=blobUpload}={}){
const options=()=>({token:process.env.BLOB_READ_WRITE_TOKEN,access:'private'});
async function read(path){const r=await get(path,{...options(),useCache:false});if(!r)return null;return {value:await new Response(r.stream).json(),etag:r.blob.etag};}
async function write(path,value,etag){return put(path,JSON.stringify(value),{...options(),contentType:'application/json',addRandomSuffix:false,...(etag?{ifMatch:etag}:{allowOverwrite:false})});}
async function quota(req){
 const ip=req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown';
 const hash=createHash('sha256').update(process.env.BLOB_READ_WRITE_TOKEN+String(ip)).digest('hex');const path=`quota/${new Date().toISOString().slice(0,10)}/${hash}.json`;
 for(let i=0;i<4;i++){const old=await read(path);if((old?.value.count||0)>=25)throw fail('Daily upload limit reached. Please try tomorrow.',429);try{await write(path,{count:(old?.value.count||0)+1},old?.etag);return}catch(e){if(i===3)throw fail('Please try again in a moment.',429)}}
}
async function records(cursor){const r=await list({token:options().token,prefix:'submissions/',limit:50,cursor});const data=await Promise.all(r.blobs.map(b=>read(b.pathname)));return {items:data.filter(Boolean).map(r=>({...r.value,revision:r.etag})),cursor:r.hasMore?r.cursor:null};}
async function publicGallery(req,res,path){
 const send=(n,x)=>res.status(n).json(x);
 if(path==='/api/gallery/public')res.setHeader('Access-Control-Allow-Origin','*');
 if(path==='/api/gallery/status')return send(200,{enabled:!!process.env.BLOB_READ_WRITE_TOKEN&&process.env.UPLOADS_ENABLED==='true'});
 if(!process.env.BLOB_READ_WRITE_TOKEN){if(path==='/api/gallery/public')return send(200,{items:[]});throw fail('Submissions are not open yet.',503)}
 if(path==='/api/gallery/public'&&req.method==='GET'){
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','public,max-age=30');
  // Only separately indexed approved records are enumerated publicly.
  const result=[];let cursor;
  do{const page=await list({token:options().token,prefix:'published/',limit:100,cursor});for(const b of page.blobs){const r=await read(b.pathname);if(r)result.push(r.value)}cursor=page.hasMore?page.cursor:null}while(cursor&&result.length<1000);
  return send(200,{items:result});
 }
 if(path==='/api/gallery/receipt'&&req.method==='GET'){
  const url=new URL(req.url,'https://local'),id=url.searchParams.get('id'),receipt=url.searchParams.get('receipt');
  if(!idOK(id)||!idOK(receipt))throw fail('Not found.',404);
  const record=await read(`submissions/${id}.json`);
  return send(200,{received:!!record&&record.value.receiptHash===createHash('sha256').update(receipt).digest('hex')});
 }
 if(path==='/api/gallery/upload'&&req.method==='POST'){
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  const result=await handleUpload({request:req,body,token:options().token,
   onBeforeGenerateToken:async(pathname,payload)=>{
    if(process.env.UPLOADS_ENABLED!=='true')throw fail('Submissions are not open yet.',503);
    const origin=process.env.CMS_ORIGIN||'https://get2grit-admin.vercel.app';if(req.headers.origin!==origin)throw fail('Invalid upload origin.',403);
    let data;try{data=JSON.parse(payload)}catch{throw fail('Invalid submission.')}
    const meta=metadata(data);if(!idOK(data.id)||!idOK(data.receipt))throw fail('Invalid receipt.');if(data.website)throw fail('Invalid submission.');
    if(!types[data.mime]||pathname!=='incoming/'+data.id+'.'+types[data.mime])throw fail('Unsupported file.');
    await quota(req);
    return {allowedContentTypes:[data.mime],maximumSizeInBytes:data.mime.startsWith('image/')?8*1024*1024:50*1024*1024,validUntil:Date.now()+15*60*1000,addRandomSuffix:false,allowOverwrite:false,tokenPayload:JSON.stringify({...meta,mime:data.mime,id:data.id,receiptHash:createHash('sha256').update(data.receipt).digest('hex')})};
   },
   onUploadCompleted:async({blob,tokenPayload})=>{
    const meta=JSON.parse(tokenPayload);const r=await get(blob.url,{...options(),useCache:false});if(!r)throw fail('Uploaded file unavailable.');
    const reader=r.stream.getReader();let header=Buffer.alloc(0);try{while(header.length<16){const part=await reader.read();if(part.done)break;header=Buffer.concat([header,Buffer.from(part.value).subarray(0,16-header.length)])}}finally{await reader.cancel()}if(!recognized(header,meta.mime))throw fail('File contents do not match the format.');
    const record={...meta,src:blob.url,pathname:blob.pathname,status:'pending',submittedAt:new Date().toISOString()};
    // Deterministic ID from the signed payload makes callbacks idempotent.
    try{await write(`submissions/${meta.id}.json`,record)}catch(e){if(!(await read(`submissions/${meta.id}.json`)))throw e}
   }});
  return send(200,result);
 }
 if(path==='/api/gallery/media'&&req.method==='GET'){
  const id=new URL(req.url,'https://local').searchParams.get('id');if(!idOK(id))throw fail('Not found.',404);
  const r=await read(`submissions/${id}.json`);if(!r||r.value.status!=='approved')throw fail('Not found.',404);
  return stream(r.value,req,res);
 }
 throw fail('Not found.',404);
}
async function stream(record,req,res){
 if(!/^https:\/\/[^/]+\.private\.blob\.vercel-storage\.com\//.test(record.src))throw fail('Invalid media location.');
 const headers={Authorization:`Bearer ${options().token}`};if(req.headers.range&&/^bytes=\d*-\d*$/.test(req.headers.range))headers.Range=req.headers.range;
 const r=await fetch(record.src,{headers});if(r.status===416){res.statusCode=416;if(r.headers.get('content-range'))res.setHeader('Content-Range',r.headers.get('content-range'));return res.end()}if(!r.ok)throw fail('Media unavailable.',502);
 res.statusCode=r.status;res.setHeader('Content-Type',record.mime);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','private,no-store');
 for(const h of ['content-length','content-range','accept-ranges'])if(r.headers.get(h))res.setHeader(h,r.headers.get(h));
 await pipeline(Readable.fromWeb(r.body),res);
}
async function reviewGallery(req,res,path){
 if(!process.env.BLOB_READ_WRITE_TOKEN)throw fail('Private media storage is not connected.',503);
 const url=new URL(req.url,'https://local');
 if(path==='/api/gallery/review'&&req.method==='GET')return res.status(200).json(await records(url.searchParams.get('cursor')||undefined));
 if(path==='/api/gallery/review-media'&&req.method==='GET'){
  const id=url.searchParams.get('id');if(!idOK(id))throw fail('Not found.',404);const r=await read(`submissions/${id}.json`);if(!r)throw fail('Not found.',404);return stream(r.value,req,res);
 }
 if(path==='/api/gallery/review'&&req.method==='POST'){
  const data=typeof req.body==='string'?JSON.parse(req.body):req.body;if(!idOK(data.id)||!['approved','rejected'].includes(data.status))throw fail('Invalid review.');
  const path=`submissions/${data.id}.json`,old=await read(path);if(!old)throw fail('Not found.',404);if(old.etag!==data.revision||old.value.status!=='pending')throw fail('This submission was already reviewed. Reload the queue.',409);
  const edited=data.status==='approved'?metadata({...data,consent:old.value.consent}):{};if(data.status==='approved'&&old.value.mime.startsWith('video/')&&!edited.transcript)throw fail('Add a video description or transcript before publishing.');
  const record={...old.value,...edited,status:data.status,reviewedAt:new Date().toISOString()};await write(path,record,old.etag);
  if(data.status==='approved'){
   const origin=process.env.CMS_ORIGIN||'https://get2grit-admin.vercel.app';
   const item={id:data.id,type:record.mime.startsWith('video/')?'video':'image',src:origin+'/api/gallery/media?id='+data.id,credit:record.credit,creditUrl:record.creditUrl,challenge:record.challenge,caption:record.caption,alt:record.alt,transcript:record.transcript};
   try{await write(`published/${data.id}.json`,item)}catch(e){if(!(await read(`published/${data.id}.json`))){await write(path,old.value,(await read(path)).etag);throw e}}
  }
  return res.status(200).json({saved:true,status:data.status});
 }
 throw fail('Not found.',404);
}

return {publicGallery,reviewGallery};
}
export const {publicGallery,reviewGallery}=createGalleryService();
