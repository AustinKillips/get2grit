window.mountRaffle = function(root,sponsorLinks={}) {
 const aliases={'Mook Press':'The Mook Press','Pack Rat':'Packrat','Redshift':'Redshift Sports','Silca':'SILCA','Smokehouse Cycles':'Smokehouse','Stan’s':"Stan's No Tubes",'The Athletic Company':'The Athletic Community','Type 2 Gear':'Type2 Gear'};
 const extraLinks={"Yes Ma'am":'https://yesmaam.shop/','Specialized':'https://www.specialized.com/','JF Frankel':'https://refreshingrectangles.com/','Anodized by Austin':'https://www.instagram.com/anodized.by.austin/','Kaitlyn Cirielli':'https://essa-art.org/2026-ceramics-artists-in-residence/'};
 const config=window.GRIT_RAFFLE;
 const slides=[];
 config.prizes.forEach(prize=>{
  (prize.images.length?prize.images:[null]).forEach((image,variant)=>slides.push({...prize,image,variant}));
 });
 root.innerHTML=`<section class="raffle-showcase" aria-labelledby="raffle-showcase-title"><h2 id="raffle-showcase-title">First Annual Sixth Grit Fest Raffle for the cure</h2><div class="raffle-frame"><div class="raffle-screen"><img class="raffle-prize-image" hidden alt=""><div class="raffle-empty"><img src="assets/abw-cow-2.svg" alt=""><p>GOOD THINGS<br>ARE HERE</p></div></div><div class="raffle-caption"><h3></h3></div></div><div class="raffle-donor"><div class="raffle-donor-inner"><span>DONATED BY:</span><a class="raffle-sponsor-link" target="_blank" rel="noopener"><img hidden alt=""><strong></strong></a><img class="raffle-supporters" src="assets/we-love-our-supporters.svg" alt="We love our supporters" hidden><span class="raffle-thanks">thank you</span></div></div></section><div class="raffle-controls"><button type="button" class="raffle-pause">Pause animation</button><button type="button" class="raffle-next">Next prize</button></div><p class="sr-only raffle-status" role="status"></p><section class="raffle-purchase" aria-label="Raffle tickets"><div class="raffle-purchase-body"><a class="raffle-buy" target="_blank" rel="noopener" hidden>get your tickets</a></div></section>`;
 root.querySelector('.raffle-frame').prepend(root.querySelector('.raffle-purchase'));
 const ticketLink=root.querySelector('.raffle-buy');
 if(/^https:\/\//i.test(config.purchaseUrl||'')){ticketLink.href=config.purchaseUrl;ticketLink.hidden=false;}else{root.querySelector('.raffle-purchase').hidden=true;}
 const image=root.querySelector('.raffle-prize-image');
 const title=root.querySelector('.raffle-caption h3');
 const donor=root.querySelector('.raffle-donor');
 const sponsorLink=donor.querySelector('.raffle-sponsor-link');
 const donorLogo=donor.querySelector('img');
 const donorName=donor.querySelector('strong');
 const supporterArt=donor.querySelector('.raffle-supporters');
 const donorLabel=donor.querySelector('span');
 const interlude=root.querySelector('.raffle-empty');
 image.addEventListener('error',()=>{image.hidden=true;interlude.hidden=false;setPlaceholder()});
 donorLogo.addEventListener('error',()=>{donorLogo.hidden=true;donorName.hidden=false});
 const connection=navigator.connection;
 const saveData=matchMedia('(max-width:600px)').matches||connection?.saveData||['slow-2g','2g','3g'].includes(connection?.effectiveType);
 let placeholderCount=1;
 const placeholderImage=interlude.querySelector('img');
 function setPlaceholder(){
  const art=++placeholderCount%2===0;
  interlude.classList.toggle('is-art',art);
  placeholderImage.src=art?'assets/raffle-footer-still.webp':'assets/abw-cow-2.svg';
  placeholderImage.alt=art?'I got to GRIT and all I won was the whole damn event. We love our sponsors.':'';
 }
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 let timer,queue=[],last=null,shown=0,paused=saveData||motion.matches||new URLSearchParams(location.search).has("cms");
 const pauseButton=root.querySelector('.raffle-pause');
 const nextButton=root.querySelector('.raffle-next');
 const status=root.querySelector('.raffle-status');
 function syncMotion(){pauseButton.textContent=paused?'Play animation':'Pause animation';}
 function nextSlide(){
  if(!slides.length)return {interlude:true};
  if(shown===5){shown=0;return {interlude:true}}
  if(!queue.length){
   queue=slides.slice();
   for(let i=queue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[queue[i],queue[j]]=[queue[j],queue[i]]}
   if(queue.length>1&&queue[queue.length-1]===last)[queue[0],queue[queue.length-1]]=[queue[queue.length-1],queue[0]];
  }
  shown++;last=queue.pop();return last;
 }
 // Fetch prize images only as they are shown.
 function show(slide){
  image.hidden=!slide.image;interlude.hidden=!!slide.image;
  if(!slide.image)setPlaceholder();
  if(slide.image){image.src=slide.image;image.alt=slide.name+(slide.donor?' — donated by '+slide.donor:'')}
  title.textContent=slide.interlude?'THE GRIT FEST RAFFLE':slide.name;
  const name=(slide.donor||'').trim();
  const href=extraLinks[name]||sponsorLinks[aliases[name]||name];
  sponsorLink.hidden=!!slide.interlude;
  if(href){sponsorLink.href=href;sponsorLink.setAttribute('aria-label','Visit '+name);}else{sponsorLink.removeAttribute('href');sponsorLink.removeAttribute('aria-label');}
  donor.classList.toggle('is-interlude',!!slide.interlude);
  supporterArt.hidden=!slide.interlude;
  donorLabel.hidden=!!slide.interlude;
  donorName.hidden=!!slide.interlude||!!slide.logo;
  donorLogo.hidden=!!slide.interlude||!slide.logo;
  if(slide.logo){donorLogo.src=slide.logo;donorLogo.alt=slide.donor+' logo'}
  donorName.textContent=slide.donor||'Donor to be announced';
 }
 function start(){clearInterval(timer);if(!paused&&!document.hidden&&!donor.matches(':hover')&&!donor.contains(document.activeElement))timer=setInterval(()=>show(nextSlide()),1500)}
 donor.addEventListener('mouseenter',start);donor.addEventListener('mouseleave',start);donor.addEventListener('focusin',start);donor.addEventListener('focusout',()=>setTimeout(start,0));
 pauseButton.addEventListener('click',()=>{paused=!paused;syncMotion();start()});
 nextButton.addEventListener('click',()=>{paused=true;syncMotion();show(nextSlide());status.textContent=title.textContent+(donorName.hidden?'':' — '+donorName.textContent);start()});
 const onMotionChange=()=>{paused=saveData||motion.matches||new URLSearchParams(location.search).has("cms");syncMotion();start()};
 document.addEventListener('visibilitychange',start);motion.addEventListener('change',onMotionChange);
 show({interlude:true});syncMotion();start();
 return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',start);motion.removeEventListener('change',onMotionChange)};
};
