// タイトル画面（待機中）：4枚のカードを順番に見せてくり返す。
// ルートのカードでは、手紙が2126→2026へ、物が2026→2126へ渡り、宛先の枠が光る（時空をつないでいる）
(()=>{
  const FRAME=4800;
  const frames=[...document.querySelectorAll("[data-frame]")],steps=[...document.querySelectorAll(".op-steps li")];
  const pkL=document.getElementById("pkLetter"),pkO=document.getElementById("pkObject"),year=document.getElementById("year");
  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.style.setProperty("--frame",FRAME+"ms");
  // 数字を1文字ずつ同じ幅の箱に入れる（Nidus Sans の数字は幅がそろっていないため）
  const digits=(el,s)=>{el.innerHTML=[...s].map(c=>/[0-9]/.test(c)?`<i>${c}</i>`:c===":"?`<i class="sep">:</i>`:c).join("")};
  document.querySelectorAll("[data-digits]").forEach(el=>digits(el,el.dataset.digits));
  const clock=document.getElementById("clock");
  const tick=()=>{const d=new Date();digits(clock,[d.getHours(),d.getMinutes(),d.getSeconds()].map(n=>String(n).padStart(2,"0")).join(":"))};tick();setInterval(tick,1000);
  const run=el=>{el.classList.remove("is-moving");void el.offsetWidth;el.classList.add("is-moving")};
  const connect=()=>{
    run(pkL);
    setTimeout(()=>run(pkO),reduce?0:1700);
    setTimeout(()=>{year.classList.remove("is-arrived");void year.offsetWidth;year.classList.add("is-arrived")},reduce?0:3500);
  };
  let i=-1;
  const show=()=>{
    i=(i+1)%frames.length;
    frames.forEach((f,k)=>f.classList.toggle("is-on",k===i));
    steps.forEach((s,k)=>{s.classList.toggle("is-on",k===i);s.classList.toggle("is-done",k<i)});
    if(frames[i].hasAttribute("data-route"))setTimeout(connect,700);
  };
  show();setInterval(show,FRAME);
})();
