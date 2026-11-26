/* ===== 画面：体験の流れ（19画面） =====
   1画面に1つのことだけを出す。ボタンを押すのは「はじめる」と「撮影」の2回だけで、ほかは声が終わると自動で進む。
   声が流れているあいだはボタンを受け付けない（ゲームに慣れていない人が、押しすぎて手紙を読み飛ばさないように） */

const INTRO=["2126年の時空郵便局で働いてる、minato。","ここには、100年後の人から、過去あての手紙が届く。","それを2026年のあなたに届けるのが、私の仕事。"];
const REQ_HEAD="お願いがあります。";
const TODO_LINE="身の回りから、物を1つ探して。見つけたら、カメラの前に置いて、ボタンを押してね。";
const UNBOX_LINE="おお！何これ、どう使うんだ？";
const WAIT_LINE="向こうのカメラで、今のようすを撮ってもらってる。もうちょい待って。";
const FIG_HTML=`<div class="fig"><canvas id="fig"></canvas></div>`;

/* ---------- 1. 待機：名前 → 2026と2126をつなぐ → ひとこと → 配達数 をくり返す ---------- */
function pageTitle(){
  setTimeout(()=>INTRO.forEach(l=>VOICE.prepare(l)),3000); // 自己紹介の声を先に作っておく
  SND.mood("base");stopCam();document.body.classList.remove("desat");
  const alive=scene("title",`<section class="sc sc-title">
    <div class="op-frames">
      <div class="op-frame op-title" data-frame><p class="op-en t-display" data-in>SPACETIME POST OFFICE</p><h1 class="t-h1" data-in style="--d:180ms">時空郵便局</h1></div>
      <div class="op-frame" data-frame data-route>
        <div class="route" aria-label="2026年と2126年を郵便でつないでいます">
          <div class="route-end" data-in><span class="t-cap">差出し</span><span class="t-num">2026</span></div>
          <div class="route-line"><i class="packet packet--letter" id="pkLetter"></i><i class="packet packet--object" id="pkObject"></i></div>
          <div class="route-end route-to"><span class="t-cap" data-in style="--d:500ms">宛先</span>
            <span class="boxes boxes--year" id="year"><b style="--d:600ms">2</b><b style="--d:680ms">1</b><b style="--d:760ms">2</b><b style="--d:840ms">6</b></span></div>
        </div>
        <p class="t-lead route-note" data-in style="--d:900ms">2026年と、ちょうど100年後の2126年を、郵便でつないでいます。</p>
      </div>
      <div class="op-frame" data-frame><p class="op-copy" data-in>2126年の誰かの日常を、<br>ちょっと変える。</p></div>
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
  /* カードを順番に見せる */
  const FRAME=4800,frames=$$("[data-frame]"),stepsEl=$(".op-steps");
  document.documentElement.style.setProperty("--frame",FRAME+"ms");
  const run=el=>{el.classList.remove("is-moving");void el.offsetWidth;el.classList.add("is-moving")};
  // 手紙が2126→2026へ、物が2026→2126へ渡り、宛先の枠が光る（時空をつないでいる）
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

/* ---------- 2〜4・8・16. minatoが話す画面：左に minato、右にセリフ1つ ---------- */
function pageMinato({page,line,chapter=1,next,hold=1400}){
  const alive=scene(page,`<section class="sc sc-minato">
    <figure class="mi-fig">${FIG_HTML}<figcaption class="t-cap">minato　2126年の時空郵便局</figcaption></figure>
    <p class="mi-line" id="line"><span class="cur"></span></p>
  </section>`,{chapter});
  unmountFig=minatoFigure($("#fig"),{talk:true});
  setNote("minatoの声");
  (async()=>{
    await sleep(350);if(!alive())return;
    await ready(line);if(!alive())return;
    await Promise.all([typeOut($("#line"),line,alive),talk(line)]);
    if(alive())autoNext(hold,next);
  })();
  return alive;
}
function pageIntro(){
  pickStory();
  INTRO.forEach(l=>VOICE.prepare(l));VOICE.prepare(story.arrive);
  const step=k=>pageMinato({page:"intro",line:INTRO[k],next:k<INTRO.length-1?()=>step(k+1):pageArrive,hold:k<INTRO.length-1?900:1400});
  step(0);
}

/* ---------- 5. 受信：依頼主の世界の線画に、封筒が飛んでくる。伝票には差出人だけ ---------- */
function pageArrive(){
  letterPages(story).flat().forEach(s=>VOICE.prepare(s,{story:storyIdx}));VOICE.prepare(story.react);VOICE.prepare(REQ_HEAD+story.q,{story:storyIdx});
  const alive=scene("arrive",`<section class="sc sc-arrive">
    <div class="ar-art" id="art"><div class="env" data-hand="${story.hand}">${ENV_SVG}<span class="env-from">${esc(story.name)}より</span></div></div>
    <div class="ar-slip">
      <div class="field"><span class="field-label">差出人</span><p class="ar-name">${esc(story.name)}</p><p class="t-lead ar-who">${esc(story.who)}</p></div>
      <div class="say"><span class="t-cap">minato</span><p class="t-lead" id="line"></p></div>
    </div>
  </section>`,{chapter:1,status:"手紙を受信中"});
  const art=worldArtEl(storyIdx);$("#art").prepend(art);drawIn(art,60,900);
  (async()=>{
    await sleep(1900);if(!alive())return;SND.tick();setStatus("2126年と通信中");
    setNote("minatoの声");await ready(story.arrive);if(!alive())return;
    await Promise.all([typeOut($("#line"),story.arrive,alive),talk(story.arrive)]);
    if(alive())autoNext(1400,()=>pageLetter(0));
  })();
}

/* ---------- 6〜7. 手紙：便せん2枚。差出人の手書きの書体で、1文ずつ差出人の声で読む ---------- */
function pageLetter(p){
  const pages=letterPages(story),sent=pages[p],last=p===pages.length-1;
  const alive=scene("letter",`<section class="sc sc-letter">
    <article class="paper letter" data-hand="${story.hand}">
      ${p===0?`<p class="paper-to">過去の、だれかへ</p>`:""}
      <p class="lt-body">${sent.map(s=>`<span class="lt-s">${esc(s)}</span>`).join("")}</p>
      ${last?`<p class="lt-sign">2126年　${esc(story.name)}より</p>`:""}
      <p class="lt-page">${digits(`${p+1}/${pages.length}`)}</p>
    </article>
  </section>`,{chapter:1});
  document.body.dataset.calm="1";
  setNote(`${story.name}の声`);
  (async()=>{
    await sleep(p?500:900);
    const els=$$(".lt-s");
    for(let i=0;i<sent.length;i++){
      await ready(sent[i],{story:storyIdx});if(!alive())return;
      els[i].classList.add("is-on");if(!i)SND.tick();
      await talk(sent[i],{story:storyIdx});if(!alive())return;
      await sleep(200);
    }
    if(alive())autoNext(1600,()=>last?pageMinato({page:"react",line:story.react,next:pageRequest,hold:1600}):pageLetter(p+1));
  })();
}

/* ---------- 9. お願い：1文だけ、大きく ---------- */
function pageRequest(){
  VOICE.prepare(TODO_LINE);
  const alive=scene("request",`<section class="sc sc-request">
    <p class="t-cap">${esc(story.name)}からのお願い</p>
    <p class="rq-text">${(story.ql||[story.q]).map(x=>`<span>${esc(x)}</span>`).join("")}</p>
  </section>`,{chapter:1});
  setNote(`${story.name}の声`);
  (async()=>{
    await sleep(600);if(!alive())return;SND.tick();
    await ready(REQ_HEAD+story.q,{story:storyIdx});if(!alive())return;
    await talk(REQ_HEAD+story.q,{story:storyIdx});
    if(alive())autoNext(2400,pageTodo);
  })();
}

/* ---------- 10. やること ---------- */
function pageTodo(){
  getCam().catch(()=>{}); // カメラを先に起動しておく（撮影の画面ですぐ映るように）
  const alive=scene("todo",`<section class="sc sc-todo">
    <h2 class="t-h1">身の回りから、<br>物を1つ探してください。</h2>
    <p class="t-lead td-sub">見つけたら、カメラの前に置いて、ボタンを押します。</p>
  </section>`,{chapter:2});
  setNote("minatoの声");
  (async()=>{await sleep(400);if(!alive())return;await ready(TODO_LINE);if(!alive())return;await talk(TODO_LINE);if(alive())autoNext(1800,pageCamera)})();
}

/* ---------- 11. 撮影：カメラが主役。オレンジの枠（郵便番号枠）の中に物を置く ---------- */
async function pageCamera(){
  const alive=scene("camera",`<section class="sc sc-camera">
    <div class="cm-view" id="cam"><video id="v" autoplay playsinline muted></video><i class="cm-box" aria-hidden="true"></i><span class="cm-rec t-data" id="clk"></span></div>
    <div class="cm-side">
      <div class="field"><span class="field-label">${esc(story.name)}からのお願い</span><p class="t-lead">${esc(story.q)}</p></div>
      <p class="t-lead cm-hint" id="camHint">オレンジの枠の中に、物を1つ置いてください。</p>
    </div>
    <input type="file" id="file" accept="image/*" capture="environment" hidden>
  </section>`,{chapter:2,status:"カメラを準備中"});
  document.body.dataset.calm="1";
  const clk=()=>{const c=$("#clk");if(c){const d=new Date();c.innerHTML=digits(`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")} ${d.toTimeString().slice(0,8)}`)}};
  clk();const iv=setInterval(clk,1000);cleanup.push(()=>clearInterval(iv));
  const fileIn=$("#file");
  fileIn.onchange=e=>{const f=e.target.files[0];if(!f)return;const img=new Image();img.onload=()=>{const c=document.createElement("canvas");c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext("2d").drawImage(img,0,0);URL.revokeObjectURL(img.src);SND.shutter();send(c)};img.src=URL.createObjectURL(f)};
  try{
    const st=await getCam();
    const v=$("#v");if(!alive()||!v){stopCam();return}
    v.srcObject=st;await v.play().catch(()=>{});
    const shoot=()=>{
      if(!v.videoWidth){setPush(pressLabel("撮影する"),shoot);return}
      const c=document.createElement("canvas");c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").drawImage(v,0,0);
      SND.shutter();flash();send(c);
    };
    if(!alive())return;
    setStatus("撮影できます");setPush(pressLabel("撮影する"),shoot);
  }catch(e){
    if(!alive())return;
    const why=e?.name==="NotAllowedError"?"カメラの使用が許可されていません。":e?.name==="NotFoundError"||e?.name==="OverconstrainedError"?"カメラが見つかりません。":"カメラを起動できませんでした。";
    $("#cam").insertAdjacentHTML("beforeend",`<div class="cm-none"><p class="t-lead">${why}</p><p class="t-body">USBカメラの接続を確認してください。${EXHIBIT?"（スタッフ：Ctrl+Shift+S）":"写真を選んで送ることもできます。"}</p></div>`);
    setStatus("カメラが使えません");
    if(EXHIBIT)setPush(pressLabel("もう一度ためす"),pageCamera);
    else{const pick=()=>{fileIn.click();setPush("写真を選ぶ",pick)};setPush("写真を選ぶ",pick)}
  }
}

/* ---------- 12. 受付：撮った物を、2126年へ送る ---------- */
function send(srcCanvas){
  const img=scaled(srcCanvas,1024),thumb=square(srcCanvas,360),gthumb=crop32(srcCanvas,450);
  const job=startMission(img,thumb,gthumb);
  const d={img,thumb,gthumb,job};
  const alive=scene("accept",`<section class="sc sc-accept">
    <figure class="ac-photo"><img src="${thumb}" alt="撮った物"></figure>
    <div class="ac-text"><h2 class="t-h2">この物を、2126年へ送ります。</h2><div class="ac-dest"><span class="t-cap">宛先</span>${boxes("2126","boxes--sm")}</div></div>
  </section>`,{chapter:3,status:"受付中"});
  setTimeout(()=>alive()&&SND.stamp(),500);
  setTimeout(()=>alive()&&pageWarp(d),2800);
}
/* 写真を送って、2126年で起きたことを判定してもらう（判定が届いたら、すぐ想像図も頼んでおく） */
function startMission(img,thumb,gthumb){
  let done=false;
  const p=(async()=>{
    try{
      if(!window.GAS_URL)throw {code:"no_config"};
      const image=img.toDataURL("image/jpeg",.85).split(",")[1];
      const r=await fetch(window.GAS_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({image,mode:"mission",story:storyIdx,gthumb:gthumb.split(",")[1]}),signal:AbortSignal.timeout(90000)});
      const t=await r.text();let d;
      try{d=JSON.parse(t)}catch{throw {code:"bad_response",detail:"GASからJSON以外の応答（"+r.status+"）。デプロイのアクセス権が「全員」か、URLが /exec で終わっているか確認してください。"}}
      if(!d.ok)throw {code:d.error||"server_error",detail:d.detail};
      if(d.stats)setTally(d.stats);
      const res=d.result;res._row=Number(d.row)||0;
      res._score=Math.max(0,Math.min(100,Number(res.score)||0));res._o=outcomeOf(res._score);
      res._illP=fetchIllust(res,res._o,thumb).catch(()=>null);
      VOICE.prepare(res.happened);VOICE.prepare(res.tsukkomi);
      return{res};
    }catch(e){return{err:e&&e.code?e:{code:"network",detail:String(e&&e.message||e)}}}
    finally{done=true}
  })();
  return{p,done:()=>done};
}

