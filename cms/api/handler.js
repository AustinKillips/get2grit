import {randomBytes} from 'node:crypto';
import {seal,unseal,cookies,cookie,validate} from '../lib/security.js';
const repo='AustinKillips/get2grit',branch='main';
const definitions=[['content-data.js','window.GRIT_CONTENT = ','schedule'],['raffle-data.js','window.GRIT_RAFFLE = ','raffle'],['rides-data.js','window.GRIT_RIDES = ','rides'],['site-copy-data.js','window.GRIT_COPY = ','copy']];
async function gh(token,path,method='GET',body){const r=await fetch(`https://api.github.com/repos/${repo}/${path}`,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},body:body?JSON.stringify(body):undefined});if(!r.ok){const e=Error(r.status===409||r.status===422?'Content changed elsewhere. Reload the editor before saving.':'GitHub request failed. Sign in again or try later.');e.status=r.status===409||r.status===422?409:502;throw e}return r.json()}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const send=(status,data)=>res.status(status).json(data),redirect=path=>{res.statusCode=302;res.setHeader('Location',path);res.end()};
 try{
 const {GITHUB_CLIENT_ID:client,GITHUB_CLIENT_SECRET:secret,SESSION_SECRET:key,CMS_ORIGIN:origin}=process.env;
 if(!client||!secret||!key||key.length!==64||!origin)return send(503,{error:'Editor sign-in is not configured yet.'});
 const url=new URL(req.url,origin),path=url.pathname,c=cookies(req),session=unseal(c.grit_session||'',key);
 if(path==='/api/login'&&req.method==='GET'){
  const state=randomBytes(24).toString('hex');res.setHeader('Set-Cookie',cookie('grit_oauth',seal({state,exp:Date.now()+600000},key),600));
  return redirect('https://github.com/login/oauth/authorize?'+new URLSearchParams({client_id:client,redirect_uri:origin+'/api/callback',state,scope:'public_repo'}));
 }
 if(path==='/api/callback'&&req.method==='GET'){
  const oauth=unseal(c.grit_oauth||'',key);if(!oauth||oauth.state!==url.searchParams.get('state')||!url.searchParams.get('code'))return send(403,{error:'Sign-in expired. Start again.'});
  const r=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:client,client_secret:secret,code:url.searchParams.get('code'),redirect_uri:origin+'/api/callback'})});
  const auth=await r.json();if(!auth.access_token)return send(403,{error:'GitHub sign-in failed.'});
  const permission=await gh(auth.access_token,'');if(!permission.permissions?.push)return send(403,{error:'You need write access to AustinKillips/get2grit.'});
  res.setHeader('Set-Cookie',[cookie('grit_oauth','',0),cookie('grit_session',seal({token:auth.access_token,exp:Date.now()+8*3600000},key))]);return redirect('/admin.html');
 }
 if(!session)return send(401,{error:'Sign in with GitHub to edit this site.'});
 if(req.method==='POST'&&(req.headers.origin!==origin||req.headers['x-grit-editor']!=='1'))return send(403,{error:'Invalid request origin.'});
 if(path==='/api/logout'&&req.method==='POST'){res.setHeader('Set-Cookie',cookie('grit_session','',0));return send(200,{saved:true})}
 const permission=await gh(session.token,'');if(!permission.permissions?.push)return send(403,{error:'Repository write access required.'});
 const head=await gh(session.token,`git/ref/heads/${branch}`),revision=head.object.sha;
 if(path==='/api/content'&&req.method==='GET'){
  const result={revision};await Promise.all(definitions.map(async([file,prefix,key])=>{const f=await gh(session.token,`contents/${file}?ref=${revision}`),text=Buffer.from(f.content,'base64').toString();if(!text.startsWith(prefix))throw Error('Unexpected data format');const value=JSON.parse(text.slice(prefix.length).trim().replace(/;$/,''));result[key]=key==='schedule'?value.schedule:value}));return send(200,result)
 }
 if(path==='/api/content'&&req.method==='POST'){
  const data=typeof req.body==='string'?JSON.parse(req.body):req.body;validate(data);if(data.revision!==revision)return send(409,{error:'Someone published changes since you opened this editor. Reload before saving.'});
  const commit=await gh(session.token,`git/commits/${revision}`);
  const tree=await gh(session.token,'git/trees','POST',{base_tree:commit.tree.sha,tree:definitions.map(([file,prefix,key])=>({path:file,mode:'100644',type:'blob',content:prefix+JSON.stringify(key==='schedule'?{schedule:data.schedule}:data[key],null,2)+';\n'}))});
  const next=await gh(session.token,'git/commits','POST',{message:'Update festival content from online editor',tree:tree.sha,parents:[revision]});
  await gh(session.token,`git/refs/heads/${branch}`,'PATCH',{sha:next.sha,force:false});return send(200,{saved:true,revision:next.sha})
 }
 if(path==='/api/upload'&&req.method==='POST'){
  const data=typeof req.body==='string'?JSON.parse(req.body):req.body,raw=Buffer.from(data?.data||'','base64');if(!raw.length||raw.length>2500000)return send(400,{error:'Upload images under 2.5 MB.'});
  let ext;if(raw.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))ext='png';else if(raw[0]===255&&raw[1]===216&&raw[2]===255)ext='jpg';else if(raw.subarray(0,4).toString()==='RIFF'&&raw.subarray(8,12).toString()==='WEBP')ext='webp';else if(/^GIF8[79]a/.test(raw.subarray(0,6).toString()))ext='gif';else return send(400,{error:'Use PNG, JPEG, WebP, or GIF.'});
  if(data.revision!==revision)return send(409,{error:'Content changed. Reload before uploading.'});
  const path=`assets/admin-uploads/${randomBytes(16).toString('hex')}.${ext}`;
  const created=await gh(session.token,`contents/${path}`,'PUT',{message:'Upload festival editor image',content:raw.toString('base64'),branch});return send(200,{path,revision:created.commit.parents?.[0]?.sha===revision?created.commit.sha:revision})
 }
 return send(404,{error:'Not found'});
 }catch(e){return send(e.status||400,{error:e.message||'Request failed'})}
}
