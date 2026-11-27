/* ===== スタッフ用パネル（Ctrl+Shift+S で開閉） ===== */
function staffOpen(){return !!$("#staff")&&!$("#staff").hidden}
(function(){
  const el=document.createElement("div");el.id="staff";el.hidden=true;el.innerHTML=`
    <div class="sp-box"><div class="sp-hd"><b>スタッフ用の設定</b><button id="spX">閉じる</button></div>
    <section><h3>カメラ</h3><div class="sp-row"><select id="spCam"></select><button id="spCamUse">このカメラを使う</button></div>
      <video id="spV" autoplay playsinline muted></video><div class="sp-st" id="spCamSt"></div></section>
    <section><h3>物理ボタン</h3><div class="sp-st">今のキー：<b id="spKeys"></b></div>
      <div class="sp-row"><button id="spLearn">ボタンを登録（押して覚えさせる）</button><button id="spKeyReset">既定に戻す</button></div>
      <div class="sp-st" id="spKeySt">最後に押されたキー：-</div></section>
    <section><h3>音</h3><div class="sp-row"><button id="spSnd">テスト音を鳴らす</button>
        <label>全体の音量 <input type="range" id="spVol" min="0" max="1.5" step="0.05"></label></div><div class="sp-st" id="spSndSt"></div></section>
    <section><h3>ミナトの声（VOICEVOX）</h3><div class="sp-st" id="spVvSt">確認中…</div>
      <div class="sp-row"><select id="spVvSpk"></select><button id="spVvTest">声をテスト</button>
        <label>声の音量 <input type="range" id="spVvVol" min="0" max="1" step="0.05"></label></div>
      <div class="sp-st">手紙の差出人の声（未来ごと）</div>
      ${FUTURES.map((st,i)=>`<div class="sp-row"><label>${esc(st.name)}（${st.age}歳・${esc(st.job)}） <select id="spVvS${i}"></select></label><button data-vt="${i}">テスト</button></div>`).join("")}
      <div class="sp-st">VOICEVOXを起動し、設定の「CORS Policy Mode」を all にしてください。起動していないときは、ブラウザ内蔵の声で代用します。</div></section>
    <section><h3>想像図（結果画面のイラスト）</h3>
      <div class="sp-row"><label>描くAI <select id="spIll"><option value="claude">Claude（線画）</option><option value="gemini">Gemini（画像）</option><option value="off">描かない</option></select></label>
        <label>Geminiのモデル <select id="spGm"></select></label><button id="spGmTest">Geminiでテスト</button></div>
      <div class="sp-st" id="spIllSt">確認中…</div><img id="spGmImg" alt="" hidden style="max-width:240px;margin-top:8px;border:var(--line)"></section>
    <section><h3>展示モード</h3><div class="sp-st">今：<b>${EXHIBIT?"ON":"OFF"}</b>（URLに ?exhibit=1 / ?exhibit=0 で切替）</div></section>
    <section><h3>演出ありモード（外周の演出）</h3><div class="sp-st">今：<b>${FXMODE?"ON":"OFF"}</b>（URLに ?fx=1 / ?fx=0 でも切替）</div>
      <div class="sp-row"><button id="spFx">${FXMODE?"OFFにする":"ONにする"}</button>
      <label>外周の幅（片側） <select id="spFxM">${[3,5,8,10,12,15].map(v=>`<option value="${v}">${v}%</option>`).join("")}</select></label>
      <button id="spFxTest">演出を順番にテスト</button></div></section>
    <section><h3>表示する時間・自動リセット</h3><div class="sp-row"><label>同封の写真を表示する時間 <select id="spRes">${[5,7,10,15,20].map(v=>`<option value="${v}">${v}秒</option>`).join("")}</select></label></div>
      <div class="sp-st">撮影の画面は、操作がないまま60秒たつと最初の画面に戻ります。ほかの画面は自動で進みます。</div></section>
    <section><h3>配達レポート（左の画面）</h3><div class="sp-row"><button id="spGal">配達レポートを開く（G キー）</button></div><div class="sp-st">サブディスプレイには、URLに ?view=archive を付けて別のウィンドウで開きます。</div></section>
    <section><h3>リセット</h3><div class="sp-row"><button id="spReset" class="warn">TOPへ強制リセット</button><button id="spReload">ページを再読み込み</button></div></section>
    </div>`;
  document.body.appendChild(el);
  let learning=false;
  const keysUI=()=>{$("#spKeys").textContent=pushCodes().join(" / ")};
  async function fillCams(){
    const cams=await listCams(),sel=$("#spCam"),cur=stream?.getVideoTracks()[0]?.getSettings().deviceId||lsGet("mirai_cam_id","");
    sel.innerHTML=cams.map((c,i)=>`<option value="${esc(c.deviceId)}"${c.deviceId===cur?" selected":""}>${esc(c.label||"カメラ "+(i+1))}</option>`).join("")||"<option>カメラが見つかりません</option>";
    $("#spCamSt").textContent=`使用中：${camLabel()}　／　見つかったカメラ：${cams.length}台`;
  }
  async function open(){
    el.hidden=false;keysUI();fillVoice();fillIll?.();
    try{await getCam();$("#spV").srcObject=stream}catch(e){$("#spCamSt").textContent="カメラを起動できません："+(e?.name||e?.code||e)}
    fillCams();
  }
  function close(){el.hidden=true;learning=false;$("#spV").srcObject=null}
  document.addEventListener("keydown",e=>{
    if(e.ctrlKey&&e.shiftKey&&e.code==="KeyS"){e.preventDefault();staffOpen()?close():open();return}
    if(!staffOpen())return;
    $("#spKeySt").textContent="最後に押されたキー："+e.code;
    if(learning&&!["ShiftLeft","ShiftRight","ControlLeft","ControlRight","AltLeft","AltRight","MetaLeft","MetaRight"].includes(e.code)){
      e.preventDefault();learning=false;lsSet("mirai_push_codes",JSON.stringify([e.code]));keysUI();$("#spLearn").textContent="ボタンを登録（押して覚えさせる）";
    }
  },true);
  $("#spX").onclick=close;
  $("#spCamUse").onclick=async()=>{const id=$("#spCam").value;lsSet("mirai_cam_id",id);releaseCam();try{await getCam();$("#spV").srcObject=stream}catch(e){$("#spCamSt").textContent="切り替えに失敗："+(e?.name||e)}fillCams()};
  $("#spLearn").onclick=()=>{learning=true;$("#spLearn").textContent="物理ボタンを押してください…"};
  $("#spKeyReset").onclick=()=>{try{localStorage.removeItem("mirai_push_codes")}catch{};keysUI()};
  async function fillVoice(){
    const st=await VOICE.status();
    $("#spVvSt").textContent=st.ok?`接続OK（${st.base}）　今の声：${st.spkName||"ID "+st.spk}`:`VOICEVOXに接続できません（${st.base}）。ブラウザ内蔵の声で代用中`;
    if(st.ok){try{const list=await VOICE.speakers(),opts=sel=>list.map(x=>`<option value="${x.id}"${x.id===sel?" selected":""}>${esc(x.name)}</option>`).join("");
      $("#spVvSpk").innerHTML=opts(st.spk);FUTURES.forEach((_,i)=>$("#spVvS"+i).innerHTML=opts(VOICE.storySpk(i)))}catch{}}
    else{$("#spVvSpk").innerHTML="<option>（未接続）</option>";FUTURES.forEach((_,i)=>$("#spVvS"+i).innerHTML="<option>（未接続）</option>")}
  }
  $("#spVvSpk").onchange=e=>{VOICE.setSpeaker(e.target.value);setTimeout(fillVoice,600)};
  $("#spVvTest").onclick=()=>{SND.unlock();VOICE.say(INTRO[0])};
  FUTURES.forEach((st,i)=>{
    $("#spVvS"+i).onchange=e=>VOICE.setStorySpeaker(i,e.target.value);
    $(`[data-vt="${i}"]`).onclick=()=>{SND.unlock();VOICE.say(sentences(st.letter[0])[0],{story:i})};
  });
  $("#spVvVol").value=String(VOICE.vol());$("#spVvVol").oninput=e=>VOICE.setVol(Number(e.target.value));
  $("#spVol").value=String(SND.vol());$("#spVol").oninput=e=>SND.setVol(Number(e.target.value));
  $("#spSnd").onclick=()=>{SND.unlock();SND.win(true);$("#spSndSt").textContent="音が鳴らない場合：右上の表示が「音あり」か、PCの出力先スピーカーと音量を確認してください。"};
  $("#spReset").onclick=()=>{close();document.body.classList.remove("desat");pageTitle()};
  $("#spReload").onclick=()=>location.reload();
  $("#spGal").onclick=()=>{close();GAL.show()};
  // 想像図のAI
  $("#spGm").innerHTML=ILL.MODELS.map(([v,n])=>`<option value="${v}">${esc(n)}</option>`).join("");
  $("#spIll").value=ILL.engine();$("#spGm").value=ILL.model();
  const illUI=()=>{$("#spGm").disabled=$("#spGmTest").disabled=ILL.engine()!=="gemini"};illUI();
  $("#spIll").onchange=e=>{ILL.set("engine",e.target.value);illUI();fillIll()};
  $("#spGm").onchange=e=>ILL.set("model",e.target.value);
  async function fillIll(){
    const st=$("#spIllSt");if(!window.GAS_URL){st.textContent="config.js の GAS_URL が未設定です";return}
    try{const d=await(await fetch(window.GAS_URL+"?config=1",{signal:AbortSignal.timeout(10000)})).json();
      const k=x=>x?"設定済み":"未設定";
      st.textContent=`APIキー：Claude ${k(d.claude)}／Gemini ${k(d.gemini)}`+(ILL.engine()==="gemini"&&!d.gemini?"。GeminiのキーをGASのスクリプト プロパティ「GEMINI_API_KEY」に追加してください（未設定のあいだは、結果画面に世界の線画を出します）":"");
    }catch{st.textContent="GASに接続できません（キーの確認ができません）"}
  }
  $("#spGmTest").onclick=async()=>{
    const st=$("#spIllSt"),im=$("#spGmImg");st.textContent="Geminiで描いています…（10〜30秒）";im.hidden=true;
    try{const r=await fetch(window.GAS_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({mode:"gemini_test",model:ILL.model()}),signal:AbortSignal.timeout(90000)});
      const d=await r.json();if(!d.ok)throw new Error(d.detail||d.error);
      im.src=d.image;im.hidden=false;st.textContent=`OK（${d.model}）`;
    }catch(e){st.textContent="失敗："+String(e.message||e).slice(0,200)}
  };
  $("#spRes").value=String(IDLE.photoSec());$("#spRes").onchange=e=>IDLE.setPhotoSec(Number(e.target.value));
  $("#spFx").onclick=()=>{lsSet("mirai_fx",FXMODE?"0":"1");if(!FXMODE)lsSet("mirai_exhibit","1");location.href=location.pathname};
  $("#spFxM").value=String(FXB.margin());
  $("#spFxM").onchange=e=>FXB.setMargin(Number(e.target.value));
  $("#spFxTest").onclick=()=>{close();const seq=["comm","scan","warp","suspense","saved","partial","lost","idle"];seq.forEach((m,i)=>setTimeout(()=>FXB.set(m),i*5000))};
})();