/* ---------- 13〜14. 転送 → 到着：品物が粒子になって2126年へ。年の枠が2026から2126まで進む ---------- */
async function pageWarp(d){
  const alive=scene("warp",`<section class="sc sc-warp">
    <div class="wp-hd"><span class="status" id="st">2126年へ送っています</span>
      <div class="wp-year"><span class="t-cap">いま通過している年</span><span class="boxes boxes--year" id="yr">${"2026".split("").map(c=>`<b>${c}</b>`).join("")}</span></div></div>
    <div class="wp-stage"><canvas id="txc"></canvas>
      <div class="wp-min" id="txm" hidden>${FIG_HTML}<div class="say"><span class="t-cap">minato</span><p class="t-lead" id="txl"></p></div></div></div>
  </section>`,{chapter:3,status:"2126年へ送信中"});
  FXB.set("warp");
  const sc=txScene($("#txc"),d.img);cleanup.push(sc.stop);
  const stopW=SND.warp();cleanup.push(stopW);
  const t0=performance.now(),A_SEC=5,yb=[...$("#yr").children];
  const setYear=y=>String(y).split("").forEach((c,i)=>{if(yb[i].textContent!==c)yb[i].textContent=c});
  const ci=setInterval(()=>{const p=Math.min(.999,(performance.now()-t0)/(A_SEC*1000));setYear(2026+Math.floor(p*100))},50);cleanup.push(()=>clearInterval(ci));
  await sleep(A_SEC*1000);if(!alive())return;
  // 2126年に到着：minatoの手元で品物の形に戻る
  clearInterval(ci);stopW();flash();SND.arrive();FXB.set("scan");sc.arrive();
  setYear(2126);$("#yr").classList.add("is-arrived");
  $("#st").textContent="2126年に届きました";setStatus("2126年に到着");
  await sleep(2600);if(!alive())return;
  $("#txm").hidden=false;unmountFig=minatoFigure($("#fig"),{talk:true});
  setNote("minatoの声");await ready(UNBOX_LINE);if(!alive())return;
  await Promise.all([typeOut($("#txl"),UNBOX_LINE,alive),talk(UNBOX_LINE)]);if(!alive())return;
  setNote("");
  if(!d.job.done()){$("#st").textContent="minatoが調べています";setStatus("2126年と通信中")}
  const {res,err}=await d.job.p;if(!alive())return;
  if(err||!res)return fail(err);
  res.thumb=d.thumb;
  const rec={wait:ILL.engine()!=="off",row:res._row||0,outcome:res._o,item:res.item_name,happened:res.happened,tsukkomi:res.tsukkomi,story:storyIdx,at:Date.now(),thumb:d.gthumb,svg:""};
  GAL.remember(rec);
  // 想像図は届きしだいギャラリーへ（結果の画面を離れたあとでも）
  res._illP?.then(a=>{if(a)shareIll(rec,a);else GAL.illFail(rec)}).catch(()=>GAL.illFail(rec));
  pageHappened(res);
}

