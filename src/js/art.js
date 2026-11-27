/* 世界の線画・封筒・AIの線画の取り込み */
/* ===== 世界の線画（viewBox 800x600・線だけ）。FUTURES と同じ順番 =====
   後から画像に差し替えるときは、WORLD_IMG の同じ位置に画像のパスを書く（例："img/world1.png"）。
   パスが入っている世界は、線画の代わりにその画像を表示する */
const WORLD_IMG=["","",""];
const WORLD_ART=[
/* 1. スコアで食べる未来：社食の自動配膳カウンターと、壁の健康スコア */
`<rect x="470" y="60" width="270" height="170"/><circle cx="540" cy="145" r="50"/><path d="M540 95 A50 50 0 1 1 497 170"/><path d="M540 145 m-14 0 h28"/>
<path d="M615 105 h95 M615 135 h70 M615 165 h85 M615 195 h55"/>
<path d="M40 340 h720 M40 362 h720"/><path d="M80 362 v190 M720 362 v190"/>
<rect x="110" y="170" width="220" height="140"/><path d="M135 200 h120 M135 225 h80"/><rect x="250" y="250" width="56" height="34"/><path d="M220 310 v20 M160 310 v20 M280 310 v20"/>
<rect x="140" y="300" width="160" height="40"/><path d="M190 300 v40 M245 300 v40"/><circle cx="165" cy="320" r="9"/><path d="M205 316 h28 M205 326 h20"/><circle cx="272" cy="320" r="10"/>
<path d="M392 340 l6 -92 h48 l6 92 z"/><rect x="410" y="226" width="20" height="22"/><path d="M402 290 h40"/>
<circle cx="600" cy="292" r="22"/><path d="M600 314 v92 M600 336 l-34 24 l-14 -26 M600 336 l32 22 M600 406 l-24 72 M600 406 l24 72"/>
<path d="M90 560 v-150 M210 560 v-150 M90 410 h120"/><path d="M104 440 h92 M104 466 h92 M104 492 h92"/>`,
/* 2. 服を捨てられない未来：リペア工房の作業台と、受け継がれてきた服 */
`<path d="M50 80 h430"/><path d="M110 80 v16 l-46 30 h92 z"/><path d="M72 126 l-14 170 h104 l-14 -170"/><path d="M64 140 l-26 110 M156 140 l26 110"/><rect x="118" y="196" width="22" height="30"/><path d="M129 196 v-10"/>
<path d="M250 80 v16 l-46 30 h92 z"/><path d="M212 126 l-10 150 h96 l-10 -150"/><path d="M230 170 l20 14 l20 -14"/><rect x="262" y="214" width="22" height="30"/><path d="M273 214 v-10"/>
<path d="M390 80 v16 l-40 28 h80 z"/><path d="M356 124 v130 h68 v-130"/><path d="M370 160 h40 M370 190 h40"/><rect x="398" y="226" width="22" height="30"/><path d="M409 226 v-10"/>
<rect x="540" y="70" width="210" height="160"/><circle cx="566" cy="108" r="6"/><circle cx="566" cy="140" r="6"/><circle cx="566" cy="172" r="6"/><circle cx="566" cy="204" r="6"/><path d="M584 108 h140 M584 140 h110 M584 172 h130 M584 204 h80"/>
<path d="M40 430 h720 M40 452 h720 M90 452 v110 M710 452 v110"/>
<path d="M490 430 v-112 h176 v42 h-134 v70"/><circle cx="648" cy="338" r="14"/><path d="M640 360 v40 M630 400 h20"/>
<rect x="420" y="388" width="26" height="42"/><path d="M416 388 h34 M416 430 h34"/><path d="M446 400 q40 -20 70 2"/>
<circle cx="260" cy="320" r="22"/><path d="M260 342 v66 M260 362 l70 40 M260 362 l62 52 M260 408 h-40 v46 M260 408 l30 22 v24"/>`,
/* 3. 体験がぜいたく品になった未来：壁の3面がスクリーンの6畳の部屋と、小さな窓の外の公園 */
`<rect x="230" y="110" width="340" height="240"/><path d="M40 30 L230 110 M40 570 L230 350 M760 30 L570 110 M760 570 L570 350"/>
<path d="M250 320 l70 -100 l46 54 l62 -96 l92 142"/><path d="M370 230 l18 22 M426 178 l24 34"/>
<path d="M70 300 q30 -22 60 0 t60 0 M70 350 q30 -22 60 0 t60 0 M80 400 q26 -18 52 0 t52 0"/>
<path d="M630 190 q14 -26 42 -10 q18 -22 40 6 q20 2 18 22 h-96 q-16 -6 -4 -18"/><path d="M640 300 h80 M650 330 h60"/>
<rect x="490" y="128" width="62" height="62"/><path d="M490 159 h62 M521 128 v62"/><circle cx="510" cy="148" r="8"/><path d="M510 156 v14"/>
<circle cx="400" cy="420" r="22"/><path d="M400 442 v58 M400 464 l-42 24 M400 464 l42 24 M400 500 l-56 30 h-20 M400 500 l56 30 h20"/>
<ellipse cx="400" cy="548" rx="96" ry="14"/>`
];
const SVGNS="http://www.w3.org/2000/svg";
function worldArtEl(i){
  if(typeof FUTURES!=="undefined"&&FUTURES[i]&&FUTURES[i].art!==undefined)i=FUTURES[i].art;
  if(WORLD_IMG[i]){const im=new Image();im.src=WORLD_IMG[i];im.className="artimg";im.alt="";return im}
  const d=new DOMParser().parseFromString(`<svg xmlns="${SVGNS}" viewBox="0 0 800 600" class="art">${WORLD_ART[i]}</svg>`,"image/svg+xml");
  return document.importNode(d.documentElement,true);
}
/* 線を1本ずつ描いていくアニメーション */
function drawIn(svg,per=70,dur=900){
  if(!svg||svg.tagName==="IMG")return;
  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  [...svg.querySelectorAll("path,line,circle,ellipse,rect,polyline,polygon")].forEach((el,i)=>{
    if(reduce)return;
    el.setAttribute("pathLength","1");el.style.strokeDasharray="1";el.style.strokeDashoffset="1";
    el.style.animation=`draw ${dur}ms ease forwards ${i*per}ms`;
  });
}
/* AIが描いた線画を、安全な要素・属性だけ残して取り込む */
function safeSvg(str){
  try{
    const d=new DOMParser().parseFromString(String(str),"image/svg+xml"),root=d.documentElement;
    if(root.nodeName!=="svg"||d.querySelector("parsererror"))return null;
    const OK=new Set(["g","path","line","circle","ellipse","rect","polyline","polygon"]);
    const AT=new Set(["d","x","y","x1","y1","x2","y2","cx","cy","r","rx","ry","width","height","points","transform"]);
    const out=document.createElementNS(SVGNS,"svg");
    const vb=root.getAttribute("viewBox")||"";out.setAttribute("viewBox",/^[\d.\s,-]+$/.test(vb)&&vb.trim()?vb:"0 0 800 600");out.setAttribute("class","art");
    let n=0;
    (function walk(src,dst){for(const c of src.children){
      if(!OK.has(c.nodeName)||n>=200)continue;n++;
      const e=document.createElementNS(SVGNS,c.nodeName);
      for(const a of c.attributes)if(AT.has(a.name)&&a.value.length<6000&&/^[\w\s.,()+\-]*$/.test(a.value))e.setAttribute(a.name,a.value);
      dst.appendChild(e);if(c.nodeName==="g")walk(c,e);
    }})(root,out);
    return n>=3?out:null;
  }catch{return null}
}

/* 封筒（受信の画面で、世界の線画の上に飛んでくる）。切手だけシグナルの色 */
const ENV_SVG=`<svg class="env-svg" viewBox="0 0 300 190" aria-hidden="true"><rect class="e-b" x="4" y="4" width="292" height="182"/><path class="e-l" d="M4 4 L150 108 L296 4"/><rect class="e-s" x="236" y="18" width="44" height="54"/><circle class="e-p" cx="226" cy="60" r="24"/><path class="e-p" d="M190 52 q10 -6 20 0 t20 0 t20 0 M190 64 q10 -6 20 0 t20 0 t20 0"/></svg>`;
