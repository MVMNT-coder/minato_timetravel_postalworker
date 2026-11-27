/* ===== 自動リセット（展示モード）：操作がないまま時間がたつと待機画面に戻る ===== */
const IDLE=(()=>{
  // 画面ごとの「操作なしで待つ秒数」。自動で進む画面は、止まったときの保険として長めにする。title は対象外
  const LIMIT={intro:60,select:60,arrive:60,letter:90,request:60,camera:60,warp:60,wait:120,reply:90,photo:60,verdict:60,gap:60,error:20};
  let photo=Number(lsGet("mirai_photo_sec_v5","7"))||7;
  let since=performance.now(),page="";
  const touch=()=>{since=performance.now()};
  // 想像図を表示する秒数（スタッフ用パネルで変える）
  const api={touch,photoSec:()=>photo,setPhotoSec(v){photo=v;lsSet("mirai_photo_sec_v5",String(v))}};
  if(!EXHIBIT)return api;
  ["pointerdown","keydown"].forEach(ev=>document.addEventListener(ev,touch,true));
  setInterval(()=>{
    const el=$("#idle"),pg=card.dataset.page||"";
    if(pg!==page){page=pg;touch()}
    const lim=LIMIT[pg];
    if(!lim||staffOpen()||GAL.isOpen()){if(el)el.hidden=true;if(GAL.isOpen())touch();return}
    const left=Math.ceil(lim-(performance.now()-since)/1000);
    if(left<=0){el.hidden=true;document.body.classList.remove("desat");pageTitle();return}
    if(left<=10){el.hidden=false;el.textContent=`あと${left}秒で最初の画面に戻ります`}else el.hidden=true;
  },500);
  return api;
})();