/* ---------- 15. 起きたこと ---------- */
function pageHappened(r){
  const alive=scene("happened",`<section class="sc sc-happened">
    <figure class="hp-item"><img src="${r.thumb}" alt=""><figcaption><span class="t-cap">あなたが送った物</span><b>${esc(r.item_name)}</b></figcaption></figure>
    <div class="hp-text"><p class="t-cap">2126年で起きたこと</p><p class="hp-body">${esc(r.happened)}</p></div>
  </section>`,{chapter:4});
  setNote("minatoの声");
  (async()=>{
    await sleep(900);if(!alive())return;await ready(r.happened);if(!alive())return;
    await talk(r.happened);
    if(alive())autoNext(1800,()=>pageMinato({page:"tsukkomi",line:r.tsukkomi,chapter:4,next:()=>pageVerdict(r),hold:1600}));
  })();
}

/* ---------- 17. 判定：3段階のどれになったかと、配達番号 ---------- */
function outcomeOf(n){return n>=75?"saved":n>=50?"partial":"lost"}
const VERDICT={saved:n=>`${n}の日常が、変わった`,partial:n=>`${n}の日常が、ちょっと変わった`,lost:n=>`${n}の日常は、変わらなかった`};
const VERDICT_SHORT={saved:"変わった",partial:"ちょっと変わった",lost:"変わらなかった"};
function pageVerdict(r){
  const o=r._o,txt=VERDICT[o](story.name),[a,b]=txt.split("、");
  VOICE.prepare(txt);
  const alive=scene("verdict",`<section class="sc sc-verdict" data-o="${o}">
    <ol class="vd-scale" aria-label="判定の3段階">${["saved","partial","lost"].map(k=>`<li class="${k===o?"is-on":""}">${VERDICT_SHORT[k]}</li>`).join("")}</ol>
    <h2 class="vd-text"><span>${esc(a)}、</span><span>${esc(b)}</span></h2>
    ${r._row?`<div class="vd-no"><span class="t-cap">配達番号</span>${boxes(String(r._row).padStart(6,"0"),"boxes--sm")}</div>`:""}
  </section>`,{chapter:4,status:"判定"});
  o==="lost"?SND.lose():SND.win(o==="saved");SND.mood(o);FXB.set(o);
  if(o==="lost")setTimeout(()=>{if(alive())document.body.classList.add("desat")},600);
  setNote("minatoの声");
  (async()=>{await sleep(900);if(!alive())return;await talk(txt);if(alive())autoNext(2600,()=>pagePhoto(r))})();
}

