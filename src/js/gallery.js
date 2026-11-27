/* ===== 左の画面：配達レポート =====
   メイン画面の左に置くサブディスプレイ（横向き）。URL に ?view=archive を付けて開く（メイン画面でも G キーで開閉できる）
   ・メインの最後の画面で「あなたの当たり前」のカードが左へ飛ぶと、その回のレポートが右端から入ってきて、判定の印が押される
   ・同じPCなら、ウィンドウどうしの知らせ（BroadcastChannel）でぴったり合わせる。別のPCなら、シートを5秒ごとに確かめて届いたものから出す
   ・新しい配達がない間は、過去のレポートを順に流す。1件は3ページ（返信と総評／ギャップの核心と比較表／揺らぎ・兆し・問い）を自動でめくる */
const ARCHIVE_ONLY=new URLSearchParams(location.search).get("view")==="archive";
if(ARCHIVE_ONLY)document.body.classList.add("archive-only");
const GAL=(()=>{
  const LK="mirai_archive_local_v5",PAGE_NEW=20000,PAGE=12000,POLL=5000,FLY_WAIT=55000;
  let el=null,open=false,items=[],totals=null,maxRow=0,poll=null,idx=-1,timer=null,tl=0,queue=[],pending={},curKey="";
  const bc=("BroadcastChannel" in window)?new BroadcastChannel("mirai_archive"):null;
  const keyOf=x=>x.row?"r"+x.row:"t"+x.at;
  function local(){try{return JSON.parse(lsGet(LK,"[]"))||[]}catch{return[]}}
  function saveLocal(a){let k=a.slice(0,30);while(k.length){try{localStorage.setItem(LK,JSON.stringify(k));return}catch{k=k.slice(0,k.length-3)}}}
  function patchLocal(rec,obj){const a=local();const x=a.find(y=>keyOf(y)===keyOf(rec));if(x){Object.assign(x,obj);saveLocal(a)}}

  /* ---------- メイン側から呼ぶ ---------- */
  // 結果が出たら控えを残し、左の画面に知らせる（まだ出さない。カードが飛んだときに出す）
  function remember(rec){const a=local().filter(x=>keyOf(x)!==keyOf(rec));a.unshift(rec);saveLocal(a);bc?.postMessage({type:"new",rec})}
  function attachIll(rec,ill){patchLocal(rec,{ill});bc?.postMessage({type:"ill",key:keyOf(rec),ill})}
  function illFail(rec){bc?.postMessage({type:"illfail",key:keyOf(rec)})}
  function attachReport(rec,report){patchLocal(rec,{report});bc?.postMessage({type:"report",key:keyOf(rec),report})}
  function reportFail(rec){bc?.postMessage({type:"reportfail",key:keyOf(rec)})}
  // 「あなたの当たり前」のカードが左へ飛んだ瞬間
  function fly(rec){bc?.postMessage({type:"fly",key:keyOf(rec)});if(open)arrive(keyOf(rec))}

  /* ---------- 左の画面 ---------- */
  async function get(q){if(!window.GAS_URL)return null;try{const r=await fetch(window.GAS_URL+q,{signal:AbortSignal.timeout(12000)});const d=await r.json();return d.ok?d:null}catch{return null}}
  function merge(list){
    const m=new Map(items.map(x=>[keyOf(x),x]));
    for(const x of list){m.set(keyOf(x),{...m.get(keyOf(x)),...x});if(x.row)maxRow=Math.max(maxRow,x.row)}
    items=[...m.values()].sort((a,b)=>b.at-a.at).slice(0,60);
  }
  const find=k=>items.find(x=>keyOf(x)===k);
  const VJ={saved:["変わった","日常が"],partial:["ちょっと変わった","日常が"],lost:["変わらなかった","日常は"]};
  function counts(){if(totals)return totals.outcomes;const c={saved:0,partial:0,lost:0};items.forEach(x=>{if(c[x.outcome]!==undefined)c[x.outcome]++});return c}
  function drawCounts(){const c=counts();const e=$("#gvCnt");if(e)e.innerHTML=`<span class="c-s">変わった<b class="digits">${digits(c.saved)}</b></span><span class="c-p">ちょっと変わった<b class="digits">${digits(c.partial)}</b></span><span class="c-l">変わらなかった<b class="digits">${digits(c.lost)}</b></span>`}
  const gapCls=g=>g==="大きい"?"g-l":g==="小さい"?"g-s":"g-m";
  const pending1=`<p class="rp-wait">レポートを作成しています…</p>`;
  // 3ページ：返信と総評／比較表とギャップの核心／揺らいだ瞬間・現在の兆し・問い
  const PAGES=[
    (x,f)=>`<div class="rp-to"><span class="t-cap">受け取った人</span><b>${esc(f.name)}</b><span>${f.age}歳・${esc(f.job)}／2045年・${esc(f.title)}</span></div>
      <div class="rp-reply"><span class="t-cap">${esc(f.name)}からの返信</span><p>${(x.reply||[]).map(esc).join("")}</p></div>
      ${x.report&&x.report.summary?`<div class="rp-blk"><span class="t-cap">総評</span><p>${esc(x.report.summary)}</p></div>`:x.report?"":pending1}`,
    (x,f)=>{const r=x.report;if(!r)return pending1;
      return `<div class="rp-core"><span class="t-cap">ギャップの核心</span><p>${esc(r.core||x.gap_line||"")}</p></div>
      ${r.rows&&r.rows.length?`<table class="rp-table"><thead><tr><th>観点</th><th>あなた（2026年）</th><th>${esc(f.name)}（2045年）</th><th>ギャップ</th></tr></thead><tbody>
        ${r.rows.map(w=>`<tr><th>${esc(w.aspect)}</th><td>${esc(w.now)}</td><td>${esc(w.future)}</td><td><span class="gap ${gapCls(w.gap)}">${esc(w.gap)}</span></td></tr>`).join("")}</tbody></table>`:""}`},
    (x,f)=>{const r=x.report;if(!r)return pending1;
      return `${r.wobble?`<div class="rp-blk rp-pad"><span class="t-cap">${esc(f.name)}が揺らいだ瞬間</span><p>${esc(r.wobble)}</p></div>`:""}
      ${r.signals&&r.signals.length?`<div class="rp-blk"><span class="t-cap">この未来は、もう始まっているかもしれません</span><ul>${r.signals.map(s=>`<li>${esc(s.text)}<small>出典：${esc(s.source)}</small></li>`).join("")}</ul></div>`:""}
      ${r.questions&&r.questions.length?`<div class="rp-blk"><span class="t-cap">あなたへの問い</span><ol class="rp-q">${r.questions.map(q=>`<li>${esc(q)}</li>`).join("")}</ol></div>`:""}`}
  ];
  // 1件分：左に同封の写真と送った物、右にレポート（2ページ）
  function show(x,isNew){
    if(!open)return;const my=++tl,alive=()=>open&&my===tl;
    const f=FUTURES[x.story]||FUTURES[0],v=VJ[x.outcome]||VJ.lost;curKey=keyOf(x);
    $("#gvDesk").innerHTML=`<div class="rp ${isNew?"is-new":""}">
      <div class="rp-l">
        <figure class="rp-ill" id="rpIll"></figure>
        <div class="rp-item"><img src="${x.thumb}" alt=""><div><span class="t-cap">2026年から送った物</span><b>${esc(x.item)}</b></div></div>
      </div>
      <div class="rp-r">
        <div class="ink ${x.outcome}" style="--r:${-8+Math.random()*5}deg"><span>${v[1]}</span><b>${v[0]}</b></div>
        <div class="rp-page" id="rpPage"></div>
        <ol class="rp-dots" aria-hidden="true">${PAGES.map((_,i)=>`<li class="${i?"":"is-on"}"></li>`).join("")}</ol>
      </div></div>`;
    drawIll(x);
    let p=0;
    const render=()=>{if(!alive())return;const c=find(curKey)||x;$("#rpPage").innerHTML=PAGES[p](c,f);$("#rpPage").classList.remove("is-in");void $("#rpPage").offsetWidth;$("#rpPage").classList.add("is-in");[...$(".rp-dots").children].forEach((d,i)=>d.classList.toggle("is-on",i===p))};
    render();x._render=()=>{if(curKey===keyOf(x))render()};
    // レポートがまだなら、シートに取りにいく（別のPCで作られた場合）
    if(!x.report&&x.row)fetchReport(x);
    const hold=isNew?PAGE_NEW:PAGE;
    clearTimeout(timer);
    const turn=()=>{if(!alive())return;if(p>=PAGES.length-1)return next();p++;render();timer=setTimeout(turn,hold)};
    timer=setTimeout(turn,hold);
  }
  function drawIll(x){
    const e=$("#rpIll");if(!e||curKey!==keyOf(x))return;
    if(x.ill){e.innerHTML=`<img class="gd-ill" src="${x.ill}" alt="AIが描いた想像図"><figcaption>同封されていた写真（AIが描いた想像図）</figcaption>`;return}
    e.innerHTML=`<figcaption>${pending[keyOf(x)]?"写真が届くのを待っています…":"差出人の世界"}</figcaption>`;
    const art=worldArtEl(x.story);e.prepend(art);drawIn(art,60,900);
    if(x.row&&(!x._illTry||Date.now()-x._illTry>20000)){x._illTry=Date.now();get(`?ill=${x.row}`).then(d=>{if(d&&d.ill&&!x.ill){x.ill="data:image/jpeg;base64,"+d.ill;drawIll(x)}})}
  }
  async function fetchReport(x){
    if(x._repTry&&Date.now()-x._repTry<6000)return;x._repTry=Date.now();
    const d=await get(`?report=${x.row}`);if(d&&d.report&&!x.report){x.report=d.report;x._render?.()}
  }
  // 新しい配達を、右端から入れて出す
  function arrive(k){
    const x=find(k);if(!x){pending[k]=pending[k]||Date.now();return}
    delete pending[k];queue=queue.filter(y=>y!==k);idx=-1;show(x,true);
  }
  function next(){
    if(!open)return;
    // 別のPCから届いた新着は、メインでカードが飛ぶころ（結果から約55秒後）に出す
    const due=queue.find(k=>{const x=find(k);return x&&Date.now()-x.at>=FLY_WAIT});
    if(due){queue=queue.filter(y=>y!==due);return show(find(due),true)}
    if(!items.length){$("#gvDesk").innerHTML=`<div class="arc-empty">まだ配達がありません。<br>最初のレポートを待っています。</div>`;clearTimeout(timer);timer=setTimeout(next,8000);return}
    idx=(idx+1)%items.length;show(items[idx],false);
  }
  async function refresh(){
    const [a,b]=await Promise.all([get(`?archive=60${maxRow?"&after="+maxRow:""}`),get("?totals=1")]);
    if(a&&Array.isArray(a.items)&&a.items.length){
      const known=new Set(items.map(keyOf)),list=a.items.map(x=>({...x,thumb:"data:image/jpeg;base64,"+x.thumb}));
      const first=!maxRow;merge(list);
      // このPCのメインからの知らせがない新着（別のPC）は、少し待ってから出す
      if(!first)list.filter(x=>!known.has(keyOf(x))&&Date.now()-x.at<180000).forEach(x=>{const k=keyOf(x);if(!queue.includes(k))queue.push(k)});
    }
    if(b&&b.totals)totals=b.totals;
    drawCounts();
    // 表示中のレポートや写真が、まだ届いていなければ取りにいく
    const c=find(curKey);if(c&&c.row){if(!c.report)fetchReport(c);if(!c.ill&&(!c._illTry||Date.now()-c._illTry>20000))drawIll(c)}
    // カードが飛ぶ知らせを待ちすぎたら、出してしまう
    for(const k of Object.keys(pending))if(find(k)&&Date.now()-pending[k]>90000)arrive(k);
  }
  function onMsg(e){
    const d=e.data||{};if(!open)return;
    if(d.type==="new"&&d.rec){merge([d.rec]);const k=keyOf(d.rec);pending[k]=Date.now();queue=queue.filter(y=>y!==k);if(totals)totals.outcomes[d.rec.outcome]=(totals.outcomes[d.rec.outcome]||0)+1;drawCounts();return}
    const x=d.key&&find(d.key);
    if(d.type==="ill"&&x){x.ill=d.ill;drawIll(x);return}
    if(d.type==="illfail"&&x){drawIll(x);return}
    if(d.type==="report"&&x){x.report=d.report;x._render?.();return}
    if(d.type==="fly"){arrive(d.key);return}
  }
  async function showView(){
    if(open)return;open=true;VOICE.stop?.();
    el=document.createElement("div");el.id="archive";
    el.innerHTML=`<div class="gv-hd"><img class="arc-logo" src="assets/mvmnt-logo.png" alt="MVMNT"><div class="gv-t"><b>時空郵便局 配達レポート</b><span>2026年から2045年へ送った物と、届いた返事</span></div><div class="gv-cnt" id="gvCnt"></div></div>
      <div class="gv-desk" id="gvDesk"><div class="arc-empty">読み込んでいます…</div></div>`;
    ($("#stage")&&getComputedStyle($("#stage")).display!=="contents"&&!ARCHIVE_ONLY?$("#stage"):document.body).appendChild(el);
    merge(local());drawCounts();
    await refresh();if(!open)return;
    idx=-1;next();
    poll=setInterval(refresh,POLL);bc&&(bc.onmessage=onMsg);
  }
  function close(){if(!open)return;open=false;clearTimeout(timer);clearInterval(poll);if(bc)bc.onmessage=null;queue=[];el?.remove();el=null}
  document.addEventListener("keydown",e=>{
    if(ARCHIVE_ONLY||staffOpen()||e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.code==="KeyG"&&!e.repeat){e.preventDefault();open?close():showView()}
    else if(e.code==="Escape"&&open){close()}
  });
  return{remember,attachIll,illFail,attachReport,reportFail,fly,show:showView,close,isOpen:()=>open,keyOf};
})();
