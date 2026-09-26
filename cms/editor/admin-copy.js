const copyPage=document.querySelector('#copy-page'),copyFields=document.querySelector('#copy-fields'),copyFrame=document.querySelector('#copy-preview');
const copyPages={'shared':'Shared header, navigation & footer','schedule':'Schedule page text','group-rides':'Routes page introduction','workshops':'Expo / workshops','on-bike-clinics':'Clinics','food':'Food','raffle':'Raffle page text','scavenger-hunt':'Scavenger hunt','maps':'Maps','welcome':'Welcome','lady-squirrel-hunter':'Lady Squirrel Hunter'};
for(const [key,label] of Object.entries(copyPages)){const o=el('option',label);o.value=key;copyPage.append(o)}
let requestedCopyPage='';
function loadCopyPage(){if(!state)return;requestedCopyPage=copyPage.value;copyFields.textContent='Loading page text…';const key=requestedCopyPage;copyFrame.src=['welcome','lady-squirrel-hunter'].includes(key)?`${key}.html?cms=1`:`index.html?cms=1#${key==='shared'?'schedule':key}`;}
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==copyFrame.contentWindow||event.data?.type!=='grit-copy-ready'||!state)return;
 const key=requestedCopyPage;
 const expected=key==='shared'?'schedule':key;if(event.data.page!==expected)return;
 const inventory=copyFrame.contentWindow.GritCopy.inventory(key);
 state.copy??={pages:{},coaches:{}};
 const saved=new Map((state.copy.pages[key]||[]).map(f=>[f.id,f.value]));
 const fields=inventory.map(f=>({...f,value:saved.has(f.id)?saved.get(f.id):f.value}));
 state.copy.pages[key]=fields;copyFields.replaceChildren();
 if(!fields.length)copyFields.append(el('p','Use the dedicated editor sections below for this content.'));
 fields.forEach((item,i)=>{field(copyFields,`${i+1}. ${item.label}`,item,'value',true)});
});
copyPage.onchange=loadCopyPage;document.querySelector('#load-copy').onclick=loadCopyPage;
function renderCoaches(){const box=document.querySelector('#coach-fields');box.replaceChildren();for(const [key,name] of Object.entries({'first-touch':'First-touch','beginner':'Beginner','intermediate':'Intermediate','advanced':'Advanced'})){
 state.copy??={pages:{},coaches:{}};state.copy.coaches[key]??={enabled:false,label:'Coach',url:''};const setting=state.copy.coaches[key];const group=el('fieldset');group.append(el('legend',name));const label=el('label');const checkbox=el('input');checkbox.type='checkbox';checkbox.checked=setting.enabled;checkbox.onchange=()=>{setting.enabled=checkbox.checked;changed()};label.append(checkbox,document.createTextNode(' Show Coach button'));group.append(label);field(group,'Button label',setting,'label');field(group,'Coach link (https://…)',setting,'url');box.append(group);
}}