/* ---------- 18. 写真：2126年から届く想像図。届くまでは、時空カメラのノイズの中に世界がちらつく ---------- */
function pagePhoto(r){
  if(ILL.engine()==="off")return pageEnd(r);
  const alive=scene("photo",`<section class="sc sc-photo">
    <div class="ph-view" id="ill"><div class="cam" id="cam"><canvas class="cam-noise" id="camN" width="160" height="120"></canvas><div class="cam-art" id="camArt"></div><div class="cam-scan"></div></div></div>
    <div class="ph-side" id="phSide">
      <p class="t-cap">2126年の${esc(story.name)}のまわり</p>
      <p class="ph-pct t-data" id="camPct">${digits("0")}</p>
      <div class="ph-bar"><i id="camBar"></i></div>
      <p class="t-lead" id="camMsg">時空カメラを接続中…</p>
    </div>
  </section>`,{chapter:4,status:"写真を受信中"});
  document.body.dataset.calm="1";
  $("#camArt").append(worldArtEl(storyIdx));
  const t0=performance.now();
  const MSG=[[0,"時空カメラを接続中…"],[14,"2126年の渋谷を探しています…"],[34,`${story.name}のまわりを探しています…`],[54,`${story.name}を見つけた。ピントを合わせています…`],[74,"写真を現像しています…"],[90,"もうすぐ届きます…"]];
  let got=null,shown=false,gaveUp=false,pct=0,last=0,shownPct=-1,endA=null;
  const cv=$("#camN"),cx=cv.getContext("2d"),idata=cx.createImageData(160,120);
  const loop=ts=>{
    if(!alive()||shown)return;requestAnimationFrame(loop);
    if(ts-last<70)return;last=ts;
    const dd=idata.data;for(let i=0;i<dd.length;i+=4){const v=Math.random()*255|0;dd[i]=v;dd[i+1]=v*.45|0;dd[i+2]=0;dd[i+3]=255}cx.putImageData(idata,0,0);
    if(gaveUp)return;
    const sec=(performance.now()-t0)/1000;pct=Math.max(pct,got?100:Math.min(95,95*(1-Math.exp(-sec/13))));
    $("#camBar").style.transform=`scaleX(${(pct/100).toFixed(3)})`;
    if(Math.floor(pct)!==shownPct){shownPct=Math.floor(pct);$("#camPct").innerHTML=digits(shownPct)+"<small>%</small>"}
    const mEl=$("#camMsg");if(!got&&mEl.dataset.wait!=="1"){const m=MSG.filter(x=>pct>=x[0]).pop();if(m&&mEl.textContent!==m[1])mEl.textContent=m[1]}
  };
  requestAnimationFrame(loop);
  // 写真を待つあいだは、自動で最初の画面に戻らない（最大55秒）
  const hold=setInterval(()=>{if(alive()&&!shown&&!gaveUp)IDLE.touch()},3000);cleanup.push(()=>clearInterval(hold));
  // なかなか届かなければ、minato がひとこと
  const wt=setTimeout(async()=>{if(!alive()||got||shown||gaveUp)return;
    const m=$("#camMsg");m.dataset.wait="1";m.textContent=WAIT_LINE;setNote("minatoの声");await talk(WAIT_LINE);if(!alive())return;setNote("");m.dataset.wait=""},9000);
  cleanup.push(()=>clearTimeout(wt));
  const reveal=art=>{
    if(!alive()||shown)return;shown=true;clearInterval(hold);IDLE.touch();VOICE.stop();setNote("");
    const cam=$("#cam");SND.shutter();cam.classList.add("snap");
    setTimeout(()=>{if(!alive())return;
      $("#ill").insertAdjacentHTML("afterbegin",`<div class="ill-out" id="inPh"></div>`);
      $("#inPh").append(art);if(art.tagName!=="IMG")drawIn(art,45,700);
      cam.classList.add("done");setTimeout(()=>cam.remove(),900);
      $("#phSide").innerHTML=`<p class="t-cap">2126年から届いた写真</p><p class="t-h2 ph-title">${esc(story.name)}のその後</p><p class="t-body ph-note">AIが描いた想像図です。</p>
        <div class="field ph-item"><span class="field-label">あなたが送った物</span><p class="t-lead">${esc(r.item_name)}</p></div>`;
      setStatus("写真が届きました");
      autoNext(IDLE.photoSec()*1000,()=>pageEnd(r));
    },260);
  };
  const giveUp=msg=>{
    if(!alive()||shown||gaveUp)return;gaveUp=true;clearInterval(hold);
    $("#cam").classList.add("lost");$("#camMsg").textContent=msg;$("#camPct").innerHTML="";$("#camBar").parentElement.style.visibility="hidden";
    setStatus("通信が不安定");endA=autoNext(6000,()=>pageEnd(r));
  };
  const gu=setTimeout(()=>giveUp("通信が不安定です。写真は、あとで配達記録に届きます。"),55000);cleanup.push(()=>clearTimeout(gu));
  (r._illP||fetchIllust(r,r._o,r.thumb)).then(art=>{
    if(!alive())return;
    if(!art)return giveUp("写真を撮れませんでした。今日は2126年の電波が悪いようです。");
    got=art;
    // 早く届いても、時空カメラを少し見せてから出す。あきらめたあとに届いた場合もそのまま出す
    setTimeout(()=>{if(gaveUp){gaveUp=false;endA?.cancel();$("#camBar").parentElement.style.visibility=""}reveal(art)},Math.max(0,2200-(performance.now()-t0)));
  }).catch(()=>giveUp("写真を撮れませんでした。今日は2126年の電波が悪いようです。"));
}

