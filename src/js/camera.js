/* カメラ：外部USBカメラを優先して使う（展示モードでは開いたままにする） */
function releaseCam(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}}
// 展示モードではカメラを開いたままにする（毎回の起動待ちと許可確認をなくす）
function stopCam(){if(!EXHIBIT)releaseCam()}

async function listCams(){try{return (await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==="videoinput")}catch{return[]}}
const BUILTIN=/integrated|built-?in|facetime|内蔵|front|back camera/i;
async function getCam(){
  if(stream&&stream.getVideoTracks().some(t=>t.readyState==="live"))return stream;
  if(!navigator.mediaDevices?.getUserMedia)throw {code:"no_api"};
  let id=lsGet("mirai_cam_id","");
  if(!id){const ext=(await listCams()).find(c=>c.label&&!BUILTIN.test(c.label));if(ext)id=ext.deviceId}
  const base={width:{ideal:1920},height:{ideal:1080}};
  try{stream=await navigator.mediaDevices.getUserMedia({video:id?{...base,deviceId:{exact:id}}:{...base,facingMode:"environment"},audio:false})}
  catch(e){
    if(!id)throw e;
    // 登録したカメラが見つからないときは、使えるカメラで開く
    stream=await navigator.mediaDevices.getUserMedia({video:base,audio:false});
  }
  // 初回の許可後はカメラ名が取れるので、外部カメラがあれば切り替える
  if(!lsGet("mirai_cam_id","")){
    const cur=stream.getVideoTracks()[0]?.getSettings().deviceId;
    const ext=(await listCams()).find(c=>c.label&&!BUILTIN.test(c.label));
    if(ext&&cur&&ext.deviceId!==cur){releaseCam();return getCam2(ext.deviceId)}
  }
  stream.getVideoTracks().forEach(t=>t.onended=()=>{stream=null});
  return stream;
}
async function getCam2(id){stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1920},height:{ideal:1080},deviceId:{exact:id}},audio:false});return stream}
function camLabel(){return stream?.getVideoTracks()[0]?.label||"未接続"}
