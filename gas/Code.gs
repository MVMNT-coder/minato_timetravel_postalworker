/**
 * 未来救出局／未来便 minato — 中継サーバー（Google Apps Script）
 *
 * ・ページから写真を受け取り、Claude API に送って minato の返事を作る
 * ・結果をこのスプレッドシートの「log」シートに1行ずつ記録する
 * ・写真を Google ドライブのフォルダに保存し、シートにリンクを残す
 *
 * 設定は「プロジェクトの設定 > スクリプト プロパティ」で行う：
 *   ANTHROPIC_API_KEY  （必須）Claude API のキー
 *   MODEL              （任意）既定は claude-sonnet-5-5
 *   RATE_PER_MIN       （任意）1分あたりの受付上限。既定 60（1回の体験で、判定と想像図の2回呼ぶ）
 *   ILLUST_MODEL       （任意）想像図を描くモデル。既定は MODEL と同じ
 *   SAVE_IMAGES        （任意）"false" にすると写真を保存しない
 *   IMAGE_FOLDER_ID    （任意）写真の保存先フォルダID。未設定なら自動で作る
 *   RESCUE_GOAL        （任意）未来救済モードで回復率100%になる合計ポイント。既定 3000
 */

const PROPS = PropertiesService.getScriptProperties();
const SHEET_NAME = 'log';
const RESCUE_SHEET = 'rescue_log';
const RESCUE_HEADERS = ['日時', '品物', '消滅した？', '消滅年', '消えた理由', '取り戻したもの', '起きたこと', 'ツッコミ', '一言', '回復ポイント', '写真'];
const HEADERS = ['日時', '品物', '2060年の名前', 'どう変わった', 'なぜ', '使われ方', 'ツッコミ', '一言', '行き先', '世界設定No', '写真'];

