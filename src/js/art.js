/* 世界の線画・封筒・AIの線画の取り込み */
/* ===== 世界の線画（viewBox 800x600・線だけ）。STORIES と同じ順番 =====
   後から画像に差し替えるときは、WORLD_IMG の同じ位置に画像のパスを書く（例："img/world1.png"）。
   パスが入っている世界は、線画の代わりにその画像を表示する */
const WORLD_IMG=["","",""];
const WORLD_ART=[
/* 1. すき間のない会社：同じ会議室で、6人が黙って会議を受け続ける */
`<path d="M70 60 v480"/><path d="M62 70 h16 M62 120 h16 M62 170 h16 M62 220 h16 M62 270 h16 M62 320 h16 M62 370 h16 M62 420 h16 M62 470 h16 M62 520 h16"/>
<rect x="90" y="70" width="130" height="50"/><rect x="90" y="120" width="130" height="50"/><rect x="90" y="170" width="130" height="50"/><rect x="90" y="220" width="130" height="50"/><rect x="90" y="270" width="130" height="50"/><rect x="90" y="320" width="130" height="50"/><rect x="90" y="370" width="130" height="50"/><rect x="90" y="420" width="130" height="50"/><rect x="90" y="470" width="130" height="50"/>
<path d="M104 90 h70 M104 104 h40 M104 140 h70 M104 154 h40 M104 190 h70 M104 204 h40 M104 240 h70 M104 254 h40 M104 290 h70 M104 304 h40 M104 340 h70 M104 354 h40 M104 390 h70 M104 404 h40 M104 440 h70 M104 454 h40 M104 490 h70 M104 504 h40"/>
<circle cx="310" cy="120" r="52"/><path d="M310 120 v-34 M310 120 l26 15"/><path d="M310 74 v8 M356 120 h-8 M310 166 v-8 M264 120 h8"/>
<rect x="400" y="50" width="360" height="200" rx="8"/><path d="M430 90 h190 M430 125 h250 M430 160 h160"/><rect x="430" y="200" width="300" height="18" rx="9"/><path d="M440 209 h210"/><path d="M700 82 l20 12 l-20 12"/>
<rect x="296" y="262" width="100" height="50" rx="22"/><path d="M362 312 l14 22 l4 -22"/><circle cx="324" cy="287" r="4"/><circle cx="346" cy="287" r="4"/><circle cx="368" cy="287" r="4"/>
<circle cx="345" cy="372" r="22"/><path d="M315 420 q30 -42 60 0"/><circle cx="417" cy="372" r="22"/><path d="M387 420 q30 -42 60 0"/><circle cx="489" cy="372" r="22"/><path d="M459 420 q30 -42 60 0"/>
<circle cx="561" cy="372" r="22"/><path d="M531 420 q30 -42 60 0"/><circle cx="633" cy="372" r="22"/><path d="M603 420 q30 -42 60 0"/><circle cx="705" cy="372" r="22"/><path d="M675 420 q30 -42 60 0"/>
<path d="M300 420 h460 l30 60 h-520 z"/><path d="M300 480 v70 M760 480 v70"/>
<path d="M440 450 v-20 h26 v20"/><path d="M466 436 q10 0 10 7 q0 7 -10 7"/><path d="M448 422 q-6 -9 0 -18 M460 422 q-6 -9 0 -18"/>
<path d="M600 450 v-20 h26 v20"/><path d="M626 436 q10 0 10 7 q0 7 -10 7"/><path d="M608 422 q-6 -9 0 -18 M620 422 q-6 -9 0 -18"/>`,
/* 2. 外れないプレゼント：AIのおすすめが3年連続で同じ */
`<g transform="translate(0 50)"><rect x="60" y="110" width="170" height="300" rx="18"/><path d="M125 130 h40"/>
<path d="M110 170 h70 l-10 100 h-50 z"/><path d="M110 180 h70"/><rect x="128" y="270" width="34" height="20"/>
<circle cx="145" cy="340" r="22"/><path d="M134 340 l8 9 l15 -18"/><path d="M90 385 h110"/>
<rect x="340" y="60" width="120" height="110" rx="6"/><path d="M340 90 h120"/><path d="M370 50 v20 M430 50 v20"/><circle cx="365" cy="112" r="3"/><circle cx="390" cy="112" r="3"/><circle cx="415" cy="112" r="3"/><circle cx="440" cy="112" r="3"/><circle cx="365" cy="142" r="3"/><circle cx="390" cy="142" r="3"/><circle cx="415" cy="142" r="3"/><circle cx="440" cy="142" r="3"/><circle cx="415" cy="142" r="13"/>
<path d="M40 440 h720"/><rect x="315" y="290" width="170" height="150"/><rect x="300" y="250" width="200" height="40"/><path d="M400 250 v190"/>
<path d="M400 250 q-50 -60 -72 -12 q20 22 72 12 M400 250 q50 -60 72 -12 q-20 22 -72 12"/>
<path d="M560 326 h50 l-8 90 h-34 z"/><path d="M560 336 h50"/><rect x="570" y="416" width="30" height="24"/>
<path d="M630 326 h50 l-8 90 h-34 z"/><path d="M630 336 h50"/><rect x="640" y="416" width="30" height="24"/>
<path d="M700 326 h50 l-8 90 h-34 z"/><path d="M700 336 h50"/><rect x="710" y="416" width="30" height="24"/>
<path d="M560 306 v-12 h190 v12"/><path d="M686 246 a32 32 0 1 1 -18 -30"/><path d="M668 216 l-2 -16 M668 216 l-15 4"/>
<path d="M520 200 v12 M514 206 h12 M270 210 v10 M265 215 h10"/></g>`,
/* 3. アップデートの1時間：街じゅうのAIが止まった夜の家 */
`<path d="M70 230 l250 -160 l250 160"/><path d="M110 205 v345 M530 205 v345"/><path d="M40 550 h720"/>
<rect x="140" y="250" width="110" height="100"/><path d="M195 250 v100 M140 300 h110"/><path d="M232 262 a16 16 0 1 0 8 28 a12 12 0 1 1 -8 -28"/>
<path d="M320 110 v70"/><circle cx="320" cy="200" r="20"/><rect x="310" y="174" width="20" height="10"/><path d="M296 176 l48 48"/>
<circle cx="440" cy="180" r="30"/><path d="M440 180 v-20 M440 180 l14 8"/>
<path d="M170 520 v-60 h320 v60"/><path d="M160 470 v50 M500 470 v50"/><path d="M170 488 h320"/>
<circle cx="215" cy="400" r="20"/><path d="M215 420 v68 M215 440 l-18 30 M215 440 l18 30"/>
<circle cx="285" cy="396" r="20"/><path d="M285 416 v72 M285 438 l-18 32 M285 438 l18 32"/>
<circle cx="360" cy="424" r="15"/><path d="M360 439 v49 M360 452 l-14 22 M360 452 l14 22"/>
<circle cx="425" cy="424" r="15"/><path d="M425 439 v49 M425 452 l-14 22 M425 452 l14 22"/>
<rect x="590" y="190" width="50" height="150"/><rect x="655" y="230" width="55" height="110"/><rect x="722" y="170" width="48" height="170"/>
<path d="M600 210 h30 M600 240 h30 M600 270 h30 M665 250 h35 M665 280 h35 M732 190 h28 M732 220 h28 M732 250 h28"/>
<path d="M650 120 a40 40 0 0 1 72 -16"/><path d="M722 104 l2 -18 M722 104 l-17 -5"/><path d="M730 140 a40 40 0 0 1 -72 16"/><path d="M658 156 l-2 18 M658 156 l17 5"/>
<rect x="610" y="430" width="70" height="90" rx="10"/><rect x="620" y="380" width="50" height="40" rx="8"/><path d="M630 402 h10 M650 402 h10"/><path d="M645 380 v-14"/><path d="M610 450 l-14 50 M680 450 l14 50"/><path d="M630 520 v30 M660 520 v30"/>
<circle cx="740" cy="410" r="14"/><path d="M740 392 v16"/>
<path d="M560 60 v10 M555 65 h10 M480 40 v10 M475 45 h10 M770 60 v10 M765 65 h10"/>`
];
const SVGNS="http://www.w3.org/2000/svg";
function worldArtEl(i){
  if(typeof STORIES!=="undefined"&&STORIES[i]&&STORIES[i].art!==undefined)i=STORIES[i].art;
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
