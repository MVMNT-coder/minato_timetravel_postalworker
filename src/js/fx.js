/* ===== 外周の演出（演出ありモード） =====
   画面（#stage）を中央に縮めて表示し、その外側の余白に演出を描く。
   プロジェクターでスクリーンからはみ出した部分が、そのまま演出になる想定 */
const FXB=(()=>{
  let m=Math.max(3,Math.min(15,Number(lsGet("mirai_fx_margin","5"))||5)),mode="idle",t0=performance.now();
  const api={set(){},margin:()=>m,setMargin(v){m=v;lsSet("mirai_fx_margin",String(v));apply()}};
  function apply(){document.documentElement.style.setProperty("--fxs",String(1-2*m/100))}
  if(!FXMODE)return api;
  document.body.classList.add("fxmode");apply();
  const cv=$("#fxb"),ctx=cv.getContext("2d");cv.hidden=false;
  let W,H;function size(){W=cv.width=innerWidth;H=cv.height=innerHeight}size();addEventListener("resize",size);
  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  let P=[];
  api.set=v=>{if(v===mode)return;mode=v;t0=performance.now();if(v!=="warp")P=P.filter(p=>p.k!=="streak")};
  // ページの切り替わりを見て、演出を自動で切り替える
  const MAP={title:"idle",intro:"comm",select:"comm",arrive:"comm",letter:"comm",request:"comm",camera:"scan",warp:"warp",wait:"suspense",reply:"comm",photo:"suspense",error:"idle"};
  new MutationObserver(()=>{const pg=card.dataset.page;if(MAP[pg])api.set(MAP[pg])}).observe(card,{attributes:true,attributeFilter:["data-page"]});
  const R=()=>({x0:W*m/100,y0:H*m/100,x1:W*(1-m/100),y1:H*(1-m/100)});
  // 外周上の位置 p(0〜1) → 画面の縁の座標と外向きの向き
  function edge(p){const r=R(),w=r.x1-r.x0,h=r.y1-r.y0,L=2*(w+h);let d=((p%1)+1)%1*L;
    if(d<w)return{x:r.x0+d,y:r.y0,nx:0,ny:-1};d-=w;
    if(d<h)return{x:r.x1,y:r.y0+d,nx:1,ny:0};d-=h;
    if(d<w)return{x:r.x1-d,y:r.y1,nx:0,ny:1};d-=w;
    return{x:r.x0,y:r.y1-d,nx:-1,ny:0}}
  // 画面の縁から外へ向かってにじむ光
  function glow(rgb,a){if(a<=0)return;const r=R(),mx=r.x0,my=r.y0,c0=`rgba(${rgb},${a})`,c1=`rgba(${rgb},0)`;
    const lin=(x0,y0,x1,y1,x,y,w,h)=>{const g=ctx.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,c0);g.addColorStop(1,c1);ctx.fillStyle=g;ctx.fillRect(x,y,w,h)};
    lin(0,r.y0,0,0,r.x0,0,r.x1-r.x0,my);lin(0,r.y1,0,H,r.x0,r.y1,r.x1-r.x0,my);lin(r.x0,0,0,0,0,r.y0,mx,r.y1-r.y0);lin(r.x1,0,W,0,r.x1,r.y0,mx,r.y1-r.y0);
    // 四隅は角から丸く広がる光にして、つなぎ目を出さない
    for(const [cx,cy,x,y] of [[r.x0,r.y0,0,0],[r.x1,r.y0,r.x1,0],[r.x0,r.y1,0,r.y1],[r.x1,r.y1,r.x1,r.y1]]){
      ctx.save();ctx.translate(cx,cy);ctx.scale(mx,my);const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,c0);g.addColorStop(1,c1);ctx.fillStyle=g;ctx.fillRect((x-cx)/mx,(y-cy)/my,1,1);ctx.restore()}}
  function frameLine(rgb,a,lw=2){const r=R();ctx.strokeStyle=`rgba(${rgb},${a})`;ctx.lineWidth=lw;ctx.strokeRect(r.x0-lw/2,r.y0-lw/2,r.x1-r.x0+lw,r.y1-r.y0+lw)}
  function runner(p,len,rgb,a){ctx.strokeStyle=`rgba(${rgb},${a})`;ctx.lineWidth=3;ctx.beginPath();for(let i=0;i<=12;i++){const e=edge(p-len*i/12),o=Math.min(W,H)*m/100*.55;const x=e.x+e.nx*o,y=e.y+e.ny*o;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()}
  function wave(t,amp,rgb,a){const r=R();ctx.strokeStyle=`rgba(${rgb},${a})`;ctx.lineWidth=1.5;
    for(const [yc,ph] of [[r.y0/2,0],[(H+r.y1)/2,2]]){ctx.beginPath();for(let x=0;x<=W;x+=8){const y=yc+Math.sin(x*.012+t*3+ph)*amp*Math.sin(x*.0031+t*.7)+Math.sin(x*.05+t*9)*amp*.25;x?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()}
    for(const [xc,ph] of [[r.x0/2,1],[(W+r.x1)/2,3]]){ctx.beginPath();for(let y=0;y<=H;y+=8){const x=xc+Math.sin(y*.012+t*3+ph)*amp*Math.sin(y*.0031+t*.7)+Math.sin(y*.05+t*9)*amp*.25;y?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()}}
  function spawn(k,n){for(let i=0;i<n;i++){const e=edge(Math.random());
    if(k==="streak")P.push({k,x:e.x,y:e.y,vx:e.nx,vy:e.ny,s:2+Math.random()*6,life:0,max:1,w:Math.random()<.3});
    else if(k==="spark"){const r=R();const side=Math.random()<.5;const x=side?(Math.random()<.5?Math.random()*r.x0:r.x1+Math.random()*r.x0):Math.random()*W;const y=side?H*Math.random():(Math.random()<.5?Math.random()*r.y0:r.y1+Math.random()*r.y0);
      P.push({k,x,y,vx:(Math.random()-.5)*.2,vy:-.3-Math.random()*.9,s:1+Math.random()*2.5,life:0,max:2+Math.random()*3,ph:Math.random()*6})}
    else if(k==="ash")P.push({k,x:Math.random()*W,y:-5,vx:(Math.random()-.5)*.3,vy:.4+Math.random()*.8,s:1+Math.random()*2,life:0,max:14})
    else if(k==="dot")P.push({k,x:e.x,y:e.y,vx:e.nx*.25,vy:e.ny*.25,s:1.5,life:0,max:5})}}
  let last=performance.now();
  function frame(now){
    const t=(now-t0)/1000,dt=Math.min(.05,(now-last)/1000);last=now;
    ctx.clearRect(0,0,W,H);const mpx=Math.min(W,H)*m/100;
    if(mode==="idle"){ // 待機：静かな通信。光が外周をゆっくり回る
      frameLine("255,92,0",.35);glow("255,92,0",.05+.03*Math.sin(t*.8));
      runner(t*.03,.06,"255,92,0",.8);runner(t*.03+.5,.06,"255,92,0",.8);
      if(Math.random()<.06)spawn("dot",1);
    }else if(mode==="comm"){ // minatoとの通信：波形
      frameLine("255,92,0",.45);glow("255,92,0",.07);wave(t,mpx*.28,"255,92,0",.65);
    }else if(mode==="scan"){ // 撮影：走査する光と四隅の枠
      frameLine("255,92,0",.6);glow("255,92,0",.06);
      for(let i=0;i<4;i++)runner(t*.12+i*.25,.05,"255,255,255",.85);
      const r=R(),c=mpx*.6,a=.5+.4*Math.sin(t*4);ctx.strokeStyle=`rgba(255,92,0,${a})`;ctx.lineWidth=3;
      for(const [x,y,sx,sy] of [[r.x0-mpx*.5,r.y0-mpx*.5,1,1],[r.x1+mpx*.5,r.y0-mpx*.5,-1,1],[r.x0-mpx*.5,r.y1+mpx*.5,1,-1],[r.x1+mpx*.5,r.y1+mpx*.5,-1,-1]]){ctx.beginPath();ctx.moveTo(x+sx*c,y);ctx.lineTo(x,y);ctx.lineTo(x,y+sy*c);ctx.stroke()}
    }else if(mode==="warp"){ // 時空転送：光の筋が画面から外へ噴き出す
      const k=Math.min(1,t/6);
      glow("255,92,0",.18+.25*k+.08*Math.sin(t*12));frameLine("255,255,255",.5+.4*k,3);
      spawn("streak",Math.round(4+k*22));
      for(let i=0;i<3;i++)runner(t*(.25+k*.6)+i/3,.12,"255,255,255",.9);
    }else if(mode==="suspense"){ // 判定待ち：鼓動のような明滅
      const b=Math.pow(Math.max(0,Math.sin(t*2.2)),6);frameLine("255,92,0",.3+.5*b);glow("255,92,0",.04+.14*b);
    }else if(mode==="saved"){ // 変わった：白と金のやわらかい光、舞い上がる光の粒
      const a=Math.min(1,t/1.5),br=.5+.15*Math.sin(t*1.3);
      glow("255,244,214",a*br);glow("255,200,90",a*.25);frameLine("255,255,255",a*.9,3);
      if(Math.random()<.9)spawn("spark",3);
      const r=R();ctx.save();ctx.globalAlpha=a*.25;ctx.strokeStyle="#fff6dc";ctx.lineWidth=2; // 上へ伸びる光の筋
      for(let i=0;i<24;i++){const x=W*(i+.5)/24+Math.sin(t*.5+i)*10,l=mpx*(.5+.5*Math.sin(t*.9+i*1.7));ctx.beginPath();ctx.moveTo(x,r.y0);ctx.lineTo(x+(x-W/2)*.04,r.y0-l);ctx.stroke()}ctx.restore();
    }else if(mode==="partial"){ // ちょっと変わった：光がつきかけて、ちらつきながら消えていく
      const d=Math.max(.12,1-t/7),fl=Math.random()<.12?.3:1;
      glow("255,170,60",.28*d*fl);frameLine("255,170,60",.7*d*fl);if(Math.random()<.25*d)spawn("spark",1);
    }else if(mode==="lost"){ // 変わらなかった：赤い点滅（1秒に1回のゆっくりした明滅）→ 灰になって沈む
      const alarm=Math.max(0,1-Math.max(0,t-6)/3),b=reduce?.5:Math.pow(.5+.5*Math.sin(t*Math.PI*2-Math.PI/2),2);
      glow("255,20,10",alarm*(.12+.5*b));frameLine("255,40,20",alarm*(.4+.6*b),4);
      if(t>4){glow("120,120,120",Math.min(.1,(t-4)*.02));frameLine("130,130,130",Math.min(.35,(t-4)*.06)*(1-alarm));if(Math.random()<.5)spawn("ash",1)}
    }
    // 粒子
    for(const p of P){p.life+=dt;
      if(p.k==="streak"){const v=p.s*(1+p.life*14);const x0=p.x,y0=p.y;p.x+=p.vx*v;p.y+=p.vy*v;p.x+=p.vy*Math.sin(p.life*9)*.6;p.y+=p.vx*Math.sin(p.life*9)*.6;
        const a=Math.max(0,1-p.life/p.max);ctx.strokeStyle=p.w?`rgba(255,255,255,${a})`:`rgba(255,110,20,${a})`;ctx.lineWidth=1+p.s*.35;ctx.beginPath();ctx.moveTo(x0-p.vx*v*2,y0-p.vy*v*2);ctx.lineTo(p.x,p.y);ctx.stroke()}
      else if(p.k==="spark"){p.x+=p.vx+Math.sin(p.life*2+p.ph)*.3;p.y+=p.vy;const a=Math.sin(Math.PI*Math.min(1,p.life/p.max))*(.6+.4*Math.sin(p.life*8+p.ph));
        ctx.fillStyle=mode==="partial"?`rgba(255,180,80,${a})`:`rgba(255,250,225,${a})`;ctx.fillRect(p.x,p.y,p.s,p.s);
        if(p.s>2.6){ctx.fillRect(p.x-p.s*1.5,p.y+p.s*.3,p.s*4,p.s*.4);ctx.fillRect(p.x+p.s*.3,p.y-p.s*1.5,p.s*.4,p.s*4)}}
      else if(p.k==="ash"){p.x+=p.vx+Math.sin(p.life+p.x*.01)*.2;p.y+=p.vy;ctx.fillStyle="rgba(150,150,150,.5)";ctx.fillRect(p.x,p.y,p.s,p.s)}
      else if(p.k==="dot"){p.x+=p.vx;p.y+=p.vy;ctx.fillStyle=`rgba(255,92,0,${.7*(1-p.life/p.max)})`;ctx.fillRect(p.x,p.y,p.s,p.s)}
    }
    P=P.filter(p=>p.life<p.max&&p.x>-20&&p.x<W+20&&p.y>-20&&p.y<H+20);if(P.length>1500)P.splice(0,P.length-1500);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return api;
})();
