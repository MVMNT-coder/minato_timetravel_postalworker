/* minatoの姿：粒子が集まって人の上半身の形に揺れる */
function minatoFigure(cv,{talk=false}={}){
  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dpr=Math.min(2,devicePixelRatio||1),r=cv.getBoundingClientRect();
  const W=Math.max(60,r.width),H=Math.max(80,r.height);
  cv.width=W*dpr;cv.height=H*dpr;const ctx=cv.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);
  const sub=cv.parentElement.querySelector(".figid")?18:0, FH=H-sub;
  // 形の判定（0〜1の座標）：頭・首・肩
  function inside(x,y){
    const hx=(x-.5)/.21,hy=(y-.33)/.23;if(hx*hx+hy*hy<1)return true;
    if(y>.52&&y<.7&&Math.abs(x-.5)<.075)return true;
    if(y>=.64&&y<=1){const k=Math.min(1,(y-.64)/.14),hw=.12+Math.sin(k*Math.PI/2)*.34;return Math.abs(x-.5)<hw}
    return false;
  }
  const ps=Math.max(1,W/210),N=Math.round(Math.min(4500,W*FH/(9*ps*ps))),P=[];
  while(P.length<N){
    const x=Math.random(),y=Math.random();if(!inside(x,y))continue;
    // 顔の中心と胸元を少し濃く
    const d=Math.hypot(x-.5,(y-.42)*1.3);if(Math.random()>.45+.55*Math.exp(-d*d*18))continue;
    P.push({hx:x,hy:y,x:Math.random(),y:Math.random()*1.1,vx:0,vy:0,a:.25+Math.random()*.75,s:Math.random()<.12?1.6:1,ph:Math.random()*6.28,o:Math.random()<.08});
  }
  let raf,kick=0;const t0=performance.now();
  cv.parentElement._kick=()=>{kick=1};
  function frame(now){
    const t=(now-t0)/1000;
    ctx.clearRect(0,0,W,H);
    const sway=Math.sin(t*.7)*.008,breath=1+Math.sin(t*1.6)*.006;
    const amp=talk?(.004+.004*(Math.sin(t*9)*.5+.5)*(Math.sin(t*1.3)>-.2?1:.2)):.003;
    if(kick>0){for(const p of P){p.vx+=(Math.random()-.5)*.03*kick;p.vy+=(Math.random()-.5)*.02*kick}kick=0}
    for(const p of P){
      const tx=.5+(p.hx-.5)*breath+sway*(1-p.hy),ty=p.hy;
      p.vx+=(tx-p.x)*.045+Math.sin(t*2+p.ph)*amp*.15+(Math.random()-.5)*amp;
      p.vy+=(ty-p.y)*.045+Math.cos(t*1.7+p.ph)*amp*.15+(Math.random()-.5)*amp;
      p.vx*=.82;p.vy*=.82;p.x+=p.vx;p.y+=p.vy;
      const fl=.6+.4*Math.sin(t*3+p.ph);
      ctx.fillStyle=p.o?`rgba(255,92,0,${p.a*fl})`:`rgba(236,232,223,${p.a*fl*.9})`;
      ctx.fillRect(p.x*W,p.y*FH,p.s*ps,p.s*ps);
    }
    // 足元の走査線
    ctx.fillStyle="rgba(236,232,223,.25)";ctx.fillRect(W*.15,FH*.995,W*.7,1);
    if(!reduce)raf=requestAnimationFrame(frame);
  }
  if(reduce){for(const p of P){p.x=p.hx;p.y=p.hy}}
  raf=requestAnimationFrame(frame);
  return()=>cancelAnimationFrame(raf);
}
