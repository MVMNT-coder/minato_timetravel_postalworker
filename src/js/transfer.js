/* 時空転送の粒子アニメーション、写真の縮小、想像図の取得とギャラリーへの共有 */
/* 5. 時空転送：品物を粒子に分解 → 時空を流れる → 2126年でminatoの手元に再構成 */
function txScene(cv,img){
  const dpr=Math.min(1.5,devicePixelRatio||1),r=cv.getBoundingClientRect();
  const W=Math.max(320,r.width),H=Math.max(240,r.height);
  cv.width=W*dpr;cv.height=H*dpr;const ctx=cv.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);
  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  // 写真を粗いマス目で読み取り、1マス＝1粒子にする
  const asp=img.width/img.height,gh=72,gw=Math.round(gh*asp);
  const off=document.createElement("canvas");off.width=gw;off.height=gh;
  const og=off.getContext("2d");og.drawImage(img,0,0,gw,gh);const px=og.getImageData(0,0,gw,gh).data;
  const rectFor=(cx,hFrac)=>{const h=H*hFrac,w=Math.min(W*.5,h*asp),hh=w/asp;return{x:cx-w/2,y:H/2-hh/2,w,h:hh}};
  const A=rectFor(W*.5,.66),B=rectFor(W*.66,.54);
  const cell=A.w/gw,P=[];
  for(let j=0;j<gh;j++)for(let i=0;i<gw;i++){
    const k=(j*gw+i)*4;
    P.push({i,j,r:px[k],g:px[k+1],b:px[k+2],x:A.x+i*cell,y:A.y+j*cell,vx:0,vy:0,
      d:.5+(1-i/gw)*1.6+Math.random()*.7, // 右側から順にほどけていく
      d2:Math.random()*1.3,sy:(Math.random()-.5),ph:Math.random()*6.28});
  }
  const streaks=Array.from({length:70},()=>({x:Math.random()*W,y:Math.random()*H,s:.4+Math.random()}));
  let phase="A",t0=performance.now(),tB=0,raf;
  function frame(now){
    const t=(now-t0)/1000;
    ctx.fillStyle="#0A0A09";ctx.fillRect(0,0,W,H);
    // 流れる光の筋（時空を移動している感じ）
    const sp=phase==="A"?Math.min(1,t/3.5):Math.max(0,1-(now-tB)/1500);
    if(sp>0&&!reduce){ctx.lineWidth=1;for(const s of streaks){s.x-=s.s*(6+sp*46);if(s.x<-80){s.x=W+Math.random()*80;s.y=Math.random()*H}
      ctx.strokeStyle=`rgba(255,92,0,${.12+.3*sp*s.s})`;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x+(20+sp*160)*s.s,s.y);ctx.stroke()}}
    if(phase==="A"){
      for(const p of P){
        const k=t-p.d;
        if(k<=0){ctx.fillStyle=`rgb(${p.r},${p.g},${p.b})`;ctx.fillRect(p.x,p.y,cell+.6,cell+.6);continue}
        // ほどけた粒子は右へ加速して流れていく。色はオレンジに変わる
        p.vx+=.35+k*.5;p.vy+=Math.sin(k*5+p.ph)*.25+p.sy*.05;p.x+=p.vx;p.y+=p.vy;
        if(p.x>W+30)continue;
        const m=Math.min(1,k*1.6);
        ctx.fillStyle=`rgb(${p.r+(255-p.r)*m|0},${p.g+(110-p.g)*m|0},${p.b+(20-p.b)*m|0})`;
        const s=Math.max(1.2,cell*(1-m*.45));ctx.fillRect(p.x,p.y,s+p.vx*.6,s);
      }
    }else{
      const tb=(now-tB)/1000,cellB=B.w/gw,bob=Math.sin(tb*1.6)*4;
      let settled=0;
      for(const p of P){
        const k=tb-p.d2;if(k<=0)continue;
        const tx=B.x+p.i*cellB,ty=B.y+p.j*cellB+bob;
        const e=Math.min(1,k/1.5),ee=1-Math.pow(1-e,3);
        const x=p.bx+(tx-p.bx)*ee,y=p.by+(ty-p.by)*ee+Math.sin(k*6+p.ph)*(1-ee)*18;
        if(e>=1)settled++;
        const m=1-ee;
        ctx.fillStyle=`rgb(${p.r+(255-p.r)*m|0},${p.g+(110-p.g)*m|0},${p.b+(20-p.b)*m|0})`;
        ctx.fillRect(x,y,cellB+.6+(1-ee)*10,cellB+.6);
      }
      if(settled>P.length*.97){
        // 再構成が終わったら、くっきりした写真と枠・走査線を重ねる（minatoが調べている）
        const a=Math.min(1,(tb-2.9)/.6);
        if(a>0){ctx.globalAlpha=a;ctx.drawImage(img,B.x,B.y+bob,B.w,B.h);ctx.globalAlpha=1}
        const m=14,L=26;ctx.strokeStyle="#ff5c00";ctx.lineWidth=2;
        for(const [x,y,sx,sy] of [[B.x-m,B.y-m,1,1],[B.x+B.w+m,B.y-m,-1,1],[B.x-m,B.y+B.h+m,1,-1],[B.x+B.w+m,B.y+B.h+m,-1,-1]]){ctx.beginPath();ctx.moveTo(x+sx*L,y+bob);ctx.lineTo(x,y+bob);ctx.lineTo(x,y+bob+sy*L);ctx.stroke()}
        if(!reduce){const sy=B.y+bob+((tb*.45)%1)*B.h;ctx.fillStyle="rgba(255,92,0,.75)";ctx.fillRect(B.x-m,sy,B.w+m*2,2);
          const g=ctx.createLinearGradient(0,sy-40,0,sy);g.addColorStop(0,"rgba(255,92,0,0)");g.addColorStop(1,"rgba(255,92,0,.18)");ctx.fillStyle=g;ctx.fillRect(B.x-m,sy-40,B.w+m*2,40)}
      }
      // 受付カウンターの線
      ctx.strokeStyle="rgba(236,232,223,.25)";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(W*.06,B.y+B.h+34);ctx.lineTo(W*.94,B.y+B.h+34);ctx.stroke();
    }
    raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
  return{
    stop(){cancelAnimationFrame(raf)},
    // 2126年に到着：粒子が左から流れ込んで、品物の形に戻る
    arrive(){phase="B";tB=performance.now();for(const p of P){p.bx=-40-Math.random()*W*.5;p.by=H*.5+p.sy*H*.5}}
  };
}

