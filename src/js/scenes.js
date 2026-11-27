/* ===== 画面：体験の流れ（14画面・約2分20秒） =====
   1画面に1つのことだけを出す。ボタンを押すのは「はじめる」「未来を選ぶ」「撮影して送る」の3回。
   ほかは声が終わると自動で進む（下の段の「次へ」の線が残り時間。押せばすぐ進む）。声が流れているあいだはボタンを受け付けない */

const INTRO=["ここは、2045年の未来と手紙をやりとりする、時空郵便局。","未来の人から、手紙が届いてる。返事の代わりに、物を1つ送ってあげて。"];
const SELECT_LINE="読みたい未来が光ったら、ボタンを押して。";
const PICK_LINE="じゃあ、これにしよう。";
const SHELF_LINE="右の棚の物でも、自分の持ち物でもいいよ。";
const ENCLOSE="写真を1枚、同封します。";
const FIG_HTML=`<div class="fig"><canvas id="fig"></canvas></div>`;

/* ---------- 1. 待機：名前 → 2026と2045をつなぐ → ひとこと → 配達数 をくり返す ---------- */
function pageTitle(){
  setTimeout(()=>INTRO.forEach(l=>VOICE.prepare(l)),3000); // 自己紹介の声を先に作っておく
  SND.mood("base");stopCam();document.body.classList.remove("desat");
  const alive=scene("title",`<section class="sc sc-title">
    <div class="op-frames">
      <div class="op-frame op-title" data-frame><p class="op-en t-display" data-in>SPACETIME POST OFFICE</p><h1 class="t-h1" data-in style="--d:180ms">時空郵便局</h1></div>
      <div class="op-frame" data-frame data-route>
        <div class="route" aria-label="2026年と2045年を郵便でつないでいます">
          <div class="route-end" data-in><span class="t-cap">差出し</span><span class="t-num">2026</span></div>
          <div class="route-line"><i class="packet packet--letter" id="pkLetter"></i><i class="packet packet--object" id="pkObject"></i></div>
          <div class="route-end route-to"><span class="t-cap" data-in style="--d:500ms">宛先</span>
            <span class="boxes boxes--year" id="year">${String(YEAR).split("").map((c,i)=>`<b style="--d:${600+i*80}ms">${c}</b>`).join("")}</span></div>
        </div>
        <p class="t-lead route-note" data-in style="--d:900ms">2026年と2045年を、郵便でつないでいます。</p>
      </div>
      <div class="op-frame" data-frame><p class="op-copy" data-in>2045年の誰かの日常を、<br>ちょっと変える。</p></div>
      <div class="op-frame" data-frame data-count><div class="op-count" data-in><span id="opCount"></span><p class="t-lead">通の配達が、<br>これまでに届きました。</p></div></div>
    </div>
    <div class="sc-title-foot">
      <p class="t-cap">撮影した写真と結果は、記録のため保存されます。人の顔が写らないように撮ってください。<span id="vvcredit"></span></p>
      <ol class="op-steps" aria-hidden="true"></ol>
    </div>
  </section>`,{status:"受付中"});
  VOICE.credit();
  /* 配達数（スプレッドシートの全員分）。まだ0件のときは、配達数のカードを出さない */
  const upd=t=>{const n=tallyTotal(t),el=$("#opCount");if(el)el.innerHTML=boxes(String(n).padStart(Math.max(3,String(n).length),"0"))};
  upd(tally);tallyListeners.push(upd);loadTally();cleanup.push(()=>{tallyListeners=tallyListeners.filter(f=>f!==upd)});
  const FRAME=4800,frames=$$("[data-frame]"),stepsEl=$(".op-steps");
  document.documentElement.style.setProperty("--frame",FRAME+"ms");
  const run=el=>{el.classList.remove("is-moving");void el.offsetWidth;el.classList.add("is-moving")};
  // 手紙が2045→2026へ、物が2026→2045へ渡り、宛先の枠が光る（時空をつないでいる）
  const connect=()=>{if(!alive())return;run($("#pkLetter"));
    setTimeout(()=>alive()&&run($("#pkObject")),REDUCE?0:1700);
    setTimeout(()=>{const y=$("#year");if(!alive()||!y)return;y.classList.remove("is-arrived");void y.offsetWidth;y.classList.add("is-arrived")},REDUCE?0:3500)};
  let i=-1;
  const show=()=>{
    if(!alive())return;
    const list=frames.filter(f=>!f.hasAttribute("data-count")||tallyTotal(tally)>0);
    i=(i+1)%list.length;
    stepsEl.innerHTML=list.map((_,k)=>`<li class="${k===i?"is-on":k<i?"is-done":""}"></li>`).join("");
    frames.forEach(f=>f.classList.toggle("is-on",f===list[i]));
    if(list[i].hasAttribute("data-route"))setTimeout(connect,700);
  };
  show();const iv=setInterval(show,FRAME);cleanup.push(()=>clearInterval(iv));
  setPush(pressLabel("はじめる"),pageIntro);
}

