/* 2126年で少し困っている依頼主。gas/Code.gs の MISSION_STORIES と同じ順番
   art：WORLD_ART の番号　hand：手紙の書体（thin＝ダーツフォント、soft＝ふい字、bold＝ひとりゴシック）
   split：1枚目の便せんに入れる文の数　ql：お願いの改行位置
   minatoのセリフは、手紙を開ける前（arrive）は封筒でわかることだけ、読んだあと（react）は手紙に書いていない視点を足す皮肉にする */
const STORIES=[
  {name:"透",who:"41歳・新規事業部の課長",hand:"thin",art:0,split:2,
   q:"チームの人と仲良くなる、きっかけになる物がほしい。",ql:["チームの人と仲良くなる、","きっかけになる物がほしい。"],
   letter:"うちの会社では、AI秘書がみんなの予定を組んでくれます。会議が終わった0秒後に、次の会議。雑談の時間は『ムダ』として消されました。チームの5人とは毎日同じ会議室にいるのに、誰の好きな食べ物も知りません。",
   sit:"会議が0分おきに続き、チームの5人のことを何も知らない。",
   arrive:"お、手紙が届いた。差出人は透さん、41歳。新規事業部の課長だって。開けてみよう。",
   react:"新しいことを考えるチームなのに、雑談ゼロ。そりゃAIの案しか出てこないよね。"},
  {name:"美月",who:"26歳・会社員",hand:"soft",art:1,split:3,
   q:"AIのおすすめじゃない物を渡したい。あなたなら、何を贈りますか？",ql:["AIのおすすめじゃない物を渡したい。","あなたなら、何を贈りますか？"],
   letter:"来週は、親友の誕生日です。プレゼントは3年連続で、AIがすすめる同じハンドクリーム。親友は毎回『ぴったり！』と喜んでくれます。でも私は、自分で選んだ物を一度も渡したことがありません。外すのが、こわくて。",
   sit:"親友への誕生日プレゼントを、3年連続でAIに選ばせている。",
   arrive:"お、手紙が届いた。差出人は美月さん、26歳の会社員。開けてみよう。",
   react:"3年連続で同じハンドクリーム。親友、もう箱を開ける前に中身わかってるよ。"},
  {name:"ひなた",who:"9歳・小学3年生",hand:"bold",art:2,split:2,
   q:"電気がなくても、家族みんなで遊べる物がほしい。",ql:["電気がなくても、","家族みんなで遊べる物がほしい。"],
   letter:"あしたの夜、街のAIがぜんぶ止まる『アップデートの1時間』があります。ゲームも、しゃべるロボットも、電気も止まります。去年は家族4人で、だまって座っていただけでした。お父さんは、ずっと時計を見ていました。",
   sit:"AIが止まる1時間、去年は家族4人でだまって座っていた。",
   arrive:"お、手紙が届いた。差出人は、ひなたちゃん。9歳だって。開けてみよう。",
   react:"AIが止まったら、家族4人で無言。AIって、家族の会話の係までやってたの？"}
];
let story=STORIES[0],storyIdx=0,lastStory=-1;
function pickStory(){let i;do{i=Math.floor(Math.random()*STORIES.length)}while(i===lastStory&&STORIES.length>1);lastStory=i;storyIdx=i;story=STORIES[i]}
/* 手紙を2枚の便せんに分ける */
function letterPages(st){const s=st.letter.match(/[^。]+。?/g)||[st.letter],k=st.split||Math.ceil(s.length/2);return[s.slice(0,k),s.slice(k)].filter(p=>p.length)}

/* 結果ごとの人数（スプレッドシートで全員分を集計） */
let tally={saved:0,partial:0,lost:0},tallyListeners=[];
function setTally(t){tally=t;tallyListeners.forEach(f=>f(t))}
async function loadTally(){
  if(!window.GAS_URL)return;
  try{const r=await fetch(window.GAS_URL+"?stats=mission");const d=await r.json();if(d.ok&&d.stats)setTally(d.stats)}catch{}
}
const tallyTotal=t=>(Number(t.saved)||0)+(Number(t.partial)||0)+(Number(t.lost)||0);
