/* 共通：短い関数、展示モード、物理ボタン、画面の切り替え、声 */
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const card=$("#card");
let stream=null,unmountFig=null,cleanup=[];
/* 展示モード：URLに ?exhibit=1 を付けて開く（カメラを開いたままにし、自動で最初の画面に戻る） */
const EXHIBIT=(()=>{try{const fq=new URLSearchParams(location.search).get("fx");if(fq!==null&&fq!=="0")localStorage.setItem("mirai_exhibit","1");const q=new URLSearchParams(location.search).get("exhibit");if(q!==null)localStorage.setItem("mirai_exhibit",q==="0"?"0":"1");return localStorage.getItem("mirai_exhibit")==="1"}catch{return new URLSearchParams(location.search).get("exhibit")==="1"}})();
if(EXHIBIT)document.body.classList.add("exhibit");
/* 演出ありモード：?fx=1（展示モードもONになる）。画面を少し縮め、外周を演出に使う */
const FXMODE=(()=>{try{const q=new URLSearchParams(location.search).get("fx");if(q!==null){localStorage.setItem("mirai_fx",q==="0"?"0":"1");if(q!=="0"){localStorage.setItem("mirai_exhibit","1");document.body.classList.add("exhibit")}}return localStorage.getItem("mirai_fx")==="1"}catch{return new URLSearchParams(location.search).get("fx")==="1"}})();
function lsGet(k,d){try{const v=localStorage.getItem(k);return v===null?d:v}catch{return d}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch{}}
function esc(s){return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const REDUCE=matchMedia("(prefers-reduced-motion: reduce)").matches;

/* 数字を1文字ずつ同じ幅の箱に入れる（Nidus Sans の数字は幅がそろっていないため） */
function digits(s){return [...String(s)].map(c=>/[0-9]/.test(c)?`<i>${c}</i>`:c===":"?`<i class="sep">:</i>`:esc(c)).join("")}
/* 郵便番号枠：数字を1文字ずつ四角に入れる（宛先・件数・配達番号） */
function boxes(s,cls=""){return `<span class="boxes ${cls}" aria-label="${esc(s)}">${[...String(s)].map(c=>`<b>${esc(c)}</b>`).join("")}</span>`}
/* 上の帯の時計 */
(function(){const el=$("#clock");if(!el)return;const t=()=>{const d=new Date();el.innerHTML=digits([d.getHours(),d.getMinutes(),d.getSeconds()].map(n=>String(n).padStart(2,"0")).join(":"))};t();setInterval(t,1000)})();

/* ===== 下の段：押す場所・自動で進む・話している人 =====
   ボタンを押す必要があるのは「はじめる」と「撮影」だけ。ほかの画面は声が終わると自動で進む */
let pushAct=null,lastPush=0;
const pushEl=$("#push"),nextEl=$("#next"),noteEl=$("#note");
// 押すボタンの言葉。展示では物理ボタンを押すので「ボタンを押して、〜」にする
const pressLabel=v=>EXHIBIT?`ボタンを押して、${v}`:v;
/* label があるとオレンジのボタンを出す。label が空でも fn があれば、ボタンで先へ進める（表示はしない） */
function setPush(label,fn){
  pushAct=fn;
  pushEl.hidden=!label;if(label)$("#pushL").textContent=label;
  nextEl.hidden=true;nextEl.removeAttribute("data-auto");
}
function clearPush(){setPush(null,null)}
/* 話している人：声が流れているあいだ、下の段に出す。ボタンは受け付けない（読み飛ばしを防ぐ） */
function setNote(text){noteEl.hidden=!text;$("#noteL").textContent=text||""}
/* 自動で次へ：ms 後に fn を呼ぶ。ボタン（物理ボタンも）を押せばすぐ進む。下の線が残り時間 */
function autoNext(ms,fn,label="次へ"){
  let done=false;const go=()=>{if(done)return;done=true;clearTimeout(t);fn()};
  const t=setTimeout(go,ms);cleanup.push(()=>{done=true;clearTimeout(t)});
  setNote("");setPush(null,go);
  nextEl.textContent=label;nextEl.hidden=false;nextEl.style.setProperty("--auto",ms+"ms");void nextEl.offsetWidth;nextEl.setAttribute("data-auto","");
  go.cancel=()=>{done=true;clearTimeout(t);clearPush()};
  return go;
}
// 声が出ないときに、読み終わるまで待つ目安（ゲームに慣れていない人が読める速さ）
const readMs=t=>String(t).length*190+2000;
function pushCodes(){try{const c=JSON.parse(lsGet("mirai_push_codes","null"));if(Array.isArray(c)&&c.length)return c}catch{}return["Enter","NumpadEnter","Space"]}
function firePush(){
  const now=performance.now();if(now-lastPush<800)return; // 連打・二重入力を防ぐ
  lastPush=now;SND.unlock();
  if(GAL.isOpen()){GAL.close();pageTitle();return}
  const f=pushAct;if(!f)return;
  pushAct=null; // 実行中は次の入力を受け付けない（次の画面で登録し直す）
  pushEl.classList.add("is-hit");setTimeout(()=>pushEl.classList.remove("is-hit"),220);
  f();
}
document.addEventListener("click",e=>{if(e.target.closest("#push,#next"))firePush()});
document.addEventListener("keydown",e=>{
  if(staffOpen()||e.ctrlKey||e.metaKey||e.altKey)return;
  if(!pushCodes().includes(e.code))return;
  e.preventDefault();e.stopPropagation();
  if(e.repeat)return; // 長押しの連続入力は無視
  firePush();
},true);

/* ===== 画面の切り替え =====
   scene() は、その画面がまだ表示されているかを返す関数（alive）を返す。画面が変わると false になる */
let SCENE=0;
function render(html){
  clearPush();setNote("");VOICE.stop();
  if(unmountFig){unmountFig();unmountFig=null}
  cleanup.forEach(f=>{try{f()}catch{}});cleanup=[];
  document.body.dataset.calm="";card.dataset.page="";
  card.classList.remove("is-in");void card.offsetWidth;card.innerHTML=html;card.classList.add("is-in");
  const id=++SCENE;return()=>id===SCENE;
}
function setChapter(n){
  const ol=$("#chapters");ol.hidden=!n;
  [...ol.children].forEach((li,i)=>{li.classList.toggle("is-on",i===n-1);li.classList.toggle("is-done",i<n-1)});
}
function setStatus(t){$("#barStatus").textContent=t}
function scene(page,html,{chapter=0,status="2126年と通信中"}={}){
  const alive=render(html);card.dataset.page=page;setChapter(chapter);setStatus(status);
  return alive;
}

/* ===== 声 =====
   talk：話し終わると解決する。音なし・声が出ないときは、読める時間だけ待つ */
async function talk(text,opt){
  const t0=performance.now();
  await Promise.race([VOICE.say(text,opt),sleep(readMs(text)*2+4000)]);
  const min=SND.isOn()?String(text).length*70+600:readMs(text);
  const left=min-(performance.now()-t0);if(left>0)await sleep(left);
}
// 文字を1つずつ出す
async function typeOut(el,text,alive){
  for(let i=1;i<=text.length;i++){
    if(!alive())return;
    el.innerHTML=esc(text.slice(0,i))+'<span class="cur"></span>';
    if(i%2)SND.type();
    await sleep("。、？！".includes(text[i-1])?300:REDUCE?0:52);
  }
}
// 先に音声を作っておき、話し始めの待ちをなくす（最大2.5秒まで待つ）
const ready=(text,opt)=>Promise.race([VOICE.prepare(text,opt),sleep(2500)]);