/* ---------- 2〜3. ミナトが話す画面：左にミナト、右にセリフ1つ ---------- */
function pageMinato({page,line,chapter=1,next,hold=1200}){
  const alive=scene(page,`<section class="sc sc-minato">
    <figure class="mi-fig">${FIG_HTML}<figcaption class="t-cap">ミナト　時空郵便局の局員</figcaption></figure>
    <p class="mi-line" id="line"><span class="cur"></span></p>
  </section>`,{chapter});
  unmountFig=minatoFigure($("#fig"),{talk:true});
  setNote("ミナトの声");
  (async()=>{
    await sleep(300);if(!alive())return;
    await ready(line);if(!alive())return;
    await Promise.all([typeOut($("#line"),line,alive),talk(line)]);
    if(alive())autoNext(hold,next);
  })();
  return alive;
}
function pageIntro(){
  INTRO.forEach(l=>VOICE.prepare(l));VOICE.prepare(SELECT_LINE);FUTURES.forEach(f=>VOICE.prepare(f.key+"未来"));
  const step=k=>pageMinato({page:"intro",line:INTRO[k],next:k<INTRO.length-1?()=>step(k+1):pageSelect,hold:k<INTRO.length-1?700:1000});
  step(0);
}

/* ---------- 4. 未来を選ぶ：3つの未来が順に光り、光っているときにボタンを押すと決まる ---------- */
function pageSelect(){
  const STEP=2800,LAPS=2;
  const alive=scene("select",`<section class="sc sc-select">
    <h2 class="sl-q">どの未来から届いた手紙を読みますか？</h2>
    <ol class="sl-cards">${FUTURES.map((f,i)=>`<li class="sl-card" data-i="${i}"><span class="sl-key">${esc(f.key)}</span><b class="sl-title">${esc(f.title)}</b><p class="sl-line">${esc(f.line)}</p></li>`).join("")}</ol>
    <p class="t-lead sl-hint">読みたい未来が光ったら、ボタンを押してください。</p>
  </section>`,{chapter:1,status:"未来を選んでいます"});
  const cards=$$(".sl-card");let cur=-1,count=0,done=false,t=null;
  const light=i=>{cur=i;cards.forEach((c,k)=>c.classList.toggle("is-on",k===i));SND.tick();VOICE.stop();VOICE.say(FUTURES[i].key+"未来")};
  const choose=i=>{
    if(done||!alive())return;done=true;clearTimeout(t);clearPush();setNote("");
    setFuture(i);cards.forEach((c,k)=>{c.classList.toggle("is-on",k===i);c.classList.toggle("is-picked",k===i);c.classList.toggle("is-off",k!==i)});
    SND.stamp();
    letterVoices();
    setTimeout(()=>alive()&&pageArrive(),900);
  };
  const tick=async()=>{
    if(done||!alive())return;
    if(count>=FUTURES.length*LAPS){ // 2周しても押されなければ、ミナトが選ぶ
      clearPush();setNote("ミナトの声");await talk(PICK_LINE);return choose(cur<0?0:cur);
    }
    light(count%FUTURES.length);count++;
    setPush(pressLabel("この未来にする"),()=>choose(cur));
    t=setTimeout(tick,STEP);
  };
  // 画面のカードを直接クリックしても選べる（ウェブ・スマホ用）
  cards.forEach((c,i)=>c.addEventListener("click",()=>choose(i)));
  cleanup.push(()=>clearTimeout(t));
  setNote("ミナトの声");
  (async()=>{await sleep(300);if(!alive())return;await ready(SELECT_LINE);if(!alive())return;await talk(SELECT_LINE);if(!alive()||done)return;setNote("");tick()})();
}
// 選んだ未来の手紙の声を、先に作っておく
function letterVoices(){future.letter.forEach(p=>sentences(p).forEach(s=>VOICE.prepare(s,{story:futureIdx})));VOICE.prepare(future.request,{story:futureIdx});VOICE.prepare(SHELF_LINE)}

