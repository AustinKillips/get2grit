/* Plain-text overrides keep the guide's markup, links, and accessible structure intact. */
window.GritCopy=(()=>{
 const config=window.GRIT_COPY||{pages:{},coaches:{}};
 const page=()=>document.body.dataset.view||(location.pathname.endsWith('welcome.html')?'welcome':'lady-squirrel-hunter');
 const roots=key=>key==='shared'?Array.from(document.querySelectorAll('header,footer')):Array.from(document.querySelectorAll(document.querySelector('#content')?'#content':'main'));
 function pathFor(el,root){if(el===root)return '';const parts=[];while(el&&el!==root){const tag=el.tagName.toLowerCase();const siblings=Array.from(el.parentElement.children).filter(e=>e.tagName===el.tagName);parts.unshift(`${tag}:nth-of-type(${siblings.indexOf(el)+1})`);el=el.parentElement}return parts.join(' > ')}
 function inventory(key){const fields=[];roots(key).forEach((root,rootIndex)=>{
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
   const node=walker.currentNode,el=node.parentElement;
   if(!node.textContent.trim()||el.closest('script,style,template,.event,.day-label,.day-date,.route-card,.raffle-caption,.raffle-donor,.raffle-controls,.raffle-status,.clinic-coach,.workshop-cow'))continue;
   const path=pathFor(el,root),index=Array.from(el.childNodes).indexOf(node);
   fields.push({id:`${rootIndex}|${path}|${index}`,root:rootIndex,path,index,value:node.textContent,label:node.textContent.trim().slice(0,100)});
  }
 });return fields}
 function applyGroup(key){const containers=roots(key);for(const field of config.pages[key]||[]){const root=containers[field.root];if(!root)continue;let target;try{target=field.path?root.querySelector(':scope > '+field.path):root}catch{continue}const node=target?.childNodes[field.index];if(node?.nodeType===Node.TEXT_NODE)node.textContent=field.value}}
 function coaches(){document.querySelectorAll('.clinic-card').forEach(card=>{card.querySelector('.clinic-coach')?.remove();const setting=config.coaches[card.dataset.level];if(!setting?.enabled||!/^https?:\/\//.test(setting.url))return;const a=document.createElement('a');a.className='clinic-coach';a.href=setting.url;a.textContent=setting.label||'Coach';a.target='_blank';a.rel='noopener';a.setAttribute('aria-label',`${a.textContent} — ${card.querySelector('.clinic-title').textContent.trim()}`);card.querySelector('.workshop-body').append(a)})}
 function apply(){applyGroup('shared');applyGroup(page());coaches();if(new URLSearchParams(location.search).has('cms')&&parent!==window)parent.postMessage({type:'grit-copy-ready',page:page()},location.origin)}
 document.addEventListener('DOMContentLoaded',()=>{if(!document.querySelector('#page-content'))apply()});
 return {apply,inventory};
})();
