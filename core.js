
(() => {
  'use strict';
  const Core = {};
  Core.q = (s, p=document) => p.querySelector(s);
  Core.qa = (s,p=document) => [...p.querySelectorAll(s)];
  Core.clamp = (n,a=0,b=1) => Math.min(b,Math.max(a,n));
  Core.lerp = (a,b,t) => a+(b-a)*t;
  Core.sleep = ms => new Promise(r=>setTimeout(r,ms));
  Core.params = new URLSearchParams(location.search);
  Core.debug = Core.params.get('debug') === '1';
  Core.test = Core.params.get('selftest') === '1' || window.__SELFTEST__ === true;
  Core.errors = [];
  addEventListener('error', e => Core.errors.push('window.error: '+e.message));
  addEventListener('unhandledrejection', e => Core.errors.push('unhandledrejection: '+String(e.reason)));
  Core.track = (name, detail={}) => {
    try{
      const payload={event:name,ts:Date.now(),...detail};
      dispatchEvent(new CustomEvent('richmedia',{detail:payload}));
      if(typeof window.richMediaTrack==='function') window.richMediaTrack(name,detail);
      if(Core.debug) console.info('[richmedia]',payload);
    }catch(_){}
  };
  let toastTimer=0;
  Core.toast = (message, ms=2800) => {
    let el=Core.q('#toast');
    if(!el){el=document.createElement('div');el.id='toast';el.className='toast';document.body.appendChild(el);}
    clearTimeout(toastTimer);el.textContent=message;el.hidden=false;toastTimer=setTimeout(()=>el.hidden=true,ms);
  };
  class Haptics{
    constructor(){this.last=0;this.calls=0}
    pulse(pattern=18,minGap=55){
      const now=performance.now();if(now-this.last<minGap)return false;this.last=now;this.calls++;
      try{
        if(window.NativeHaptics&&typeof window.NativeHaptics.vibrate==='function'){window.NativeHaptics.vibrate(pattern);return true}
        if(window.webkit?.messageHandlers?.haptics?.postMessage){window.webkit.messageHandlers.haptics.postMessage({pattern});return true}
        if(navigator.vibrate)return !!navigator.vibrate(pattern);
      }catch(_){}
      return false;
    }
    stop(){try{navigator.vibrate?.(0)}catch(_){}}
    supported(){return !!(navigator.vibrate||window.NativeHaptics||window.webkit?.messageHandlers?.haptics)}
  }
  Core.haptics=new Haptics();
  class AudioFX{
    constructor(){this.ctx=null;this.master=null;this.sizzleGain=null;this.sizzleSource=null;this.sizzleFilter=null}
    async unlock(){
      try{
        if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=.34;this.master.connect(this.ctx.destination)}
        if(this.ctx.state==='suspended')await this.ctx.resume();return true
      }catch(_){return false}
    }
    noiseBuffer(seconds=.4){const len=Math.max(1,Math.floor(this.ctx.sampleRate*seconds));const b=this.ctx.createBuffer(1,len,this.ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;return b}
    tone(freq=440,dur=.08,gain=.09,type='sine',offset=0){if(!this.ctx||!this.master)return;const t=this.ctx.currentTime+offset,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+dur+.03)}
    burst(kind='whoosh',intensity=.7){if(!this.ctx||!this.master)return;const t=this.ctx.currentTime,s=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();s.buffer=this.noiseBuffer(.22);f.type=kind==='pop'?'highpass':'bandpass';f.frequency.value=kind==='pop'?900:1700;f.Q.value=kind==='pop'?.5:1.1;const peak=.045+.10*intensity;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+.18);s.connect(f);f.connect(g);g.connect(this.master);s.start(t);s.stop(t+.2)}
    tick(){this.tone(840,.05,.06,'square')}
    pop(){this.burst('pop',.8);this.tone(150,.06,.05,'sine')}
    whoosh(i=.8){this.burst('whoosh',i)}
    success(){this.tone(523,.10,.07,'triangle',0);this.tone(659,.12,.07,'triangle',.09);this.tone(784,.18,.08,'triangle',.19)}
    async startSizzle(intensity=.35){if(!(await this.unlock()))return;if(this.sizzleSource){this.setSizzle(intensity);return}const s=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();s.buffer=this.noiseBuffer(1.1);s.loop=true;f.type='bandpass';f.frequency.value=2600;f.Q.value=.75;g.gain.value=.0001;s.connect(f);f.connect(g);g.connect(this.master);s.start();this.sizzleSource=s;this.sizzleGain=g;this.sizzleFilter=f;this.setSizzle(intensity)}
    setSizzle(intensity=.35){if(!this.ctx||!this.sizzleGain)return;intensity=Core.clamp(intensity,0,1);this.sizzleGain.gain.setTargetAtTime(.012+.13*intensity,this.ctx.currentTime,.04);this.sizzleFilter.frequency.setTargetAtTime(1500+3100*intensity,this.ctx.currentTime,.05)}
    stopSizzle(){if(!this.ctx||!this.sizzleSource)return;try{const t=this.ctx.currentTime;this.sizzleGain.gain.setTargetAtTime(.0001,t,.035);const src=this.sizzleSource;setTimeout(()=>{try{src.stop()}catch(_){}},180)}catch(_){}this.sizzleSource=null;this.sizzleGain=null;this.sizzleFilter=null}
    close(){this.stopSizzle();try{this.ctx?.close()}catch(_){}this.ctx=null;this.master=null}
  }
  Core.audio=new AudioFX();
  Core.clickThrough=()=>{Core.track('clickthrough');const url=(typeof window.clickTag==='string'&&window.clickTag)||'https://www.mcdonalds.com/';if(Core.test){Core.toast('Clickthrough verified in self-test.');return}try{window.open(url,'_blank','noopener,noreferrer')}catch(_){location.href=url}};
  Core.makeSparks=(host,count=20)=>{if(!host)return;host.textContent='';for(let i=0;i<count;i++){const s=document.createElement('i');s.className='spark';s.style.left=((i*47)%100)+'%';s.style.bottom=(-10-(i%5)*8)+'%';s.style.setProperty('--d',(1.1+(i%7)*.19)+'s');s.style.setProperty('--dx',(-25+(i%6)*10)+'px');s.style.animationDelay=(-i*.13)+'s';host.appendChild(s)}};
  Core.report=(results)=>{const passed=results.filter(x=>x.pass).length,total=results.length;const errors=[...Core.errors,...results.filter(x=>!x.pass).map(x=>x.name+(x.detail?': '+x.detail:''))];window.__RICHMEDIA_TEST_RESULT__={passed,total,errors,results};document.documentElement.dataset.selftest=errors.length?'failed':'passed';if(Core.test){const pre=document.createElement('pre');pre.id='selftest-report';pre.style.cssText='position:fixed;z-index:99999;left:8px;right:8px;bottom:8px;max-height:46vh;overflow:auto;padding:10px;background:#fff;color:#111;border:3px solid '+(errors.length?'#c00':'#080')+';border-radius:10px;font:11px/1.35 monospace;white-space:pre-wrap';pre.textContent=`SELFTEST ${errors.length?'FAILED':'PASSED'} — ${passed}/${total}\n`+results.map(r=>`${r.pass?'✓':'✗'} ${r.name}${r.detail?' — '+r.detail:''}`).join('\n')+(Core.errors.length?'\n'+Core.errors.join('\n'):'');document.body.appendChild(pre)}return window.__RICHMEDIA_TEST_RESULT__};
  window.RichCore=Core;
})();