/* ---------- 5. 手紙が届く：未来の線画に、封筒が飛んでくる。伝票には差出人だけ ---------- */
function pageArrive(){
  const f=future,line=`${f.name}さんから、手紙が届いた。`;
  VOICE.prepare(line);
  const alive=scene("arrive",`<section class="sc sc-arrive">
    <div class="ar-art" id="art"><div class="env" data-hand="${f.hand}">${ENV_SVG}<span class="env-from">${esc(f.name)}より</span></div></div>
    <div class="ar-slip">
      <div class="field"><span class="field-label">差出人</span><p class="ar-name">${esc(f.name)}</p><p class="t-lead ar-who">${f.age}歳・${esc(f.job)}</p><p class="t-body ar-who">2045年・${esc(f.city)}</p></div>
      <div class="say"><span class="t-cap">ミナト</span><p class="t-lead" id="line"></p></div>
    </div>
  </section>`,{chapter:2,status:"手紙を受信中"});
  const art=worldArtEl(futureIdx);$("#art").prepend(art);drawIn(art,50,800);
  (async()=>{
    await sleep(1700);if(!alive())return;SND.tick();setStatus("2045年と通信中");
    setNote("ミナトの声");await ready(line);if(!alive())return;
    await Promise.all([typeOut($("#line"),line,alive),talk(line)]);
    if(alive())autoNext(1000,()=>pageLetter(0));
  })();
}

/* ---------- 6. 手紙：便せん1枚。差出人の手書きの書体で、読み上げに合わせて1文ずつ文字が浮かび上がる ---------- */
// 文を1文字ずつ <i> に入れる（文字が順に浮かび上がるアニメーション用）
const inkChars=t=>[...t].map((c,i)=>`<i style="--i:${i}">${esc(c)}</i>`).join("");
function letterPage({page,text,hand,to,sign,next,status,chapter}){
  const sent=sentences(text);
  const alive=scene(page,`<section class="sc sc-letter">
    <article class="paper letter" data-hand="${hand}">
      ${to?`<p class="paper-to">${esc(to)}</p>`:""}
      <p class="lt-body">${sent.map(s=>`<span class="lt-s">${inkChars(s)}</span>`).join("")}</p>
      ${sign?`<p class="lt-sign">${esc(sign)}</p>`:""}
    </article>
  </section>`,{chapter,status});
  document.body.dataset.calm="1";
  setNote(`${future.name}の声`);
  (async()=>{
    await sleep(700);
    const els=$$(".lt-s");
    for(let i=0;i<sent.length;i++){
      await ready(sent[i],{story:futureIdx});if(!alive())return;
      els[i].classList.add("is-on");if(!i)SND.tick();
      const my=talkSkip;
      await talk(sent[i],{story:futureIdx});if(!alive())return;
      if(talkSkip!==my)els[i].classList.add("is-done"); // 飛ばしたら、その文を一度に出す
      await sleep(160);
    }
    $(".lt-sign")?.classList.add("is-on");
    if(alive())autoNext(1600,next);
  })();
}
function pageLetter(){
  letterPage({page:"letter",text:future.letter.join(""),hand:future.hand,to:"2026年の、だれかへ",sign:`2045年　${future.name}より`,next:pageRequest,status:"2045年と通信中",chapter:2});
}