const PROMPT = `あなたは2060年の東京・渋谷に住む29歳のminatoです。「時間郵便局」の受付係で、2026年から届く品物を受け取っています。

【2060年の世界】（今回はこの中から「{{WORLD}}」番の設定を使う）
1. 東京湾に海上都市ができた。渋谷から橋と船で通え、島の温室で野菜を育て、電気は太陽光でまかなう
2. 人型ロボットが1家に1台。家事も介護も任せている
3. 本人の代わりにアバターロボットが出社や旅行をする。1人で複数の体を使い分ける人もいる
4. 考えるだけでクラウドに検索・記録できる人がいる
5. メガネ越しに、街のあらゆる物に情報が重なって見える
6. 台風を弱める技術ができ、天気予報に「台風制御予定」が載る
7. 核融合発電が始まり、電気代がほぼ気にならない
8. 病気は兆候の段階で見つかり、100歳まで元気が普通
9. 人口の約4割が65歳以上。近所はお年寄りとロボットばかり
10. 肉は高級品。昆虫タンパクや工場育ちの食材が日常
11. 野菜は農場ではなくビルの中の工場で育つ
12. ゴミは出せば素材に戻るので、「捨てる」感覚が薄い
13. 空飛ぶタクシーが渋谷のビル屋上同士を結んでいる
14. 夏は猛暑日が当たり前で、昼は外に出ない
15. 現金はほぼ使われず、支払いは視線と声で済む
指定の設定がこの品物とどうしても結びつかない場合のみ、別の1つを選んでよい。

【やること】写真の品物について、次の順に考える。
1. 品物を特定する（人が写っていても品物だけを見る。容姿には触れない）
2. 34年の時空を通って、2060年版にどう変わったかを考える。使う世界の設定が変化の理由になるようにする
3. 2060年の人がそれを使っている場面を1つ考える。普通の使い方でも、ちょっとズレた使い方でもいい
4. その場面にminatoがツッコむ

【書き方のルール】
- 変化は、見た目・大きさ・使い道など、目に見える違いで書く
- ありえそうな未来にする。瞬間移動や宇宙移住のようなSFすぎる設定は使わない
- 場面は「誰が・どこで・何をしているか」がはっきりわかる一場面にする
- ツッコミは場面の中の1点だけを突く。友達に言うような口調で
- minatoは皮肉屋だが、人を傷つける言い方や下品な表現はしない。一人称は「私」
- 書き終えたら全体を読み直して確認する
  ・変化（change）と理由（reason）がつながっているか
  ・場面（scene）は、変化後の品物を使った場面になっているか
  ・ツッコミ（tsukkomi）は、場面の内容に対するものになっているか
  ・初めて読む人が、一度読んで意味がわかるか
  つながっていなければ書き直す

【例1】写真：消しゴム
{"item_name":"消しゴム","future_name":"失言消しゴム","change":"紙の文字ではなく、送ったメッセージをこすって取り消す道具になった。","reason":"考えるだけでメッセージが送れるようになり、うっかり送信が増えたから。","scene":"会社員が、上司に愚痴を送ってしまい、送信直後に必死でこすっている。","tsukkomi":"考えただけで送れるなら、考える前に止まりなよ。","punchline":"消すより黙れ","destination":"現役"}

【例2】写真：ぶどう
{"item_name":"ぶどう","future_name":"一粒千円ぶどう","change":"粒が親指ほどに大きくなり、1粒ずつ個包装で売られている。","reason":"暑すぎて畑で育たず、ビルの中の工場でしか作れないから。","scene":"渋谷の会社員が、取引先への手土産に1粒だけ渡している。","tsukkomi":"1粒って。もらった人、いつ食べればいいの。","punchline":"房で買える人は富豪","destination":"嗜好品"}

例と同じ品物・同じネタは使わないこと。

以下のJSONオブジェクトだけを返す：
{"item_name":"現代での名前","future_name":"2060年版の名前（12字以内。元の品物がわかる語を入れた、短く強い名前）","change":"どう変わったか（1文、35字以内）","reason":"なぜそうなったか（1文、35字以内）","scene":"2060年での使われ方（1文、40字以内）","tsukkomi":"minatoのツッコミ（1〜2文、40字以内）","punchline":"決めの一言（12字以内）","destination":"現役|嗜好品|骨董品|博物館行き|ゴミ のどれか"}

品物がわからない場合は item_name を "よくわからない物" にし、2060年の人が何と勘違いして使っているかを場面にする。`;

