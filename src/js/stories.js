/* 2045年の3つの未来（世界観設定書v4の衣・食・住）。gas/Code.gs の FUTURES と同じ順番
   差出人は案内役のミナトとは別の人。letter：手紙の本文（2つの文字列を続けて便せん1枚に出す。文ごとに声と表示を合わせる）
   hand：手紙の書体（thin＝ダーツフォント、soft＝ふい字、bold＝ひとりゴシック）　art：WORLD_ART の番号
   rql：お願いの改行位置　hint：物を選ぶときのヒント */
const FUTURES=[
  {key:"食べる",title:"スコアで食べる未来",line:"食べものの価値が、おいしさより「健康スコア」で決まる。",
   name:"ミノリ",age:32,job:"物流センター勤務",city:"東京",hand:"soft",art:0,
   letter:["はじめまして。2045年の東京で、物流センターに勤めています。朝は標準食のパウチを1本。今日の健康スコアは84で、来月の保険料が少し下がりそうです。",
           "祖母は昔、体によくない物を「ご褒美」に食べていたそうです。わざと数値を悪くするのが、なぜご褒美になるんでしょう。"],
   request:"あなたの時代の「食べもの」を、ひとつ送ってくれませんか。",rql:["あなたの時代の「食べもの」を、","ひとつ送ってくれませんか。"],
   hint:"おかし、食品、台所の道具など。あなたが「楽しい」と思う物を。"},
  {key:"着る",title:"服を捨てられない未来",line:"服は買うより、受け継ぐもの。持てる枚数にも上限がある。",
   name:"ツムギ",age:27,job:"リペア工房勤務",city:"大阪",hand:"thin",art:1,
   letter:["こんにちは。2045年の大阪で、服の修理をしています。わたしの衣類枠は28着。いま着ているコートは、わたしで5人目の持ち主です。",
           "祖父の時代は、一度も着ない服がクローゼットにたくさんあったそうですね。着ないのに持っておくのは、どんな気持ちでしたか。"],
   request:"あなたの時代の「身につけるもの」を、ひとつ送ってください。",rql:["あなたの時代の「身につけるもの」を、","ひとつ送ってください。"],
   hint:"服、くつ下、アクセサリー、手入れの道具など。まだ誰の物でもない感じが伝わる物を。"},
  {key:"住む",title:"体験がぜいたく品になった未来",line:"海や山へ出かけるのは、一生に一度のぜいたく。",
   name:"ソラ",age:19,job:"オンライン大学の学生",city:"名古屋",hand:"bold",art:2,
   letter:["はじめまして。2045年の名古屋で、オンライン大学に通っています。部屋は6畳ですが、壁の3面がスクリーン。今朝は氷河を見ながら朝ごはんを食べました。",
           "外に出るのは、週に1回、近所の公園まで。あなたの時代は、ふつうの家族が電車で海へ行っていたって、本当ですか。"],
   request:"あなたの時代の「部屋の外で使うもの」を、ひとつ送ってください。",rql:["あなたの時代の「部屋の外で使うもの」を、","ひとつ送ってください。"],
   hint:"外で使う物、遊ぶ物、季節の物など。画面の外の感じが伝わる物を。"}
];
const YEAR=2045;
let future=FUTURES[0],futureIdx=0;
function setFuture(i){futureIdx=Math.max(0,Math.min(FUTURES.length-1,i));future=FUTURES[futureIdx]}
/* 便せん1枚を文に分ける（文ごとに声と表示を合わせる） */
const sentences=t=>String(t).match(/[^。？！]+[。？！]?/g)||[String(t)];

/* 結果ごとの人数（スプレッドシートで全員分を集計） */
let tally={saved:0,partial:0,lost:0},tallyListeners=[];
function setTally(t){tally=t;tallyListeners.forEach(f=>f(t))}
async function loadTally(){
  if(!window.GAS_URL)return;
  try{const r=await fetch(window.GAS_URL+"?stats=mission");const d=await r.json();if(d.ok&&d.stats)setTally(d.stats)}catch{}
}
const tallyTotal=t=>(Number(t.saved)||0)+(Number(t.partial)||0)+(Number(t.lost)||0);