/* ---------- 8. お願いと選び方 ---------- */
function pageRequest(){
  getCam().catch(()=>{}); // カメラを先に起動しておく（撮影の画面ですぐ映るように）
  const f=future;
  const alive=scene("request",`<section class="sc sc-request">
    <p class="t-cap">${esc(f.name)}からのお願い</p>
    <p class="rq-text">${f.rql.map(x=>`<span>${esc(x)}</span>`).join("")}</p>
    <div class="rq-hint"><span class="t-cap">選び方のヒント</span><p class="t-lead">${esc(f.hint)}</p><p class="t-lead rq-shelf">右の棚の物でも、自分の持ち物でもOK。</p></div>
  </section>`,{chapter:3});
  (async()=>{
    setNote(`${f.name}の声`);await sleep(500);if(!alive())return;SND.tick();
    await ready(f.request,{story:futureIdx});if(!alive())return;
    await talk(f.request,{story:futureIdx});if(!alive())return;
    setNote("ミナトの声");await ready(SHELF_LINE);if(!alive())return;await talk(SHELF_LINE);
    if(alive())autoNext(1800,pageCamera);
  })();
}

/* ---------- 9. 撮影：カメラが主役。オレンジの枠（郵便番号枠）の中に物を置く ---------- */
async function pageCamera(){
  const f=future;
  const alive=scene("camera",`<section class="sc sc-camera">
    <div class="cm-view" id="cam"><video id="v" autoplay playsinline muted></video><i class="cm-box" aria-hidden="true"></i><span class="cm-rec t-data" id="clk"></span></div>
    <div class="cm-side">
      <div class="field"><span class="field-label">${esc(f.name)}からのお願い</span><p class="t-lead">${esc(f.request)}</p></div>
      <p class="t-lead cm-hint" id="camHint">オレンジの枠の中に、物を1つ置いてください。</p>
    </div>
    <input type="file" id="file" accept="image/*" capture="environment" hidden>
  </section>`,{chapter:3,status:"カメラを準備中"});
  document.body.dataset.calm="1";
  const clk=()=>{const c=$("#clk");if(c){const d=new Date();c.innerHTML=digits(`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")} ${d.toTimeString().slice(0,8)}`)}};
  clk();const iv=setInterval(clk,1000);cleanup.push(()=>clearInterval(iv));
  const fileIn=$("#file");
  fileIn.onchange=e=>{const fl=e.target.files[0];if(!fl)return;const img=new Image();img.onload=()=>{const c=document.createElement("canvas");c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext("2d").drawImage(img,0,0);URL.revokeObjectURL(img.src);SND.shutter();send(c)};img.src=URL.createObjectURL(fl)};
  try{
    const st=await getCam();
    const v=$("#v");if(!alive()||!v){stopCam();return}
    v.srcObject=st;await v.play().catch(()=>{});
    const shoot=()=>{
      if(!v.videoWidth){setPush(pressLabel("撮影して送る"),shoot);return}
      const c=document.createElement("canvas");c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").drawImage(v,0,0);
      SND.shutter();flash();send(c);
    };
    if(!alive())return;
    setStatus("撮影できます");setPush(pressLabel("撮影して送る"),shoot);
  }catch(e){
    if(!alive())return;
    const why=e?.name==="NotAllowedError"?"カメラの使用が許可されていません。":e?.name==="NotFoundError"||e?.name==="OverconstrainedError"?"カメラが見つかりません。":"カメラを起動できませんでした。";
    $("#cam").insertAdjacentHTML("beforeend",`<div class="cm-none"><p class="t-lead">${why}</p><p class="t-body">USBカメラの接続を確認してください。${EXHIBIT?"（スタッフ：Ctrl+Shift+S）":"写真を選んで送ることもできます。"}</p></div>`);
    setStatus("カメラが使えません");
    if(EXHIBIT)setPush(pressLabel("もう一度ためす"),pageCamera);
    else{const pick=()=>{fileIn.click();setPush("写真を選ぶ",pick)};setPush("写真を選ぶ",pick)}
  }
}

