
(() => {
  'use strict';
  const C=RichCore,$=C.q;
  const e={intro:$('#intro'),play:$('#play'),result:$('#result'),start:$('#start'),target:$('#holdTarget'),timer:$('#timer'),instruction:$('#instruction'),
    fill:$('#heatFill'),meter:$('.meter.heat'),heat:$('#heatText'),status:$('#status'),score:$('#score'),badge:$('#badge'),title:$('#resultTitle'),copy:$('#resultCopy'),
    claim:$('#claim'),replay:$('#replay'),sparks:$('#sparks'),ad:$('#ad')};
  const s={scene:'intro',holding:false,startAt:0,elapsed:0,raf:0,lastPulse:0,best:0,completed:false,pointerId:null};
  C.makeSparks(e.sparks,28);
  const scene=n=>{s.scene=n;e.intro.hidden=n!=='intro';e.play.hidden=n!=='play';e.result.hidden=n!=='result';C.track('scene_view',{scene:n})};
  function format(ms){const sec=ms/1000,m=Math.floor(sec/60),r=sec-m*60;return String(m).padStart(2,'0')+':'+r.toFixed(1).padStart(4,'0')}
  function render(ms=s.elapsed){
    const heat=C.clamp(ms/9000),pct=Math.round(heat*100);e.timer.textContent=format(ms);e.fill.style.width=pct+'%';e.heat.textContent=pct+'%';e.meter.setAttribute('aria-valuenow',String(pct));
    e.target.style.filter=`saturate(${1.05+heat*.7}) brightness(${1+heat*.15})`;C.audio.setSizzle(.2+heat*.8);
  }
  async function start(){s.elapsed=0;s.completed=false;render(0);scene('play');await C.audio.unlock();C.track('challenge_start')}
  async function holdBegin(ev){
    if(s.scene!=='play'||s.holding)return;ev.preventDefault();await C.audio.unlock();await C.audio.startSizzle(.22);s.holding=true;s.startAt=performance.now()-s.elapsed;s.lastPulse=0;s.pointerId=ev.pointerId??null;
    try{if(s.pointerId!==null)e.target.setPointerCapture(s.pointerId)}catch(_){}
    e.ad.classList.add('holding');e.instruction.textContent='Keep holding…';e.status.textContent='Heat rising.';C.haptics.pulse(18,0);C.audio.pop();C.track('hold_start');s.raf=requestAnimationFrame(loop);
  }
  function loop(ts){
    if(!s.holding)return;s.elapsed=ts-s.startAt;const heat=C.clamp(s.elapsed/9000);render(s.elapsed);
    const gap=560-heat*390;if(ts-s.lastPulse>gap){C.haptics.pulse(heat>.72?[26,20,30]:18,0);s.lastPulse=ts}
    e.status.textContent=heat>.8?'🔥 Maximum heat!':heat>.55?'It’s getting serious…':heat>.25?'Feeling it yet?':'Heat rising.';
    if(s.elapsed>=10000){holdEnd(null,true);return}s.raf=requestAnimationFrame(loop)
  }
  function holdEnd(ev,auto=false){
    if(!s.holding)return;if(ev)ev.preventDefault();s.holding=false;cancelAnimationFrame(s.raf);s.raf=0;e.ad.classList.remove('holding');C.haptics.stop();C.haptics.pulse([30,28,45],0);C.audio.stopSizzle();C.audio.success();
    s.best=Math.max(s.best,s.elapsed);C.track('hold_end',{seconds:+(s.elapsed/1000).toFixed(2),auto});
    showResult();
  }
  function showResult(){
    const sec=s.elapsed/1000;e.score.textContent=sec.toFixed(1)+'s';
    if(sec>=8){e.badge.textContent='🔥 Fireproof';e.title.textContent='Spice legend.';e.copy.textContent='Top heat tier. Reward unlocked.'}
    else if(sec>=5){e.badge.textContent='🌶️ Heat Hero';e.title.textContent='Strong hold.';e.copy.textContent='You made the heat work for it.'}
    else if(sec>=2.5){e.badge.textContent='🔥 Heat Handler';e.title.textContent='Not bad.';e.copy.textContent='There’s more in you. Beat that score.'}
    else{e.badge.textContent='🌶️ Heat Rookie';e.title.textContent='Too hot?';e.copy.textContent='Try again and hold a little longer.'}
    setTimeout(()=>scene('result'),C.test?20:260)
  }
  function replay(){s.elapsed=0;s.holding=false;render(0);scene('play');e.instruction.textContent='Hold your finger on the nugget.';e.status.textContent='Ready.';C.track('replay')}
  e.start.addEventListener('click',start);e.target.addEventListener('pointerdown',holdBegin);e.target.addEventListener('pointerup',holdEnd);e.target.addEventListener('pointercancel',holdEnd);e.target.addEventListener('lostpointercapture',()=>{if(s.holding)holdEnd()});
  e.target.addEventListener('contextmenu',ev=>ev.preventDefault());e.claim.addEventListener('click',C.clickThrough);e.replay.addEventListener('click',replay);
  addEventListener('pagehide',()=>{cancelAnimationFrame(s.raf);C.audio.close();C.haptics.stop()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&s.holding)holdEnd()});
  window.__adTest={start,begin:()=>holdBegin({preventDefault(){},pointerId:1}),forceElapsed:ms=>{s.elapsed=ms;s.startAt=performance.now()-ms;render(ms)},end:()=>holdEnd(),state:()=>({...s})};
  render(0);C.track('ad_loaded',{idea:'heat-hold'});
  if(C.test)addEventListener('load',async()=>{await C.sleep(70);const r=[],ck=(n,p,d='')=>r.push({name:n,pass:!!p,detail:d});ck('DOM loaded',!!e.target);ck('Presentation asset loaded',C.q('#intro .hero img').complete&&C.q('#intro .hero img').naturalWidth>0);await start();await window.__adTest.begin();window.__adTest.forceElapsed(3200);await C.sleep(40);ck('Heat increases while held',Number(e.meter.getAttribute('aria-valuenow'))>30);window.__adTest.end();await C.sleep(60);ck('Result appears after release',s.scene==='result');ck('Score populated',/s$/.test(e.score.textContent));replay();ck('Replay returns to challenge',s.scene==='play');C.report(r)});
})();