/* 結果画面の想像図：その世界で品物がどう使われたかを、AIに描かせる
   描くAIはスタッフ用パネルで切り替える（claude＝線画のSVG／gemini＝画像。送った物の写真も参考に渡す／off＝描かない） */
const ILL={
  MODELS:[["gemini-nano-banana-2.1","Nano Banana 2.1（おすすめ）"],["gemini-3.1-flash-image","Nano Banana 2"],["gemini-3.1-flash-lite-image","Nano Banana 2 Lite（速い・安い）"],["gemini-3-pro-image","Nano Banana Pro（高品質・遅い）"]],
  engine:()=>{const v=lsGet("mirai_illust_engine","claude");return ["claude","gemini","off"].includes(v)?v:"claude"},
  model:()=>lsGet("mirai_gemini_model","gemini-nano-banana-2.1"),
  set:(k,v)=>lsSet(k==="engine"?"mirai_illust_engine":"mirai_gemini_model",v)
};
async function fetchIllust(r,outcome,thumb){
  const eng=ILL.engine();
  if(!window.GAS_URL||eng==="off")return null;
  const body={mode:"illust",engine:eng,row:r._row||0,story:storyIdx,item:r.item_name,happened:r.happened,outcome};
  if(eng==="gemini"){body.model=ILL.model();if(thumb)body.image=String(thumb).split(",")[1]}
  const res=await fetch(window.GAS_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
  const d=await res.json();
  if(!d.ok){console.warn("想像図を描けませんでした",d.detail||d.error);return null}
  if(d.image&&/^data:image\/(png|jpeg|webp);base64,/.test(d.image)){const im=new Image();im.className="gen";im.alt="";im.src=d.image;await im.decode().catch(()=>{});return im}
  return d.svg?safeSvg(d.svg):null;
}

/* 想像図をギャラリーにも届ける：小さいJPEGにして、同じPCのギャラリーへ知らせ、シートにも残す（別のPCのギャラリー用） */
async function illThumb(art){
  const c=document.createElement("canvas");c.width=400;c.height=300;const g=c.getContext("2d");g.fillStyle="#000";g.fillRect(0,0,400,300);
  let src=art,url="";
  if(art.tagName!=="IMG"){
    const sv=art.cloneNode(true);sv.querySelectorAll("*").forEach(e=>e.removeAttribute("style"));sv.removeAttribute("style");
    sv.setAttribute("width","800");sv.setAttribute("height","600");sv.setAttribute("xmlns",SVGNS);
    const st=document.createElementNS(SVGNS,"style");st.textContent="*{fill:none;stroke:#ECE8DF;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}";sv.prepend(st);
    url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(sv)],{type:"image/svg+xml"}));
    src=new Image();src.src=url;await src.decode();
  }else if(!art.complete)await art.decode().catch(()=>{});
  const w=src.naturalWidth||800,h=src.naturalHeight||600,k=Math.max(400/w,300/h);
  g.drawImage(src,(400-w*k)/2,(300-h*k)/2,w*k,h*k);if(url)URL.revokeObjectURL(url);
  return c.toDataURL("image/jpeg",.7);
}
async function shareIll(rec,art){
  try{
    let ill;try{ill=await illThumb(art)}catch(e){GAL.illFail(rec);throw e}
    GAL.attachIll(rec,ill);
    if(rec.row&&window.GAS_URL)fetch(window.GAS_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({mode:"ill_thumb",row:rec.row,item:rec.item,data:ill.split(",")[1]})}).catch(()=>{});
  }catch(e){console.warn("shareIll",e)}
}

function scaled(src,max){const k=Math.min(1,max/Math.max(src.width,src.height));const c=document.createElement("canvas");c.width=Math.round(src.width*k);c.height=Math.round(src.height*k);c.getContext("2d").drawImage(src,0,0,c.width,c.height);return c}
function crop32(src,w){const h=Math.round(w*2/3),sa=src.width/src.height;let sw=src.width,sh=src.height,sx=0,sy=0;if(sa>1.5){sw=sh*1.5;sx=(src.width-sw)/2}else{sh=sw/1.5;sy=(src.height-sh)/2}const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(src,sx,sy,sw,sh,0,0,w,h);return c.toDataURL("image/jpeg",.6)}
function square(src,size){const s=Math.min(src.width,src.height);const c=document.createElement("canvas");c.width=c.height=size;c.getContext("2d").drawImage(src,(src.width-s)/2,(src.height-s)/2,s,s,0,0,size,size);return c.toDataURL("image/jpeg",.75)}
function flash(){const d=document.createElement("div");d.className="flash";document.body.appendChild(d);setTimeout(()=>d.remove(),700)}