/* ---------- 撮った物を送る：撮影した瞬間に、返信と判定をAIに頼み始める（待ち時間を転送の演出で隠す） ---------- */
function send(srcCanvas){
  const img=scaled(srcCanvas,1024),thumb=square(srcCanvas,360),gthumb=crop32(srcCanvas,450);
  pageWarp({img,thumb,gthumb,job:startMission(img,thumb,gthumb)});
}
function startMission(img,thumb,gthumb){
  let done=false;
  const p=(async()=>{
    try{
      if(!window.GAS_URL)throw {code:"no_config"};
      const image=img.toDataURL("image/jpeg",.85).split(",")[1];
      const r=await fetch(window.GAS_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({image,mode:"mission",story:futureIdx,gthumb:gthumb.split(",")[1]}),signal:AbortSignal.timeout(90000)});
      const t=await r.text();let d;
      try{d=JSON.parse(t)}catch{throw {code:"bad_response",detail:"GASからJSON以外の応答（"+r.status+"）。デプロイのアクセス権が「全員」か、URLが /exec で終わっているか確認してください。"}}
      if(!d.ok)throw {code:d.error||"server_error",detail:d.detail};
      if(d.stats)setTally(d.stats);
      const res=d.result;res._row=Number(d.row)||0;
      res.reply=Array.isArray(res.reply)?res.reply:[String(res.reply||"")];
      res._score=Math.max(0,Math.min(100,Number(res.score)||0));res._o=outcomeOf(res._score);
      res.thumb=thumb;
      // 同封の写真は、返信を読んでいるあいだに描いてもらう
      res._illP=fetchIllust(res,res._o,thumb).catch(()=>null);
      res._illP.then(a=>{res._ill=a});
      res.reply.forEach(p=>sentences(p).forEach(s=>VOICE.prepare(s,{story:futureIdx})));VOICE.prepare(ENCLOSE,{story:futureIdx});
      const rec={wait:ILL.engine()!=="off",row:res._row,outcome:res._o,item:res.item_name,reply:res.reply,reason:res.reason,gap_line:res.gap_line,story:futureIdx,at:Date.now(),thumb:gthumb,report:null};
      res._rec=rec;GAL.remember(rec);
      // 想像図とレポートは、届きしだい左の画面へ（メインの画面が先へ進んでいても）
      res._illP.then(a=>{if(a)shareIll(rec,a);else GAL.illFail(rec)}).catch(()=>GAL.illFail(rec));
      fetchReport(res,rec);
      return{res};
    }catch(e){return{err:e&&e.code?e:{code:"network",detail:String(e&&e.message||e)}}}
    finally{done=true}
  })();
  return{p,done:()=>done};
}

/* ---------- 10. 転送：撮った物が粒子になって2045年へ。年の枠が2026から2045まで進む ---------- */
async function pageWarp(d){
  const alive=scene("warp",`<section class="sc sc-warp">
    <div class="wp-hd"><span class="status" id="st">2045年へ送っています</span>
      <div class="wp-year"><span class="t-cap">いま通過している年</span><span class="boxes boxes--year" id="yr">${"2026".split("").map(c=>`<b>${c}</b>`).join("")}</span></div></div>
    <div class="wp-stage"><canvas id="txc"></canvas></div>
  </section>`,{chapter:3,status:"2045年へ送信中"});
  FXB.set("warp");
  const sc=txScene($("#txc"),d.img);cleanup.push(sc.stop);
  const stopW=SND.warp();cleanup.push(stopW);
  const t0=performance.now(),A_SEC=5,yb=[...$("#yr").children];
  const setYear=y=>String(y).split("").forEach((c,i)=>{if(yb[i].textContent!==c)yb[i].textContent=c});
  const ci=setInterval(()=>{const p=Math.min(.999,(performance.now()-t0)/(A_SEC*1000));setYear(2026+Math.floor(p*(YEAR-2026)))},60);cleanup.push(()=>clearInterval(ci));
  await sleep(A_SEC*1000);if(!alive())return;
  clearInterval(ci);stopW();flash();SND.arrive();FXB.set("scan");sc.arrive();
  setYear(YEAR);$("#yr").classList.add("is-arrived");
  $("#st").textContent=`2045年の${future.name}さんに届きました`;setStatus("2045年に到着");
  await sleep(1800);if(!alive())return;
  pageWait(d);
}