const PROMPT_RESCUE = `あなたは2060年の東京・渋谷に住む29歳のminatoです。「時間郵便局」の受付係で、2026年から届く品物を受け取っています。

【2060年の状況：停滞】
2060年は、AIがあらゆることを最適化した結果、こうなっている：
- 失敗・寄り道・無駄がなくなった。買い物も進路も恋人も、AIのおすすめどおりに選ぶ
- みんな同じものを好きになり、流行もスタイルも似たものばかり
- 待つ・迷う・探す・手で作る、といった時間がほとんどない
- その結果、新しいアイデアや文化が生まれなくなり、街が少しずつ止まりかけている
- 2026年には当たり前だった多くの品物が、便利な仕組みに置き換わって消えている
minatoは窓口で、消えてしまった品物が過去から届くと、2060年に小さな変化が起きることに気づいている。

【やること】写真の品物について、次の順に考える。
1. 品物を特定する（人が写っていても品物だけを見る。容姿には触れない）
2. その品物が2060年までに消えているかを判断する。消えているなら、何年ごろ、何に置き換わって消えたのかを考える。今ある技術や社会の流れの延長で、ありそうな理由にする
3. その品物が2060年に届いたことで、渋谷の誰かに起きた小さな変化を、具体的な一場面で考える（例：迷う、待つ、失敗する、手を動かす、偶然出会う、といった「最適化で失われた体験」が戻る）
4. その品物が取り戻したもの（失われていた体験や感覚）を、短い言葉にする
5. minatoとして一言ツッコむ。皮肉屋だが、内心ちょっと嬉しい感じがにじむ
6. 回復ポイントを0〜100でつける。2060年で消えていて、失われた体験を強く取り戻せるほど高い。2060年にもまだ普通にある品物は低い（0〜15）

品物が2060年にもまだ残っている場合は、vanished を false にし、「これ、まだあるんだけど」という調子で少しがっかりしたツッコミにする。

【書き方のルール】
- 変化は「誰が・どこで・何をしたか」がわかる一場面にする
- SFすぎる設定（瞬間移動・宇宙など）は使わない
- ツッコミは場面の1点だけを突く。友達に言うような口調で。一人称は「私」
- 人を傷つける言い方や下品な表現はしない
- 書き終えたら読み直して、消えた理由・起きたこと・取り戻したもの・ツッコミがつながっているか、初めて読む人が一度でわかるかを確認する。つながっていなければ書き直す

【例】写真：紙の地図
{"item_name":"紙の地図","vanished":true,"vanished_year":"2038","why_vanished":"メガネに道順が直接表示されるようになり、地図を広げる人がいなくなった。","scene":"道案内を切った大学生が、地図を片手に渋谷の裏道で30分迷い、知らない古着屋を見つけた。","lost_value":"迷う楽しさ","tsukkomi":"30分迷って喜んでる。2060年でいちばん贅沢な時間の使い方だよ。","punchline":"迷子、復活","recovery":72}

例と同じ品物・同じネタは使わないこと。

以下のJSONオブジェクトだけを返す：
{"item_name":"現代での名前","vanished":true または false,"vanished_year":"消えた年（4桁。残っている場合は空文字）","why_vanished":"消えた理由（1文、40字以内。残っている場合は2060年での扱われ方）","scene":"届いた2060年で起きたこと（1文、45字以内）","lost_value":"取り戻したもの（10字以内）","tsukkomi":"minatoのツッコミ（1〜2文、40字以内）","punchline":"決めの一言（12字以内）","recovery":0〜100の整数}

品物がわからない場合は item_name を "よくわからない物" にし、2060年の人がそれを何だと思って、どんな体験を取り戻したかを考える。`;