/* ---------- 19. おわり ---------- */
function pageEnd(r){
  scene("end",`<section class="sc sc-end">
    <h2 class="t-h1">配達完了</h2>
    <p class="t-lead">2126年の${esc(story.name)}に、あなたの物が届きました。参加してくれて、ありがとう。</p>
    ${r&&r._row?`<div class="vd-no"><span class="t-cap">配達番号</span>${boxes(String(r._row).padStart(6,"0"),"boxes--sm")}</div>`:""}
  </section>`,{chapter:4,status:"配達完了"});
  autoNext(7000,pageTitle,"最初の画面へ");
}

/* ---------- 送れなかったとき ---------- */
function fail(e){
  SND.error();
  const code=e?.code;
  const msg=code==="rate_limited"?"混み合っています。少し待ってから、もう一度送ってください。"
    :code==="no_config"?"送り先が設定されていません（config.js の GAS_URL を設定してください）。"
    :code==="bad_image"?"写真をうまく受け取れませんでした。もう一度撮ってください。"
    :"2126年へ送れませんでした。もう一度送ってください。";
  scene("error",`<section class="sc sc-end">
    <h2 class="t-h2">${esc(msg)}</h2>
    ${e?.detail?`<p class="t-cap er-detail">詳細：${esc(e.detail)}</p>`:""}
  </section>`,{chapter:2,status:"送信できませんでした"});
  setPush(pressLabel("もう一度撮る"),pageCamera);
}