/* ---------- 11. 返事を待つ：封筒が2045年（右）から戻ってくる ---------- */
async function pageWait(d){
  const alive=scene("wait",`<section class="sc sc-wait">
    <div class="wt-env" id="wtEnv" data-hand="${future.hand}">${ENV_SVG}<span class="env-from">${esc(future.name)}より</span></div>
    <p class="wt-msg" id="wtMsg">${esc(future.name)}さんの返事を待っています</p>
  </section>`,{chapter:4,status:"2045年と通信中"});
  const t0=performance.now();
  const {res,err}=await d.job.p;if(!alive())return;
  if(err||!res)return fail(err);
  const left=1600-(performance.now()-t0);if(left>0)await sleep(left);if(!alive())return;
  $("#wtEnv").classList.add("is-in");$("#wtMsg").textContent="返事が届きました";SND.tick();
  await sleep(1300);if(!alive())return;
  pageReply(res);
}

/* ---------- 12. 返信の手紙：便せん1枚。最後に「写真を1枚、同封します。」 ---------- */
function pageReply(r){
  letterPage({page:"reply",text:r.reply.join("")+ENCLOSE,hand:future.hand,to:"2026年の、あなたへ",sign:`2045年　${future.name}より`,next:()=>pagePhoto(r),status:"返事を受信中",chapter:4});
}

/* ---------- 13. 同封の写真：想像図を大きく見せるだけ ---------- */
function pagePhoto(r){
  const alive=scene("photo",`<section class="sc sc-photo">
    <div class="ph-view" id="ill"></div>
    <div class="ph-side">
      <p class="t-cap" id="phCap">同封されていた写真</p>
      <p class="t-body ph-note" id="phNote">AIが描いた想像図です。</p>
    </div>
  </section>`,{chapter:4,status:"写真を受信中"});
  document.body.dataset.calm="1";
  let shown=false;
  const put=art=>{
    if(!alive()||shown||!art)return;shown=true;
    const box=$("#ill");box.innerHTML="";box.insertAdjacentHTML("afterbegin",`<div class="ill-out" id="inPh"></div>`);
    const a=art.cloneNode?art.cloneNode(true):art;$("#inPh").append(a);if(a.tagName!=="IMG")drawIn(a,45,700);
    $("#phCap").textContent="同封されていた写真";$("#phNote").textContent="AIが描いた想像図です。";setStatus("写真が届きました");
  };
  // 想像図が間に合わなければ、差出人の世界の線画を出す（想像図はあとで左の画面に届く）
  const fallback=()=>{if(!alive()||shown)return;const art=worldArtEl(futureIdx);$("#ill").innerHTML="";$("#ill").append(art);drawIn(art,50,800);
    $("#phCap").textContent=`${future.name}さんの部屋のあたり`;$("#phNote").textContent="写真は、あとで左の画面に届きます。"};
  if(r._ill)put(r._ill);
  else{const t=setTimeout(fallback,1500);cleanup.push(()=>clearTimeout(t));r._illP?.then(a=>{if(a){clearTimeout(t);if(alive()){shown=false;put(a)}}})}
  const t0=performance.now();
  // 写真を見せる時間は、スタッフ用パネルで変えられる（既定7秒）
  autoNext(Math.max(1500,IDLE.photoSec()*1000-(performance.now()-t0)),()=>pageVerdict(r));
}