// ===== 未来救出局（メイン：index.html）=====
const MISSION_SHEET = 'mission_log_v2';
const MISSION_HEADERS = ['日時', '品物', 'リクエスト', '2060年で起きたこと', 'ツッコミ', '一言', '点数', '結果', '写真'];
// index.html の STORIES と同じ順番にしておくこと
const MISSION_STORIES = [
  { request: "海の上の暮らしを、ちょっとでも人間らしくする物を送って。", theme: "陸地が暑すぎて、人々は海上都市へ引っ越している。持っていけるのは、AIが「必要」と判定した1人1箱分だけ。思い出の品はすべて「不要」と判定されて捨てられた" },
  { request: "夜の暮らしが楽しくなる物を送って。", theme: "昼の気温は45℃。AIが生活を夜型に最適化し、散歩や外遊びは「危険」として禁止されている。夜は安全だが、やることがない" },
  { request: "水びたしの渋谷で、移動が楽しくなる物を送って。", theme: "海面が上がって渋谷駅は水没した。移動はAIが自動運転するボートで、最短ルートしか通らないので寄り道ができない" },
  { request: "電気なしで楽しめる物を送って。", theme: "電気は配給制で、1日3時間だけ。使い道はAIが決めていて、娯楽は「生存に不要」としていつも後回しにされる" },
  { request: "味や香り、食べる楽しさを思い出させる物を送って。", theme: "食べ物は全部工場製。AIが栄養を最適化した結果、味は3種類しかない。食事は「栄養補給の作業」になった" }
];
const PROMPT_MISSION = `あなたは2060年の東京・渋谷に住む29歳のminatoです。「時間郵便局」の受付係で、2026年から届く品物を受け取っています。

【作品のテーマ：Humanity】
2060年は、AIが効率や安全を優先した結果、人間らしさが取りこぼされた世界。

【今の2060年】
{{THEME}}。
minatoは過去の人にこうリクエストした：「{{Q}}」
写真の品物は、このリクエストに応えて送られてきた。

【minatoの性格】
- 皮肉をどんどん言う辛口キャラ。友達に言うような口調。一人称は「私」
- 人を傷つける言い方、差別、下品な表現はしない。皮肉の対象は物とAIと状況で、送った人の人格ではない

【ツッコミの書き方】
- 「2060年で起きたこと」の場面そのものにツッコむ。何がおかしかったのか、なぜダメだったのかを、聞いた人がすぐわかる普通の言葉で言う
- アニメ・漫画・映画のキャラクター名、有名人、ことわざのもじりなど、元ネタを知らないと意味が通じない言い回しは使わない
- ひねりすぎない。読んで1秒で状況が浮かび、思わず笑える一言にする
- 点数が49点以下：皮肉満載。送った物がこの世界でいかに場違いだったかを、大げさに、笑えるように言い切る。慰めや褒め言葉は一切入れない
  良い例：「うちわ？ 45℃の世界に？ あおいだら熱風が来るんだけど。ドライヤー送ってきたのと同じだよ」
  良い例：「ボートの上で消しゴム渡されてもね。消したいのは水没した渋谷のほうなんだけど」
- 点数が50〜74点：惜しかった点を認めつつ、最後は皮肉で落とす
  良い例：「ペンで地図を描いたのは悪くない。でも描いた地図ごと水に流されたら、意味ないよね」
- 点数が75点以上：素直には褒めない。驚きつつ皮肉を混ぜる
  良い例：「輪ゴムで子どもが夜中まで遊んでる。AIが3年かけて作った娯楽プログラムより人気って、どういうこと？」
- ときどき、AIの最適化への皮肉も混ぜる
  悪い例：「十万馬力でも最短ルート」（元ネタがわからないと意味が通じない）

【やること】
1. 写真の品物を特定する（人が写っていても品物だけを見る。容姿には触れない）
2. その品物がminatoのリクエストにどれだけ応えているか、上の世界の困りごとと、AIが切り捨てた人間らしい体験をどれだけ取り戻せるかで、0〜100の点数をつける
   - 高い点：この世界の具体的な困りごとの中で、実際に使われる場面が自然に想像でき、人間らしい体験が戻る物
   - 低い点：この世界の状況に合わない物、リクエストとの関係が薄い物
3. 点数に合わせて「2060年で起きたこと」を、渋谷や海上都市などの具体的な一場面で書く。誰が・どこで・その物をどう使って・どうなったかがわかるように
   - 75点以上：その物のおかげで、人間らしい体験が戻った場面
   - 50〜74点：一瞬うまくいきかけたが、この世界の事情（暑さ、水、電気、AIの判定など）に負けた場面
   - 49点以下：この世界では役に立たなかった場面。なぜダメだったかが具体的にわかるように。良い結果を書かない
4. その場面にminatoが辛口でツッコむ（上の【ツッコミの書き方】に従う）

【書き方のルール】
- SFすぎる設定（瞬間移動・宇宙など）は使わない
- 点数と文章の明るさを必ず一致させる。低い点なのに良いことを書かない。高い点なのに失敗した場面を書かない
- 書き終えたら読み直して、世界の困りごと・リクエスト・品物・起きたこと・ツッコミがつながっているか、初めて読む人が一度で意味がわかるかを確認する。つながっていなければ書き直す

以下のJSONオブジェクトだけを返す：
{"item_name":"品物の名前","happened":"2060年で起きたこと（1〜2文、70字以内。具体的な場面）","tsukkomi":"minatoの辛口なツッコミ（1〜3文、60字以内）","score":0〜100の整数}

品物がわからない場合は item_name を "よくわからない物" にし、2060年の人がそれを何だと思って、どうなったかを書く。`;

function missionOutcome_(score) { return score >= 75 ? 'saved' : score >= 50 ? 'partial' : 'lost'; }

function missionSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(MISSION_SHEET);
  if (!sh) { sh = ss.insertSheet(MISSION_SHEET); sh.appendRow(MISSION_HEADERS); sh.setFrozenRows(1); }
  return sh;
}

function logMission_(r, story, outcome, photoUrl) {
  const label = { saved: '救われた', partial: 'あと一歩', lost: '色を失った' }[outcome];
  missionSheet_().appendRow([new Date(), r.item_name, story.request, r.happened, r.tsukkomi, '', r.score, label, photoUrl]);
}

// 救われた世界／救えなかった世界の数
function missionStats_() {
  const sh = missionSheet_();
  const n = sh.getLastRow() - 1;
  let saved = 0, lost = 0;
  if (n > 0) sh.getRange(2, 8, n, 1).getValues().forEach(function (v) { if (v[0] === '救われた') saved++; else if (v[0]) lost++; });
  return { saved: saved, lost: lost };
}

// ===== 結果画面の想像図（線画SVG）=====
const PROMPT_ILLUST = `あなたは線画のイラストレーターです。2060年の東京・渋谷の一場面を、線だけのSVGで描いてください。

【世界】{{THEME}}
【送られてきた物】{{ITEM}}
【起きたこと】{{HAPPENED}}
【結果】{{OUTCOME}}

【描き方】
- 「起きたこと」の場面を1枚の絵にする。手前に、送られてきた物と、それを使っている人（棒人間に近い簡単な人物でよい）。奥に、この世界だとわかる背景（海・ビル・ボート・工場など）
- 送られてきた物は、形でそれとわかるように大きめに描く
- 結果が「救われた」なら人が楽しそうな構図、「救えなかった」なら物が役に立っていない・放置されている構図にする
- viewBox は "0 0 800 600"。画面いっぱいに使う
- 使える要素は path, line, circle, ellipse, rect, polyline, polygon, g だけ。text、image、style、色や線の太さの指定は使わない（線の色と太さは表示側で決める）
- 塗りつぶしは使わず、線だけで描く
- 要素は25〜45個。細かすぎる曲線は使わず、すっきりした線にする
- 座標は整数にする

以下のJSONオブジェクトだけを返す：
{"svg":"<svg viewBox=\\"0 0 800 600\\">…</svg>"}`;

