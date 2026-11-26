/* ===== ギャラリー（サブディスプレイ）：判定のスタンプを押していく作業台 =====
   左＝依頼主の世界のイラスト、右＝送られた物の写真、真ん中＝「変わった／ちょっと変わった／変わらなかった」のスタンプを押す
   ・メイン画面で G キー、またはサブディスプレイ用に URL に ?view=archive を付けて開く
   ・メインで結果が出ると、次の1件として割り込む */
const ARCHIVE_ONLY=new URLSearchParams(location.search).get("view")==="archive";
if(ARCHIVE_ONLY)document.body.classList.add("archive-only");
const GAL=(()=>{
  const LK="mirai_archive_local_v4",HOLD=7500;
  let el=null,open=false,items=[],totals=null,maxRow=0,poll=null,ipoll=null,idx=-1,timer=null,tl=0,express=[],hold={};
  const bc=("BroadcastChannel" in window)?new BroadcastChannel("mirai_archive"):null;
  const keyOf=x=>x.row?"r"+x.row:"t"+x.at;
  function local(){try{return JSON.parse(lsGet(LK,"[]"))||[]}catch{return[]}}
  function saveLocal(a){let k=a.slice(0,30);while(k.length){try{localStorage.setItem(LK,JSON.stringify(k));return}catch{k=k.slice(0,k.length-3)}}}
  // メイン側：結果が出たら控えを残し、ギャラリーに知らせる
  function remember(rec){const a=local().filter(x=>keyOf(x)!==keyOf(rec));a.unshift(rec);saveLocal(a);bc?.postMessage({type:"new",rec})}
  function attachSvg(){}
  // メイン側：想像図が届いたら控えに足して、ギャラリーに知らせる
  function attachIll(rec,ill){const a=local();const x=a.find(y=>keyOf(y)===keyOf(rec));if(x){x.ill=ill;saveLocal(a)}bc?.postMessage({type:"ill",key:keyOf(rec),ill})}
  // メイン側：想像図が描けなかったときも知らせる（ギャラリーが待つのをやめる）
  function illFail(rec){bc?.postMessage({type:"illfail",key:keyOf(rec)})}
  let curKey="";
  const capOf=(x,st)=>x.ill?`<b>${esc(st.name)}</b>のその後<small>AIが描いた想像図</small>`:`<b>${esc(st.name)}</b>（${esc(st.who)}）の手紙`;
  function swapIll(x){const a=$("#gdArt");if(a&&curKey===keyOf(x)&&x.ill){a.innerHTML=`<img class="gd-ill" src="${x.ill}" alt="">`;$(".gd-l .gd-cap").innerHTML=capOf(x,STORIES[x.story]||STORIES[0])}}
  // 新着は、その回の想像図が届くまで待ってから出す（届かなければ最大 WAIT_ILL ミリ秒で、世界の線画のまま出す）
  const WAIT_ILL=60000;
  function release(k){if(!express.includes(k))return;hold[k]=0;if(open){clearTimeout(timer);next()}}
  async function pollIll(){
    for(const k of express){const x=items.find(y=>keyOf(y)===k);
      if(!x||x.ill||!x.row||!(hold[k]>Date.now()))continue;
      if(x._illTry&&Date.now()-x._illTry<6000)continue;x._illTry=Date.now();
      const d=await get(`?ill=${x.row}`);if(d&&d.ill&&!x.ill){x.ill="data:image/jpeg;base64,"+d.ill;release(k);return}}
  }
  async function get(q){if(!window.GAS_URL)return null;try{const r=await fetch(window.GAS_URL+q,{signal:AbortSignal.timeout(12000)});const d=await r.json();return d.ok?d:null}catch{return null}}
  function merge(list){
    const m=new Map(items.map(x=>[keyOf(x),x]));
    for(const x of list){
      const dup=[...m.values()].find(y=>!y.row&&x.row&&y.item===x.item&&Math.abs(y.at-x.at)<180000);
      if(dup)m.delete(keyOf(dup));
      m.set(keyOf(x),{...m.get(keyOf(x)),...x});
      if(x.row)maxRow=Math.max(maxRow,x.row);
    }
    items=[...m.values()].sort((a,b)=>b.at-a.at).slice(0,60);
  }
  const VJ={saved:["変わった","日常が"],partial:["ちょっと変わった","日常が"],lost:["変わらなかった","日常は"]};
  function counts(){
    if(totals)return totals.outcomes;
    const c={saved:0,partial:0,lost:0};items.forEach(x=>{if(c[x.outcome]!==undefined)c[x.outcome]++});return c;
  }
  function drawCounts(){const c=counts();$("#gvCnt").innerHTML=`<span class="c-s">変わった<b class="digits">${digits(c.saved)}</b></span><span class="c-p">ちょっと変わった<b class="digits">${digits(c.partial)}</b></span><span class="c-l">変わらなかった<b class="digits">${digits(c.lost)}</b></span>`}
  /* ---------- 1件分：左に世界、右に送られた物、真ん中でスタンプ ---------- */
  function show(x,isNew){
    if(!open)return;const my=++tl;const st=STORIES[x.story]||STORIES[0],v=VJ[x.outcome]||VJ.lost;
    $("#gvDesk").innerHTML=`
      <div class="gd-l"><div class="gd-cap">${capOf(x,st)}</div><div class="gd-art" id="gdArt"></div><p class="gd-req">「${esc(st.q)}」</p></div>
      <div class="gd-c"><div class="gd-pad"><div class="ink ${x.outcome}" style="--r:${-9+Math.random()*6}deg"><span>${v[1]}</span><b>${v[0]}</b></div>
        <div class="tool ${x.outcome}"><i class="knob"></i><i class="neck"></i><i class="base"></i></div></div>
        ${isNew?'<div class="gd-new">新しい配達</div>':""}</div>
      <div class="gd-r"><div class="gd-cap">送られてきた物</div><div class="gd-ph"><img src="${x.thumb}" alt=""></div><p class="gd-item">${esc(x.item)}</p></div>`;
    curKey=keyOf(x);
    const art=worldArtEl(x.story);
    if(x.ill)$("#gdArt").innerHTML=`<img class="gd-ill" src="${x.ill}" alt="">`;else $("#gdArt").append(art);
    // 別のPCで描いた想像図は、シートから取りにいく（1分に1回まで）
    if(!x.ill&&x.row&&(!x._illTry||Date.now()-x._illTry>60000)){x._illTry=Date.now();get(`?ill=${x.row}`).then(d=>{if(d&&d.ill){x.ill="data:image/jpeg;base64,"+d.ill;swapIll(x)}})}
    const desk=$("#gvDesk"),alive=()=>open&&my===tl;
    desk.className="gv-desk in";
    if(!x.ill)drawIn(art,110,1300);
    (async()=>{
      await sleep(10000);if(!alive())return;     // 左右をじっくり見せてから、ハンコを出す
      desk.classList.add("lift");                 // スタンプを持ち上げる
      await sleep(1300);if(!alive())return;
      desk.classList.add("press");                // ドン
      desk.classList.remove("shake");void desk.offsetWidth;desk.classList.add("shake");
      await sleep(420);if(!alive())return;
      desk.classList.add("done");                 // 持ち上げると判定が残る
      clearTimeout(timer);timer=setTimeout(next,isNew?HOLD+4000:HOLD);
    })();
    clearTimeout(timer);timer=setTimeout(next,20000);
  }
  function next(){
    if(!open)return;
    const ready=express.filter(k=>!(hold[k]>Date.now()));
    if(ready.length){const k=ready[0];express=express.filter(y=>y!==k);const x=items.find(y=>keyOf(y)===k);if(x)return show(x,true)}
    if(!items.length){$("#gvDesk").innerHTML=`<div class="arc-empty">まだ配達がありません。<br>最初の挑戦を待っています。</div>`;clearTimeout(timer);timer=setTimeout(next,8000);return}
    // 想像図を待っている新着は、届いてから「NEW DELIVERY」として出すので、ふだんの順番では飛ばす
    for(let i=0;i<items.length;i++){idx=(idx+1)%items.length;if(!express.includes(keyOf(items[idx])))return show(items[idx],false)}
    $("#gvDesk").innerHTML=`<div class="arc-empty">2126年から、写真が届くのを待っています…</div>`;clearTimeout(timer);timer=setTimeout(next,3000);
  }
  async function refresh(){
    const [a,b]=await Promise.all([get(`?archive=60${maxRow?"&after="+maxRow:""}`),get("?totals=1")]);
    if(a&&Array.isArray(a.items)&&a.items.length){
      const known=new Set(items.map(keyOf)),list=a.items.map(x=>({...x,thumb:"data:image/jpeg;base64,"+x.thumb}));
      const before=maxRow;merge(list);
      // 別のPCから届いた新着は、次の1件として割り込ませる
      // 想像図が届くまで待つ（シートから取りにいく）
      if(before)list.filter(x=>!known.has(keyOf(x))&&!items.some(y=>!y.row&&y.item===x.item&&Math.abs(y.at-x.at)<180000&&y!==x)).forEach(x=>{const k=keyOf(x);if(!express.includes(k)){express.push(k);if(Date.now()-x.at<120000)hold[k]=Date.now()+WAIT_ILL-10000}});
    }
    if(b&&b.totals)totals=b.totals;
    if(open)drawCounts();
  }
  function onMsg(e){
    const d=e.data||{};
    if(open&&d.type==="ill"&&d.ill){const x=items.find(y=>keyOf(y)===d.key);if(x){x.ill=d.ill;if(express.includes(d.key))release(d.key);else swapIll(x)}return}
    if(open&&d.type==="illfail"){release(d.key);return}
    if(!open||d.type!=="new"||!d.rec)return;
    merge([d.rec]);const k=keyOf(d.rec);if(!express.includes(k))express.unshift(k);hold[k]=Date.now()+(d.rec.wait?WAIT_ILL:5800);
    if(totals)totals.outcomes[d.rec.outcome]=(totals.outcomes[d.rec.outcome]||0)+1;
    // 想像図を描かない設定なら、結果画面の判定が出るころに割り込む（描く設定なら、届いたときに release で割り込む）
    setTimeout(()=>{if(!open)return;drawCounts();if(!d.rec.wait&&express.includes(k)){clearTimeout(timer);next()}},6000);
    if(d.rec.wait)setTimeout(()=>{if(open&&express.includes(k)&&!(hold[k]>Date.now())){clearTimeout(timer);next()}},WAIT_ILL+200);
  }
  async function showView(){
    if(open)return;open=true;VOICE.stop?.();
    el=document.createElement("div");el.id="archive";
    el.innerHTML=`<div class="gv-hd"><img class="arc-logo" src="assets/mvmnt-logo.png" alt="MVMNT"><div class="gv-t"><b>時空郵便局 渋谷窓口</b><span>2026年から2126年への配達と、その判定</span></div><div class="gv-cnt" id="gvCnt"></div></div>
      <div class="gv-desk" id="gvDesk"><div class="arc-empty">読み込んでいます…</div></div>`;
    ($("#stage")&&getComputedStyle($("#stage")).display!=="contents"&&!ARCHIVE_ONLY?$("#stage"):document.body).appendChild(el);
    merge(local());drawCounts();
    await refresh();if(!open)return;
    idx=-1;next();
    poll=setInterval(()=>{refresh();pollIll()},15000);ipoll=setInterval(pollIll,6000);bc&&(bc.onmessage=onMsg);
  }
  function close(){if(!open)return;open=false;clearTimeout(timer);clearInterval(poll);clearInterval(ipoll);if(bc)bc.onmessage=null;express=[];el?.remove();el=null}
  document.addEventListener("keydown",e=>{
    if(ARCHIVE_ONLY||staffOpen()||e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.code==="KeyG"&&!e.repeat){e.preventDefault();open?close():showView()}
    else if(e.code==="Escape"&&open){close()}
  });
  return{remember,attachSvg,attachIll,illFail,show:showView,close,isOpen:()=>open,keyOf};
})();
