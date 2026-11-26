// タイトル画面の動き：起動（1回）→ 7秒ごとに荷物がルートを渡り、宛先の枠が光る
(()=>{
  const root=document.getElementById("opening"),line=document.getElementById("routeLine"),pk=document.getElementById("packet"),year=document.getElementById("year");
  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  // 時刻（渋谷窓口の現在時刻）
  const clock=document.getElementById("clock");
  const tick=()=>{const d=new Date();clock.textContent=[d.getHours(),d.getMinutes(),d.getSeconds()].map(n=>String(n).padStart(2,"0")).join(":")};tick();setInterval(tick,1000);
  // 宛先の XX は、届く瞬間だけ数字が揺れて、また X に戻る（年は決まっていない）
  const open=[...year.querySelectorAll(".is-open")];
  const scramble=ms=>new Promise(r=>{if(reduce)return r();const t0=performance.now();const f=()=>{const done=performance.now()-t0>ms;open.forEach(b=>b.textContent=done?"X":String(Math.random()*10|0));done?r():requestAnimationFrame(f)};f()});
  const deliver=async()=>{
    pk.classList.remove("is-moving");void pk.offsetWidth;pk.classList.add("is-moving");
    await new Promise(r=>setTimeout(r,reduce?0:2400));
    year.classList.remove("is-arrived");void year.offsetWidth;year.classList.add("is-arrived");scramble(700);
  };
  requestAnimationFrame(()=>{root.classList.add("is-on");setTimeout(()=>line.style.setProperty("--draw",1),350)});
  setTimeout(async()=>{await scramble(900);deliver();if(!reduce)setInterval(deliver,7000)},1500);
})();