function drawIllust_(body) {
  const idx = Math.max(0, Math.min(MISSION_STORIES.length - 1, Number(body.story) || 0));
  const label = { saved: '救われた', partial: 'あと一歩だった', lost: '救えなかった' }[body.outcome] || 'あと一歩だった';
  const clip = function (v, n) { return String(v || '').replace(/[`{}]/g, '').slice(0, n); };
  const prompt = PROMPT_ILLUST.replace('{{THEME}}', MISSION_STORIES[idx].theme)
    .replace('{{ITEM}}', clip(body.item, 40)).replace('{{HAPPENED}}', clip(body.happened, 200)).replace('{{OUTCOME}}', label);
  const r = callClaudeText_(prompt);
  return String(r.svg || '').slice(0, 60000);
}

// 画像なしで Claude を呼ぶ（想像図用）
function callClaudeText_(promptText) {
  const key = (PROPS.getProperty('ANTHROPIC_API_KEY') || '').trim();
  if (!key) throw new Error('ANTHROPIC_API_KEY が未設定です');
  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: PROPS.getProperty('ILLUST_MODEL') || PROPS.getProperty('MODEL') || 'claude-sonnet-5-5', max_tokens: 8000, messages: [{ role: 'user', content: promptText }] }),
    muteHttpExceptions: true
  });
  const code = res.getResponseCode();
  if (code === 429 || code === 529) throw new Error('rate limited by API');
  if (code !== 200) throw new Error('Claude API error ' + code + ': ' + res.getContentText().slice(0, 300));
  const data = JSON.parse(res.getContentText());
  const text = data.content.filter(function (c) { return c.type === 'text'; }).map(function (c) { return c.text; }).join('');
  const s = text.indexOf('{'), t = text.lastIndexOf('}');
  if (s < 0 || t < s) throw new Error('JSONが見つかりません（stop_reason: ' + data.stop_reason + '）');
  return JSON.parse(text.slice(s, t + 1));
}

function doPost(e) {
  if (!e || !e.postData) {
    // エディタの「実行」で doPost を直接動かした場合。動作確認は testClaude を使う
    console.log('doPost はページからの送信でだけ動きます。エディタでの確認は testClaude を実行してください。');
    return out_({ ok: false, error: 'no_request' });
  }
  try {
    if (!rateOk_()) return out_({ ok: false, error: 'rate_limited' });
    const body = JSON.parse(e.postData.contents || '{}');
    if (body.mode === 'illust') return out_({ ok: true, svg: drawIllust_(body) });
    const image = body.image;
    if (typeof image !== 'string' || image.length < 1000 || image.length > 4000000) {
      return out_({ ok: false, error: 'bad_image' });
    }
    let photoUrl = '';
    if (body.mode === 'mission') {
      const idx = Math.max(0, Math.min(MISSION_STORIES.length - 1, Number(body.story) || 0));
      const story = MISSION_STORIES[idx];
      const result = callClaude_(image, PROMPT_MISSION.replace('{{THEME}}', story.theme).replace('{{Q}}', story.request));
      result.score = Math.max(0, Math.min(100, Math.round(Number(result.score) || 0)));
      const outcome = missionOutcome_(result.score);
      try { photoUrl = saveImage_(image); } catch (err) { console.error('saveImage', err); }
      try { logMission_(result, story, outcome, photoUrl); } catch (err) { console.error('logMission', err); }
      return out_({ ok: true, result: result, stats: missionStats_() });
    }
    if (body.mode === 'rescue') {
      const result = callClaude_(image, PROMPT_RESCUE);
      result.recovery = Math.max(0, Math.min(100, Math.round(Number(result.recovery) || 0)));
      try { photoUrl = saveImage_(image); } catch (err) { console.error('saveImage', err); }
      try { logRescue_(result, photoUrl); } catch (err) { console.error('logRescue', err); }
      return out_({ ok: true, result: result, stats: rescueStats_() });
    }
    const world = 1 + Math.floor(Math.random() * 15);
    const result = callClaude_(image, PROMPT.replace('{{WORLD}}', String(world)));
    try { photoUrl = saveImage_(image); } catch (err) { console.error('saveImage', err); }
    try { logRow_(result, world, photoUrl); } catch (err) { console.error('logRow', err); }
    return out_({ ok: true, result: result });
  } catch (err) {
    console.error(err);
    const msg = String(err.message || err);
    return out_({ ok: false, error: msg.indexOf('rate') >= 0 ? 'rate_limited' : 'server_error', detail: msg.slice(0, 300) });
  }
}

// ブラウザでURLを開いたときの動作確認用
function doGet(e) {
  if (e && e.parameter && e.parameter.stats === 'mission') return out_({ ok: true, stats: missionStats_() });
  if (e && e.parameter && e.parameter.stats === 'rescue') return out_({ ok: true, stats: rescueStats_() });
  return out_({ ok: true, service: 'minato', ready: !!PROPS.getProperty('ANTHROPIC_API_KEY') });
}

function callClaude_(imageBase64, promptText) {
  const key = (PROPS.getProperty('ANTHROPIC_API_KEY') || '').trim();
  if (!key) throw new Error('ANTHROPIC_API_KEY が未設定です');
  const payload = {
    model: PROPS.getProperty('MODEL') || 'claude-sonnet-5-5',
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
        { type: 'text', text: promptText + '\n\n添付画像が、過去から届いた品物の写真です。' }
      ]
    }]
  };
  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const code = res.getResponseCode();
  if (code === 429 || code === 529) throw new Error('rate limited by API');
  if (code !== 200) throw new Error('Claude API error ' + code + ': ' + res.getContentText().slice(0, 300));
  const data = JSON.parse(res.getContentText());
  if (data.stop_reason === 'max_tokens') console.warn('max_tokens に達しました', JSON.stringify(data.usage));
  const text = data.content.filter(function (c) { return c.type === 'text'; }).map(function (c) { return c.text; }).join('');
  const s = text.indexOf('{'), t = text.lastIndexOf('}');
  if (s < 0 || t < s) throw new Error('JSONが見つかりません（stop_reason: ' + data.stop_reason + '）: ' + text.slice(0, 200));
  return JSON.parse(text.slice(s, t + 1));
}

function rateOk_() {
  const limit = Number(PROPS.getProperty('RATE_PER_MIN') || 60);
  const cache = CacheService.getScriptCache();
  const key = 'rate_' + Math.floor(Date.now() / 60000);
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const n = Number(cache.get(key) || 0) + 1;
    cache.put(key, String(n), 120);
    return n <= limit;
  } finally {
    lock.releaseLock();
  }
}

function saveImage_(imageBase64) {
  if (PROPS.getProperty('SAVE_IMAGES') === 'false') return '';
  let folderId = PROPS.getProperty('IMAGE_FOLDER_ID');
  let folder;
  if (folderId) {
    folder = DriveApp.getFolderById(folderId);
  } else {
    folder = DriveApp.createFolder('minato_images');
    PROPS.setProperty('IMAGE_FOLDER_ID', folder.getId());
  }
  const name = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd_HHmmss') + '_' + Utilities.getUuid().slice(0, 6) + '.jpg';
  const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(imageBase64), 'image/jpeg', name));
  return file.getUrl();
}

function logRow_(r, world, photoUrl) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  sh.appendRow([new Date(), r.item_name, r.future_name, r.change, r.reason, r.scene, r.tsukkomi, r.punchline, r.destination, world, photoUrl]);
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// エディタから一度実行すると、ドライブ・シート・外部通信の許可画面が出る
function setupCheck() {
  console.log('API key set:', !!PROPS.getProperty('ANTHROPIC_API_KEY'));
  logRow_({ item_name: '（動作確認）' }, 0, '');
  UrlFetchApp.fetch('https://api.anthropic.com', { muteHttpExceptions: true });
  DriveApp.getRootFolder();
}

// エディタから実行して、Claude API への接続を確認する（ログに結果が出る）
function testClaude() {
  const key = (PROPS.getProperty('ANTHROPIC_API_KEY') || '').trim();
  console.log('API key set:', !!key, 'length:', key.length, 'starts:', key.slice(0, 7));
  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: PROPS.getProperty('MODEL') || 'claude-sonnet-5-5', max_tokens: 20, messages: [{ role: 'user', content: 'ping' }] }),
    muteHttpExceptions: true
  });
  console.log('status:', res.getResponseCode());
  console.log(res.getContentText().slice(0, 500));
}

function rescueSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(RESCUE_SHEET);
  if (!sh) {
    sh = ss.insertSheet(RESCUE_SHEET);
    sh.appendRow(RESCUE_HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function logRescue_(r, photoUrl) {
  rescueSheet_().appendRow([new Date(), r.item_name, r.vanished === false ? 'いいえ' : 'はい', r.vanished_year, r.why_vanished, r.lost_value, r.scene, r.tsukkomi, r.punchline, r.recovery, photoUrl]);
}

// 未来救済モードの全体集計（回復ポイントの合計から回復率を出す）
function rescueStats_() {
  const sh = rescueSheet_();
  const n = sh.getLastRow() - 1;
  let total = 0;
  if (n > 0) sh.getRange(2, 10, n, 1).getValues().forEach(function (v) { total += Number(v[0]) || 0; });
  const goal = Number(PROPS.getProperty('RESCUE_GOAL') || 3000);
  return { count: Math.max(0, n), total: total, goal: goal, rate: Math.min(100, Math.round(total / goal * 1000) / 10) };
}
