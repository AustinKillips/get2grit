/* Public gallery: only curated files and approved submission records reach this view. */
window.mountGallery=function(root){
 let disposed=false;const controller=new AbortController();
 const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e};
 const safeUrl=u=>typeof u==='string'&&(/^assets\/photos\/[\w/.-]+$/.test(u)||/^https:\/\//.test(u))?u:'';
 root.replaceChildren();
 const upload=make('a','gallery-share','UPLOAD YOUR PHOTOS/VIDEOS HERE');upload.href='https://get2grit-admin.vercel.app/submit.html';root.append(upload);
 const intro=make('section','intro ride-intro gallery-intro');intro.append(make('p','','Did you ferry your bike across the lake? Prove it...'));root.append(intro);
 const jumps=make('nav','gallery-jumps');jumps.setAttribute('aria-label','Photographer galleries');
 const status=make('p','gallery-status','Loading the photo galleries…');status.setAttribute('role','status');root.append(status);
 const body=make('div','gallery-collections');root.append(body);
 const videos=make('section','gallery-videos');videos.setAttribute('aria-labelledby','gallery-videos-title');
 const videosTitle=make('h2','','Videos');videosTitle.id='gallery-videos-title';videos.append(videosTitle);
 const videoChoices=[['Wheelmouse','CFrjEBYh9-Y'],['Taylor Martin','N04tEHPoEwA']];
 const videoNav=make('nav','gallery-jumps video-authors');videoNav.setAttribute('aria-label','Video authors');videos.append(videoNav);
 const player=make('div','grit-video-player'),playerBar=make('div','video-player-bar');
 playerBar.append(make('span','','GRITAMP'),make('span','video-player-star','✦'));playerBar.lastChild.setAttribute('aria-hidden','true');
 const frame=make('div','gallery-video-frame'),screen=make('div','video-player-screen');frame.append(screen);
 const playerFoot=make('div','video-player-footer'),nowPlaying=make('span','video-now-playing'),link=make('a','gallery-video-link');
 nowPlaying.setAttribute('aria-live','polite');link.target='_blank';link.rel='noopener';playerFoot.append(nowPlaying,link);player.append(playerBar,frame,playerFoot);videos.append(player);
 let selectedVideo=-1;
 const videoButtons=videoChoices.map(([name],index)=>{
  const button=make('button','',name);button.type='button';button.setAttribute('aria-controls','grit-video-screen');button.onclick=()=>selectVideo(index);videoNav.append(button);return button;
 });
 screen.id='grit-video-screen';
 function selectVideo(index){
  if(index===selectedVideo)return;selectedVideo=index;
  const [name,id]=videoChoices[index],embed=make('iframe');
  embed.src='https://www.youtube-nocookie.com/embed/'+id+'?playsinline=1';embed.title='GRIT FEST video by '+name;embed.loading='lazy';embed.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';embed.allowFullscreen=true;embed.referrerPolicy='strict-origin-when-cross-origin';
  // Replacing the frame stops the previous video, including its audio.
  screen.replaceChildren(embed);videoButtons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  nowPlaying.textContent='ON SCREEN: '+name;link.textContent='Watch on YouTube ↗';link.href='https://www.youtube.com/watch?v='+id;
 }
 selectVideo(0);
 body.append(videos);
 const photosTitle=make('h2','gallery-photos-title','Photos');body.append(photosTitle,jumps);

 const dialog=document.createElement('dialog');dialog.className='gallery-dialog';dialog.setAttribute('aria-label','Photo viewer');
 // Only dismiss when both press and release occur outside the dialog bounds.
 let backdropPress=false;
 const outsideDialog=e=>{const r=dialog.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom};
 dialog.addEventListener('pointerdown',e=>{backdropPress=e.target===dialog&&outsideDialog(e)});
 dialog.addEventListener('click',e=>{if(backdropPress&&e.target===dialog&&outsideDialog(e))dialog.close();backdropPress=false});
 dialog.addEventListener('pointercancel',()=>{backdropPress=false});
 const close=make('button','gallery-close','Close photo');close.type='button';close.onclick=()=>dialog.close();
 const toolbar=make('div','gallery-viewer-toolbar'),position=make('span','gallery-position');position.setAttribute('aria-live','polite');toolbar.append(close,position);
 const stage=make('div','gallery-stage'),large=make('img','gallery-full-image'),caption=make('p','gallery-viewer-caption');
 const previous=make('button','gallery-previous','←'),nextPhoto=make('button','gallery-next','→');
 previous.type=nextPhoto.type='button';previous.setAttribute('aria-label','Previous photo');nextPhoto.setAttribute('aria-label','Next photo');
 const strip=make('div','gallery-filmstrip');strip.setAttribute('role','group');strip.setAttribute('aria-label','Photo thumbnails');
 stage.append(previous,large,nextPhoto);dialog.append(toolbar,stage,caption,strip);root.append(dialog);
 let viewerItems=[],viewerIndex=0,viewerName='',opener=null;
 function showPhoto(index){
  viewerIndex=(index+viewerItems.length)%viewerItems.length;
  const item=viewerItems[viewerIndex];large.src=item.src;large.alt=item.alt||'Photo by '+viewerName;
  caption.textContent=[item.caption,'Photo: '+(item.credit||viewerName),item.challenge].filter(Boolean).join(' · ');
  position.textContent=viewerName+' · '+(viewerIndex+1)+' / '+viewerItems.length;
  previous.disabled=nextPhoto.disabled=viewerItems.length<2;
  [...strip.children].forEach((button,i)=>{if(i===viewerIndex)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current')});
  const active=strip.children[viewerIndex];if(strip.clientWidth)strip.scrollLeft=active.offsetLeft-strip.offsetLeft-(strip.clientWidth-active.offsetWidth)/2;
 }
 function openPhoto(items,item,name,button){
  viewerItems=items.filter(photo=>photo.type!=='video'&&safeUrl(photo.src));viewerName=name;opener=button;
  strip.replaceChildren(...viewerItems.map((photo,i)=>{
   const thumb=make('button','gallery-thumb');thumb.type='button';thumb.setAttribute('aria-label','View photo '+(i+1)+' by '+name);
   const img=make('img');img.src=safeUrl(photo.thumbnail)||photo.src;img.alt='';img.loading='lazy';img.width=96;img.height=72;thumb.append(img);thumb.onclick=()=>showPhoto(i);return thumb;
  }));
  dialog.showModal();showPhoto(viewerItems.indexOf(item));close.focus();
 }
 previous.onclick=()=>showPhoto(viewerIndex-1);nextPhoto.onclick=()=>showPhoto(viewerIndex+1);
 // Preserve vertical gestures and pinch zoom; only deliberate one-finger horizontal swipes navigate.
 let swipeStart=null;
 stage.addEventListener('touchstart',e=>{
  swipeStart=matchMedia('(max-width:600px)').matches&&e.touches.length===1&&!e.target.closest('button')
   ?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;
 },{passive:true});
 stage.addEventListener('touchmove',e=>{if(e.touches.length!==1)swipeStart=null},{passive:true});
 stage.addEventListener('touchcancel',()=>{swipeStart=null},{passive:true});
 stage.addEventListener('touchend',e=>{
  if(!swipeStart||e.touches.length||!e.changedTouches.length){swipeStart=null;return}
  const dx=e.changedTouches[0].clientX-swipeStart.x,dy=e.changedTouches[0].clientY-swipeStart.y;swipeStart=null;
  if(Math.abs(dx)>=50&&Math.abs(dx)>Math.abs(dy)*1.5)showPhoto(viewerIndex+(dx<0?1:-1));
 },{passive:true});

 dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();showPhoto(viewerIndex+(e.key==='ArrowRight'?1:-1))}});
 dialog.addEventListener('close',()=>{large.removeAttribute('src');strip.replaceChildren();if(opener?.isConnected)opener.focus({preventScroll:true})});
 const drawGroup=(g)=>{
  const allItems=g.items||[];
  const selectedIds=new Set(g.selects||[]);
  const selected=(g.selects||[]).map(id=>allItems.find(item=>item.id===id)).filter(Boolean);
  const items=[...selected,...allItems.filter(item=>!selectedIds.has(item.id))];
  const section=make('section','photo-collection');section.id='gallery-'+g.id;
  const heading=make('h2','',g.name);heading.id=section.id+'-title';section.setAttribute('aria-labelledby',heading.id);section.append(heading);
  if(safeUrl(g.creditUrl)){const credit=make('a','photographer-link','More from '+g.name);credit.href=g.creditUrl;credit.target='_blank';credit.rel='noopener';section.append(credit)}
  const jump=make('a','',g.name);jump.href='#'+section.id;jump.onclick=e=>{e.preventDefault();section.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});heading.tabIndex=-1;heading.focus({preventScroll:true})};jumps.append(jump);
  const grid=make('div','photo-grid');grid.setAttribute('role','region');grid.setAttribute('aria-label',g.name+' photos');grid.tabIndex=0;section.append(grid);body.append(section);
  let count=0;const more=make('button','gallery-more','Show more photos');more.type='button';
  const mobile=matchMedia('(max-width:600px)');
  const swipe=make('p','gallery-swipe-hint','Swipe for more from '+g.name+'!');swipe.hidden=items.length<=4;
  function next(all=false){
   const batch=items.slice(count,all?items.length:count+(count===0&&selected.length?selected.length:12));
   for(const item of batch){
    if(!safeUrl(item.src))continue;
    const figure=make('figure','photo-card'),cap=make('figcaption');
    if(item.type==='video'){
     const video=make('video');video.controls=true;video.preload='none';video.playsInline=true;video.src=item.src;if(safeUrl(item.poster))video.poster=item.poster;video.setAttribute('aria-label',item.alt||item.caption||'Video by '+item.credit);figure.append(video);
     if(item.transcript){const details=make('details');details.append(make('summary','','Video description / transcript'),make('p','',item.transcript));cap.append(details)}
    }else{
     const button=make('button','photo-open');button.type='button';button.setAttribute('aria-label','Open photo: '+item.alt);
     const image=make('img');image.src=safeUrl(item.thumbnail)||item.src;image.alt=item.alt||'GRIT FEST photo by '+item.credit;image.loading='lazy';image.decoding='async';image.width=item.width||1200;image.height=item.height||800;
     button.append(image);button.onclick=()=>openPhoto(items,item,g.name,button);figure.append(button);
     const mobileImage=make('img','photo-mobile');mobileImage.src=safeUrl(item.thumbnail)||item.src;mobileImage.srcset=(safeUrl(item.thumbnail)||item.src)+' 640w, '+item.src+' '+(item.width||1800)+'w';mobileImage.sizes='(max-width: 600px) 50vw, 100vw';mobileImage.alt='';mobileImage.width=image.width;mobileImage.height=image.height;mobileImage.loading='lazy';mobileImage.decoding='async';button.append(mobileImage);
    }
    if(g.community)cap.append(make('p','photo-credit',(item.type==='video'?'Video: ':'Photo: ')+(item.credit||g.name)));
    if(item.challenge){const challenge=make('p','manifest-label');challenge.append(make('span','','CHALLENGE'),document.createTextNode(item.challenge));cap.append(challenge)}
    if(item.caption)cap.append(make('p','photo-caption',item.caption));if(cap.childNodes.length)figure.append(cap);grid.append(figure);
   }
   count+=batch.length;more.hidden=count>=items.length;more.textContent='Show more from '+g.name;
  }
  more.onclick=()=>next();section.append(more,swipe);next(mobile.matches);
  mobile.addEventListener('change',e=>{if(e.matches)next(true)},{signal:controller.signal});
  if(!items.length)section.append(make('p','page-intro',g.community?'Your approved photos and videos will appear here.':'Photos coming soon.'));
 };
 (async()=>{try{
  const res=await fetch('gallery-data.json?v=release-20261021-disposable',{signal:controller.signal});if(!res.ok)throw Error('Gallery unavailable');const data=await res.json();if(disposed)return;
  data.groups.filter(g=>g.creditConfirmed).forEach(drawGroup);status.textContent='';
 }catch(e){if(!disposed)status.textContent='The galleries couldn’t load. Please refresh to try again.'}
 const community={id:'your-photos',name:'Your Photos!',community:true,items:[]};
 try{
  const res=await fetch('https://get2grit-admin.vercel.app/api/gallery/public',{signal:controller.signal});
  if(res.ok){const data=await res.json();community.items=data.items||[];}
 }catch{}
 if(!disposed)drawGroup(community);
 })();
 return ()=>{disposed=true;controller.abort();dialog.close()};
};
