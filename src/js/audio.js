/* 音：BGM（即興の電子音）・効果音・声（VOICEVOX） */
/*JAM-START*/
/* BGM：即興演奏のような電子音（音声ファイルなし。Web Audioで合成）
   ・木や金属をたたいたような短い電子音（FM合成）、やわらかいキック、小さなクリックの3つ。ゆっくりめのテンポ
   ・16分音符のマスに、確率で音を置いていく。前の小節を6〜7割くり返し、残りを毎回少し変えるので、即興のように少しずつ変わり続ける
   ・音の高さは音階の上を1〜2歩ずつ歩く。ときどき休む小節を入れて息をさせる
   ・結果ごとに、テンポ・音の高さ・音階・音数・明るさをはっきり変える（小節の頭で切り替わる） */
function makeJam(ac,out,noiseBuf){
  const MOODS={
    // 通常：ゆっくり（84BPM）。中くらいの高さ。明るくも暗くもない音階（D・E・G・A・C）
    base:{bpm:84,root:146.83,oct:[1,2],scale:[0,2,5,7,10],dens:.55,kick:.8,tick:.45,keep:.75,rest:.15,ratio:[2,3.5,1.41],idx:[1.8,4],dec:[.25,.7],glide:.1,lp:4600,vol:.3},
    // 変わった：少し速め（96BPM）、高く、明るい長調の音階。音数が多く、上向きにすべる
    saved:{bpm:96,root:146.83,oct:[2,4],scale:[0,2,4,7,9],dens:.85,kick:.9,tick:.7,keep:.65,rest:.05,ratio:[2,3,4],idx:[1.5,3.2],dec:[.18,.5],glide:.22,up:1,lp:7500,vol:.27},
    // ちょっと変わった：ゆっくり（76BPM）。中くらいの高さで、音数は控えめ
    partial:{bpm:76,root:146.83,oct:[1,2],scale:[0,2,4,7,10],dens:.5,kick:.7,tick:.3,keep:.78,rest:.15,ratio:[2,1.41],idx:[1.4,2.8],dec:[.3,.8],glide:.08,lp:3200,vol:.28},
    // 変わらなかった：とてもゆっくり（62BPM）、低く、短調の音階。音はまばら。怖くはしない
    lost:{bpm:62,root:73.42,oct:[1,2],scale:[0,3,5,7,10],dens:.3,kick:.5,tick:.12,keep:.8,rest:.3,ratio:[1.41,2],idx:[1,2],dec:[.4,1],glide:.04,dn:1,lp:1600,vol:.32}
  };

  const MASK={
    kick:[1,0,0,.12, 0,0,.25,0, .55,0,0,.18, 0,.22,0,0],
    blip:[.6,0,.12,.35, 0,.2,0,.4, .45,0,.2,.35, 0,.3,.1,.15],
    tick:[0,0,.55,0, .25,0,.55,0, 0,0,.55,0, .25,0,.55,.2]
  };
  const lp=ac.createBiquadFilter();lp.type="lowpass";lp.frequency.value=5200;lp.Q.value=.4;
  const bus=ac.createGain();bus.gain.value=MOODS.base.vol;bus.connect(lp);lp.connect(out);
  const R=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
  function noteFreq(M,deg){const n=M.scale.length,o=Math.floor(deg/n),s=((deg%n)+n)%n;return M.root*M.oct[0]*Math.pow(2,o+M.scale[s]/12)}
  function kick(t,v){const o=ac.createOscillator(),g=ac.createGain();o.frequency.setValueAtTime(115,t);o.frequency.exponentialRampToValueAtTime(42,t+.13);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.003);g.gain.exponentialRampToValueAtTime(.0001,t+.38);o.connect(g);g.connect(bus);o.start(t);o.stop(t+.42)}
  function tick(t,v){const n=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();n.buffer=noiseBuf(.05);f.type="bandpass";f.frequency.value=R(2600,3800);f.Q.value=2;
    g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+.03);n.connect(f);f.connect(g);g.connect(bus);n.start(t);n.stop(t+.05)}
  function blip(t,f,p){
    const c=ac.createOscillator(),mo=ac.createOscillator(),mg=ac.createGain(),g=ac.createGain(),pn=ac.createStereoPanner?ac.createStereoPanner():null;
    c.frequency.setValueAtTime(f,t);mo.frequency.setValueAtTime(f*p.ratio,t);
    if(p.to){c.frequency.exponentialRampToValueAtTime(p.to,t+.07);mo.frequency.exponentialRampToValueAtTime(p.to*p.ratio,t+.07)}
    mg.gain.setValueAtTime(f*p.idx,t);mg.gain.exponentialRampToValueAtTime(Math.max(1,f*.05),t+p.dec*.6);mo.connect(mg);mg.connect(c.frequency);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(p.v,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+p.dec);c.connect(g);
    if(pn){pn.pan.value=p.pan;g.connect(pn);pn.connect(bus)}else g.connect(bus);
    c.start(t);mo.start(t);c.stop(t+p.dec+.05);mo.stop(t+p.dec+.05);
  }
  function state(){return{prev:{kick:{},blip:{},tick:{}},deg:3,patch:null,bar:0,mood:""}}
  // 1小節分の音を、t0 から予約する。小節の長さ（秒）を返す
  function scheduleBar(m,t0,st){
    const M=MOODS[m]||MOODS.base,step=60/M.bpm/4,sw=step*.1;
    if(st.mood!==m){st.mood=m;st.patch=null;st.prev={kick:{},blip:{},tick:{}};st.deg=Math.floor(M.scale.length*1.5);
      bus.gain.setTargetAtTime(M.vol,t0,.3);lp.frequency.setTargetAtTime(M.lp,t0,.3)}
    if(!st.patch||st.bar%4===0&&Math.random()<.5)st.patch={ratio:pick(M.ratio),idx:R(M.idx[0],M.idx[1])};
    const resting=Math.random()<M.rest,top=M.scale.length*2+1,next={kick:{},blip:{},tick:{}};
    for(let s=0;s<16;s++){
      const t=t0+s*step+(s%2?sw:0);
      // キック
      let k=st.prev.kick[s];if(!(k&&Math.random()<M.keep))k=Math.random()<MASK.kick[s]*M.kick?R(.35,.5)*(s===0?1:.75):0;
      if(k){kick(t,k);next.kick[s]=k}
      // クリック
      let c=st.prev.tick[s];if(!(c&&Math.random()<M.keep))c=Math.random()<MASK.tick[s]*M.tick?R(.03,.06):0;
      if(c){tick(t,c);next.tick[s]=c}
      // 電子音：前の小節をくり返すか、音階の上を歩いて新しく置く
      let b=st.prev.blip[s];
      if(!(b&&Math.random()<M.keep)){
        b=null;
        if(Math.random()<MASK.blip[s]*M.dens*(resting?.25:1)){
          const dir=M.up?(Math.random()<.65?1:-1):M.dn?(Math.random()<.65?-1:1):(Math.random()<.5?1:-1);
          st.deg=Math.max(0,Math.min(top,st.deg+dir*(Math.random()<.7?1:2)));
          const f=noteFreq(M,st.deg);
          b={f,to:Math.random()<M.glide?f*Math.pow(2,(M.up?2:M.dn?-2:pick([-2,2]))/12):0,v:R(.6,1)*(s%4===0?1:.75),dec:R(M.dec[0],M.dec[1]),pan:R(-.45,.45)};
        }
      }
      if(b){blip(t,b.f,{...b,ratio:st.patch.ratio,idx:st.patch.idx});next.blip[s]=b}
    }
    st.prev=next;st.bar++;
    return 16*step;
  }
  return{scheduleBar,state};
}
/*JAM-END*/

