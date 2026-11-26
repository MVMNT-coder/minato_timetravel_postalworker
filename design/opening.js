// タイトル画面（待機中）：4枚のカードを順番に見せてくり返す。ルートのカードでは荷物が2026から2126へ渡る
(()=>{
  const FRAME=4500;
  const frames=[...document.querySelectorAll("[data-frame]")],steps=[...document.querySelectorAll(".op-steps li")];
  const pk=document.getElementById("packet"),year=document.getElementById("year");
  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.style.setProperty("--frame",FRAME+"ms");
  // 渋谷窓口の現在時刻
  const clock=document.getElementById("clock");
  const tick=()=>{const d=new Date();clock.textContent=[d.getHours(),d.getMinutes(),d.getSeconds()].map(n=>String(n).padStart(2,"0")).join(":")};tick();setInterval(tick,1000);
  const deliver=()=>{
    pk.classList.remove("is-moving");void pk.offsetWidth;pk.classList.add("is-moving");
    setTimeout(()=>{year.classList.remove("is-arrived");void year.offsetWidth;year.classList.add("is-arrived")},reduce?0:2300);
  };
  let i=-1;
  const show=()=>{
    i=(i+1)%frames.length;
    frames.forEach((f,k)=>f.classList.toggle("is-on",k===i));
    steps.forEach((s,k)=>{s.classList.toggle("is-on",k===i);s.classList.toggle("is-done",k<i)});
    if(frames[i].hasAttribute("data-route"))setTimeout(deliver,900);
  };
  show();setInterval(show,FRAME);
})();