/* ---------- 15. 判定：3段階のどれになったかと、理由 ---------- */
function outcomeOf(n){return n>=75?"saved":n>=50?"partial":"lost"}
const VERDICT={saved:n=>`${n}の日常が、変わった`,partial:n=>`${n}の日常が、ちょっと変わった`,lost:n=>`${n}の日常は、変わらなかった`};
const VERDICT_SHORT={saved:"変わった",partial:"ちょっと変わった",lost:"変わらなかった"};
function pageVerdict(r){
  const o=r._o,txt=VERDICT[o](future.name),[a,b]=txt.split("、");
  VOICE.prepare(txt);
  const alive=scene("verdict",`<section class="sc sc-verdict" data-o="${o}">
    <ol class="vd-scale" aria-label="判定の3段階">${["saved","partial","lost"].map(k=>`<li class="${k===o?"is-on":""}">${VERDICT_SHORT[k]}</li>`).join("")}</ol>
    <h2 class="vd-text"><span>${esc(a)}、</span><span>${esc(b)}</span></h2>
    ${r.reason?`<p class="vd-reason">${esc(r.reason)}</p>`:""}
  </section>`,{chapter:4,status:"判定"});
  o==="lost"?SND.lose():SND.win(o==="saved");SND.mood(o);FXB.set(o);
  if(o==="lost")setTimeout(()=>{if(alive())document.body.classList.add("desat")},600);
  setNote("ミナトの声");
  (async()=>{await sleep(800);if(!alive())return;await talk(txt);if(alive())autoNext(2600,()=>pageGap(r))})();
}

/* ---------- 16. あなたの当たり前：ギャップを1文。そのカードが左の画面へ飛んでいく ---------- */
function pageGap(r){
  const o=r._o,line=r.gap_line||"";
  VOICE.prepare(line);
  const alive=scene("gap",`<section class="sc sc-gap">
    <article class="gp-card" id="gpCard">
      <p class="t-cap">${o==="lost"?"2045年でも同じだった、あなたの当たり前":"2045年ではめずらしい、あなたの当たり前"}</p>
      <p class="gp-line">${esc(line)}</p>
      <p class="t-body gp-from">${esc(future.name)}への配達　${r._row?boxes(String(r._row).padStart(6,"0"),"boxes--sm"):""}</p>
    </article>
    <p class="gp-note" id="gpNote" hidden><span class="gp-arrow" aria-hidden="true">←</span>配達完了。詳しいレポートは、左の画面へ。</p>
  </section>`,{chapter:4,status:"配達完了"});
  (async()=>{
    setNote("ミナトの声");await sleep(700);if(!alive())return;
    if(line){await ready(line);if(!alive())return;await talk(line);if(!alive())return}
    setNote("");await sleep(600);if(!alive())return;
    $("#gpCard").classList.add("is-fly");const sw=SND.warp();setTimeout(sw,800);cleanup.push(sw);
    if(r._rec)GAL.fly(r._rec);
    await sleep(900);if(!alive())return;
    $("#gpNote").hidden=false;
    autoNext(4500,pageTitle,"最初の画面へ");
  })();
}

/* ---------- 送れなかったとき ---------- */
function fail(e){
  SND.error();
  const code=e?.code;
  const msg=code==="rate_limited"?"混み合っています。少し待ってから、もう一度送ってください。"
    :code==="no_config"?"送り先が設定されていません（config.js の GAS_URL を設定してください）。"
    :code==="bad_image"?"写真をうまく受け取れませんでした。もう一度撮ってください。"
    :"2045年へ送れませんでした。もう一度送ってください。";
  scene("error",`<section class="sc sc-end">
    <h2 class="t-h2">${esc(msg)}</h2>
    ${e?.detail?`<p class="t-cap er-detail">詳細：${esc(e.detail)}</p>`:""}
  </section>`,{chapter:3,status:"送信できませんでした"});
  setPush(pressLabel("もう一度撮る"),pageCamera);
}