/* サウンド（Web Audioで合成。音声ファイルなし） */
const SND=(()=>{
  let ac=null,master=null,bgmBus=null,sfxBus=null,on=false,bgmNodes=null;
  on=true;try{on=localStorage.getItem("mirai_rescue_sound")!=="off"}catch{}
  const btn=$("#snd");
  function ui(){btn.textContent=on?"音あり":"音なし";btn.setAttribute("aria-pressed",on)}
  function init(){
    if(ac)return;
    ac=new (window.AudioContext||window.webkitAudioContext)();
    master=ac.createGain();master.gain.value=Number(lsGet("mirai_master_vol",".8"));master.connect(ac.destination);
    // 空間っぽさ用のディレイ
    const dl=ac.createDelay(1),fb=ac.createGain(),wet=ac.createGain();
    dl.delayTime.value=.33;fb.gain.value=.38;wet.gain.value=.35;
    dl.connect(fb);fb.connect(dl);dl.connect(wet);wet.connect(master);
    // BGM用の残響（ノイズから作った響き）
    const rev=ac.createConvolver(),rw=ac.createGain(),len=ac.sampleRate*1.6,ir=ac.createBuffer(2,len,ac.sampleRate);
    for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3)}
    rev.buffer=ir;rw.gain.value=.22;rev.connect(rw);rw.connect(master);
    bgmBus=ac.createGain();bgmBus.gain.value=0;bgmBus.connect(master);bgmBus.connect(rev);
    sfxBus=ac.createGain();sfxBus.gain.value=.9;sfxBus.connect(master);sfxBus.connect(dl);
  }
  function noiseBuf(sec){const b=ac.createBuffer(1,ac.sampleRate*sec,ac.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b}
  function tone(freq,dur,{type="sine",vol=.3,at=0,slide=0,bus=sfxBus}={}){
    if(!ac||!on)return;const t=ac.currentTime+at,o=ac.createOscillator(),g=ac.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+dur);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(bus);o.start(t);o.stop(t+dur+.05);
  }
  function noise(dur,{vol=.3,f=2000,q=1,type="bandpass",at=0,fTo=0}={}){
    if(!ac||!on)return;const t=ac.currentTime+at,n=ac.createBufferSource(),fl=ac.createBiquadFilter(),g=ac.createGain();
    n.buffer=noiseBuf(dur+.1);fl.type=type;fl.frequency.setValueAtTime(f,t);if(fTo)fl.frequency.exponentialRampToValueAtTime(fTo,t+dur);fl.Q.value=q;
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    n.connect(fl);fl.connect(g);g.connect(sfxBus);n.start(t);n.stop(t+dur+.05);
  }
  /* BGM：即興演奏のような電子音（makeJam）を、小節ごとに少し先まで予約していく */
  let mood="base",jam=null,jst=null,nextBar=0,jamTimer=null;
  function setMood(m){mood=["base","saved","partial","lost"].includes(m)?m:"base"} // 次の小節の頭から切り替わる
  function bgmStart(){
    if(!ac||bgmNodes)return;
    bgmNodes=true;jam=makeJam(ac,bgmBus,noiseBuf);jst=jam.state();nextBar=ac.currentTime+.15;
    jamTimer=setInterval(()=>{
      if(!on||!ac||ac.state!=="running")return;
      const now=ac.currentTime;if(nextBar<now)nextBar=now+.05; // タブが裏にあって遅れたら、今から再開
      while(nextBar<now+.3)nextBar+=jam.scheduleBar(mood,nextBar,jst);
    },100);
    bgmBus.gain.cancelScheduledValues(ac.currentTime);bgmBus.gain.setTargetAtTime(1,ac.currentTime,1.2);
  }
  function bgmDuck(v,tc=.3){if(ac)bgmBus.gain.setTargetAtTime(on?v:0,ac.currentTime,tc)}
  function setOn(v){
    on=v;try{localStorage.setItem("mirai_rescue_sound",on?"on":"off")}catch{}ui();
    if(on){init();ac.resume();bgmStart();bgmDuck(1,1)}else if(ac){bgmDuck(0,.2)}
  }
  btn.onclick=()=>setOn(!on);
  ui();
  // ブラウザは操作前に音を鳴らせないので、最初のクリックで開始
  function unlock(){if(on){init();if(ac.state!=="running")ac.resume();bgmStart()}}
  document.addEventListener("pointerdown",unlock);
  document.addEventListener("keydown",unlock);
  // ボタンのクリック音
  document.addEventListener("click",e=>{if(e.target.closest(".cta,.btn-quiet"))tone(880,.08,{type:"square",vol:.06,slide:1320})});
  return{
    shutter(){noise(.12,{vol:.5,f:3000,q:.7,type:"highpass"});tone(1600,.05,{type:"square",vol:.12})},
    warp(){
      if(!ac||!on)return()=>{};
      bgmDuck(.35,1.5);
      const t=ac.currentTime,D=12;
      // ゆっくり持ち上がる柔らかいパッド（5度の和音）
      const pad=ac.createGain(),fl=ac.createBiquadFilter();
      fl.type="lowpass";fl.Q.value=2;fl.frequency.setValueAtTime(350,t);fl.frequency.linearRampToValueAtTime(1800,t+D);
      const lfo=ac.createOscillator(),lg=ac.createGain();lfo.frequency.value=.25;lg.gain.value=180;lfo.connect(lg);lg.connect(fl.frequency);
      pad.gain.setValueAtTime(0,t);pad.gain.linearRampToValueAtTime(.07,t+3);
      const oscs=[110,165,220.5].map((f,i)=>{const o=ac.createOscillator();o.type=i===1?"sine":"triangle";
        o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*2,t+D);o.connect(fl);return o});
      fl.connect(pad);pad.connect(sfxBus);
      // 遠くを流れる風（こもった音）
      const n=ac.createBufferSource(),nf=ac.createBiquadFilter(),ng=ac.createGain();
      n.buffer=noiseBuf(2);n.loop=true;nf.type="lowpass";nf.Q.value=.7;nf.frequency.setValueAtTime(250,t);nf.frequency.linearRampToValueAtTime(1200,t+D);
      ng.gain.setValueAtTime(0,t);ng.gain.linearRampToValueAtTime(.05,t+4);
      n.connect(nf);nf.connect(ng);ng.connect(sfxBus);
      [lfo,n,...oscs].forEach(x=>x.start(t));
      // 時を刻む小さな音（1秒ごと、少しずつ高く）
      let i=0;const tick=setInterval(()=>{tone(1320+Math.min(i,20)*25,.12,{type:"sine",vol:.025});i++},1000);
      return()=>{clearInterval(tick);const e=ac.currentTime;
        pad.gain.cancelScheduledValues(e);ng.gain.cancelScheduledValues(e);
        pad.gain.setTargetAtTime(0,e,.25);ng.gain.setTargetAtTime(0,e,.3);[lfo,n,...oscs].forEach(x=>x.stop(e+1.5))};
    },
    arrive(){
      tone(110,1.4,{vol:.25,slide:55});noise(.9,{vol:.12,f:600,q:.5,type:"lowpass",fTo:120});
      [523.3,659.3,784,1046.5].forEach((f,i)=>tone(f,2.2,{type:"sine",vol:.06,at:.05+i*.08}));
      setTimeout(()=>bgmDuck(1,1.5),900);
    },
    glitch(){for(let i=0;i<7;i++)tone(200+Math.random()*1800,.05,{type:"square",vol:.06,at:i*.09})},
    stamp(){tone(90,.25,{vol:.5,slide:50});noise(.1,{vol:.4,f:1200,q:.8})},
    unlock(){unlock()},
    isOn:()=>on,
    duck(v){bgmDuck(v,.4)},
    setVol(v){lsSet("mirai_master_vol",String(v));if(master)master.gain.value=v},
    vol:()=>Number(lsGet("mirai_master_vol",".8")),
    mood(m){setMood(m);bgmDuck(1,1)},
    win(big){[523.3,659.3,784,1046.5].forEach((f,i)=>tone(f,.5,{type:"triangle",vol:.09,at:i*.11}));if(big)tone(1568,1.2,{type:"sine",vol:.06,at:.5})},
    lose(){tone(392,.3,{type:"triangle",vol:.08,slide:370});tone(311,.6,{type:"triangle",vol:.08,at:.28,slide:260})},
    type(){tone(1700+Math.random()*500,.025,{type:"square",vol:.012})},
    static(){noise(.22,{vol:.06,f:2600,q:.6});tone(60,.15,{type:"square",vol:.03})},
    tick(){noise(.06,{vol:.035,f:4000,q:1})},
    error(){tone(330,.25,{type:"sawtooth",vol:.12,slide:165});tone(220,.4,{type:"sawtooth",vol:.12,at:.22,slide:110});bgmDuck(1,1)}
  };
})();


/* ===== minatoの声 =====
   展示PCで動かす VOICEVOX（無料の音声合成ソフト）に文章を送り、返ってきた音声を再生する。
   VOICEVOX が起動していないときは、ブラウザ内蔵の読み上げで代用する */
const VOICE=(()=>{
  let base=lsGet("mirai_vv_url","http://127.0.0.1:50021"),spk=Number(lsGet("mirai_vv_speaker","6")),vol=Number(lsGet("mirai_voice_vol","1"));
  let ok=null,cur=null,token=0,spkName="",names={};const cache=new Map();
  // 差出人の声（世界ごと）。既定：透＝玄野武宏、美月＝冥鳴ひまり、ひなた＝ずんだもん。スタッフ用パネルで変えられる
  const SPK_DEF=[11,14,3],PITCH=[.78,1.15,1.45]; // PITCH はブラウザ内蔵の声で代用するときの高さ
  const storySpk=i=>Number(lsGet("mirai_vv_speaker_s"+i,String(SPK_DEF[i]??spk)));
  async function check(){
    try{const r=await fetch(base+"/version",{signal:AbortSignal.timeout(1500)});ok=r.ok}catch{ok=false}
    if(ok)speakers().then(list=>{names={};list.forEach(x=>names[x.id]=x);const s=names[spk];spkName=s?s.name:"";credit()}).catch(()=>{});
    return ok;
  }
  async function speakers(){
    const r=await fetch(base+"/speakers",{signal:AbortSignal.timeout(3000)});const j=await r.json();
    return j.flatMap(c=>c.styles.map(s=>({id:s.id,name:`${c.name}（${s.name}）`,chara:c.name})));
  }
  // クレジット：minatoと3人の差出人で使っているキャラクターを全部出す
  function credit(){const el=$("#vvcredit");if(!el)return;
    const ch=[...new Set([spk,...SPK_DEF.map((_,i)=>storySpk(i))].map(id=>names[id]?.chara).filter(Boolean))];
    el.textContent=ok&&ch.length?`音声：VOICEVOX:${ch.join("、VOICEVOX:")}`:""}
  const READ=[[/minato/gi,"ミナト"],[/美月/g,"みづき"],[/透(?!明)/g,"とおる"]];
  function clean(t){let r=String(t);READ.forEach(([a,b])=>r=r.replace(a,b));return r.replace(/[「」『』]/g,"").replace(/…+/g,"、").replace(/！？|!\?/g,"？")}
  function synth(text,id=spk){
    const key=id+"|"+text;if(cache.has(key))return cache.get(key);
    const p=(async()=>{
      const q=await fetch(`${base}/audio_query?speaker=${id}&text=${encodeURIComponent(clean(text))}`,{method:"POST"});if(!q.ok)throw new Error("audio_query "+q.status);
      const qj=await q.json();qj.speedScale=1.1;qj.intonationScale=1.2;qj.prePhonemeLength=.05;qj.postPhonemeLength=.1;
      const r=await fetch(`${base}/synthesis?speaker=${id}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(qj)});if(!r.ok)throw new Error("synthesis "+r.status);
      return URL.createObjectURL(await r.blob());
    })();
    cache.set(key,p);p.catch(()=>cache.delete(key));
    if(cache.size>40){const k=cache.keys().next().value;cache.delete(k)}
    return p;
  }
  // 話し終わりを知らせる（say は話し終わると解決する Promise を返す。止めたときも解決する）
  let endFn=null;
  function endNow(){const f=endFn;endFn=null;if(f)f()}
  function browserSay(text,my,pitch=1.05){
    if(!("speechSynthesis" in window))return endNow();
    const u=new SpeechSynthesisUtterance(clean(text));u.lang="ja-JP";u.rate=1.08;u.pitch=pitch;u.volume=Math.min(1,vol);
    const v=speechSynthesis.getVoices().find(v=>v.lang&&v.lang.startsWith("ja"));if(v)u.voice=v;
    u.onstart=()=>SND.duck(.35);u.onend=u.onerror=()=>{if(my===token){SND.duck(1);endNow()}};
    speechSynthesis.speak(u);
  }
  function stop(){token++;if(cur){cur.pause();cur=null}try{speechSynthesis.cancel()}catch{}SND.duck(1);endNow()}
  // opt.story に世界の番号を渡すと、その世界の差出人の声で話す（渡さなければ minato の声）
  const who=opt=>opt&&opt.story!=null?{id:storySpk(opt.story),pitch:PITCH[opt.story]??1}:{id:spk,pitch:1.05};
  function say(text,opt){
    stop(); // 前の声を止めてから話す（二重に再生しない）
    const p=new Promise(r=>endFn=r);run(text,who(opt));return p;
  }
  async function run(text,w){
    if(!text||!SND.isOn())return endNow();
    const my=token;
    if(ok===null)await check();
    if(my!==token)return;
    if(!ok)return browserSay(text,my,w.pitch);
    try{
      const url=await synth(text,w.id);if(my!==token)return;
      const a=new Audio(url);a.volume=Math.max(0,Math.min(1,vol));cur=a;
      a.onplay=()=>SND.duck(.35);a.onended=a.onerror=()=>{if(my===token){cur=null;SND.duck(1);endNow()}};
      await a.play();
    }catch(e){if(my===token)browserSay(text,my,w.pitch)}
  }
  check();
  return{
    say,stop,
    // 先に音声を作っておき、話し始めの待ちをなくす（作り終わると解決する Promise を返す）
    prepare(text,opt){return ok&&text?synth(text,who(opt).id).then(()=>{},()=>{}):Promise.resolve()},
    status:async()=>{await check();return{ok,base,spk,spkName}},
    storySpk,setStorySpeaker(i,id){lsSet("mirai_vv_speaker_s"+i,String(Number(id)));credit()},
    speakers,
    setSpeaker(id){spk=Number(id);lsSet("mirai_vv_speaker",String(spk));cache.clear();check()},
    setVol(v){vol=v;lsSet("mirai_voice_vol",String(v));if(cur)cur.volume=Math.max(0,Math.min(1,v))},
    vol:()=>vol,credit
  };
})();
