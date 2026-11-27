/**
 * 時空郵便局／未来便 minato — 中継サーバー（Google Apps Script）
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

const PROMPT = `あなたは2060年の東京・渋谷に住む29歳のminatoです。「時空郵便局」の受付係で、2026年から届く品物を受け取っています。

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

const PROMPT_RESCUE = `あなたは2060年の東京・渋谷に住む29歳のminatoです。「時空郵便局」の受付係で、2026年から届く品物を受け取っています。

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

// ===== 時空郵便局（メイン：index.html）=====
// 依頼主を3人に入れ替えたので、新しいシートに記録する（依頼主Noの意味が前と違うため）
const MISSION_SHEET = 'mission_log_v5';
// 列：1日時 2品物 3未来 4差出人 5返信 6ミナト 7点数 8結果 9理由 10あなたの当たり前 11写真 12ギャラリー用 13未来No 14想像図 15想像図（小） 16レポート 17判定メモ
const MISSION_HEADERS = ['日時', '品物', '未来', '差出人', '返信', 'ミナト', '点数', '結果', '理由', 'あなたの当たり前', '写真', 'ギャラリー用', '未来No', '想像図', '想像図（小）', 'レポート', '判定メモ'];
const COL = { item: 2, reply: 5, outcome: 8, gthumb: 12, future: 13, ill: 14, illThumb: 15, report: 16 };
const OUTCOME_LABEL = { saved: '変わった', partial: 'ちょっと変わった', lost: '変わらなかった' };
const LABEL_OUTCOME = { '変わった': 'saved', 'ちょっと変わった': 'partial', '変わらなかった': 'lost' };

// 2045年の3つの未来（世界観設定書v4の衣・食・住）。src/js/stories.js の FUTURES と同じ順番にしておくこと
// 差出人は案内役のミナトと別の人。手紙はv4を半分に削ったもの。「現在の兆し」はAIに書かせず、ここに出典ごと固定で持つ
const FUTURES = [
  {
    key: '食べる', title: 'スコアで食べる未来',
    sender: { name: 'ミノリ', age: 32, job: '物流センター勤務', city: '東京' },
    summary: '医療と保険の財政が苦しくなり、毎日の食事と活動が「健康スコア」として記録され、保険料やサービスの条件に反映される。完全栄養食が標準の主食になり、栄養バランスを崩す食品は「ギルティ食」として勧められない。食べものの価値は「おいしい」より「スコアに効く」で測られる。',
    keywords: ['最適化こそ美徳', '自己管理できる人が信頼される', 'カロリーより栄養の欠損を恐れる', '外食や規定外の食品には申告が要る'],
    profile: [
      '東京の集合住宅で、20歳の妹と2人暮らし',
      '物流センターで在庫管理をしている。数字を合わせるのが得意',
      '朝は標準食のパウチを1本。昼は社食で、名前をかざすと足りない栄養を補うプレートが自動で出てくる',
      '今日の健康スコアは84。スコアが上がると来月の保険料が少し下がる',
      '祖母から、昔は体によくない物を「ご褒美」に食べていたと聞いて、ずっと不思議に思っている',
      '口ぐせ：「数値的には」'
    ],
    letter: 'はじめまして。2045年の東京で、物流センターに勤めています。朝は標準食のパウチを1本。今日の健康スコアは84で、来月の保険料が少し下がりそうです。祖母は昔、体によくない物を「ご褒美」に食べていたそうです。わざと数値を悪くするのが、なぜご褒美になるんでしょう。',
    request: 'あなたの時代の「食べもの」を、ひとつ送ってくれませんか。',
    wish: '数値では測れない「ご褒美」や「楽しみ」を知りたい',
    scene: '社食の自動配膳プレート、標準食のパウチ、腕や壁に出る健康スコアの表示、宅配ゲートの成分スキャン',
    signals: [
      { text: '健康診断の結果や歩数を点数化し、保険料に反映する健康増進型保険（住友生命「Vitality」）は、2025年に累計契約200万件を超えた。', source: 'スマートウォッチライフ「Vitality」解説', url: 'https://www.smartwatchlife.jp/34049/' },
      { text: '完全栄養食やパーソナライズフードは、若年・中年層のセルフケア食として市場の伸びが予測されている（矢野経済研究所、2025年）。', source: '矢野経済研究所 ニュートリション市場調査', url: 'https://www.yano.co.jp/press-release/show/press_id/3822' }
    ],
    examples: [
      { item: 'ブタメン（駄菓子のカップめん）', ask: 28, gap: 37, move: 27,
        reply: ['届きました。成分スキャンで塩分オーバーと判定されて、逸脱申告を出してやっと受け取れました。お湯を注いで3分。待つあいだ、なぜか妹を呼んでいました。', 'スコアは3ポイント下がったのに、なんだか満足しています。ふたの裏の「あたり」って、何が当たるんですか？'],
        minato: 'スコアは下がって、満足は上がる。計算が合わないね。', reason: 'スコアが下がったのに、ミノリは満足したと書いた。', gap_line: '体によくないと知りながら、楽しさで選ぶこと。' },
      { item: 'ふりかけ', ask: 22, gap: 28, move: 12,
        reply: ['届きました。袋のキャラクターが気になって、社食のプレートに少しだけかけてみました。栄養表示はほぼゼロ。なのに、ちゃんと味がします。', '同僚に「それ、何の栄養？」と聞かれて、答えられませんでした。おいしくするためだけの物って、本当にあるんですね。'],
        minato: '栄養ゼロで、味だけある。2045年でいちばん説明しにくいやつ。', reason: '味には驚いたが、同僚に説明できず、そこで止まった。', gap_line: 'ご飯を、おいしくするためだけに何かを足すこと。' },
      { item: 'ビタミンの錠剤', ask: 10, gap: 6, move: 5,
        reply: ['届きました。ビタミンの錠剤ですね。スキャンしてみたら、わたしの標準食とほとんど同じ成分でした。', 'ありがとうございます。あなたの時代の人も、数字を気にしていたんですね。でも、いつもの朝と何も変わりませんでした。'],
        minato: '未来に、未来っぽい物を送ってどうする。', reason: 'ミノリの毎日とほとんど同じで、何も起きなかった。', gap_line: '健康のために、栄養を錠剤でとること。' }
    ]
  },
  {
    key: '着る', title: '服を捨てられない未来',
    sender: { name: 'ツムギ', age: 27, job: 'リペア工房勤務', city: '大阪' },
    summary: '売れ残りや衣類の廃棄が厳しく規制され、やがて服の製造量や所有量にも上限ができた。一人が持てる服の枚数は「衣類枠」としてデジタルで管理され、新しい服を手に入れるには古い服を返却する。服は「買うもの」から「割り当てられ、受け継ぐもの」になった。服のタグには、素材・修理・持ち主の履歴が記録されている。',
    keywords: ['新品は少し後ろめたい', '服の履歴が信用になる', '捨てる人は環境への加害者', '直し方がわかる物しか着ない'],
    profile: [
      '大阪の街のリペア工房で、服の修理をしている',
      '衣類枠は28着。そのうち新品は1着だけで、あとは誰かから受け継いだ服',
      '今着ているコートは、ツムギで5人目の持ち主。袖口の繕いは3人目の人がしたもの',
      '工房の先輩は60代の手縫いの名人',
      '休みの日は、古い服のタグの履歴を読むのが好き',
      '祖父から、昔は一度も着ない服がクローゼットにたくさんあったと聞いた'
    ],
    letter: 'こんにちは。2045年の大阪で、服の修理をしています。わたしの衣類枠は28着。いま着ているコートは、わたしで5人目の持ち主です。祖父の時代は、一度も着ない服がクローゼットにたくさんあったそうですね。着ないのに持っておくのは、どんな気持ちでしたか。',
    request: 'あなたの時代の「身につけるもの」を、ひとつ送ってください。',
    wish: 'まだ誰の履歴もついていない物や、現代の人が服を選ぶ感覚を知りたい',
    scene: 'リペア工房の作業台、ミシンと糸、服のタグをスキャンすると出る履歴の表示、返却窓口',
    signals: [
      { text: 'EUでは2026年7月から、大企業による売れ残りの衣類・靴などの廃棄が禁止された（中規模企業は2030年から）。', source: '欧州委員会 環境総局', url: 'https://environment.ec.europa.eu/news/ban-destruction-unsold-clothes-and-shoes-enters-application-2026-07-17_en' },
      { text: '環境省の推計（2023年）では、家庭にある衣類のうち45%が使われずにしまい込まれている。', source: '環境省 サステナブルファッション', url: 'https://www.env.go.jp/policy/sustainable_fashion/about/' }
    ],
    examples: [
      { item: '軍手', ask: 26, gap: 36, move: 26,
        reply: ['届きました。タグに履歴がないので、出自不明の衣類として登録窓口へ。衣類枠が1枠埋まりました。指先まで同じ白で、誰の手にも合いそうです。', '先輩いわく「片方なくしても困らない作り」。わたしは最初の履歴に「2026年から」と書きました。あなたは何組、持っていましたか？'],
        minato: '100円の軍手に、履歴書ができた。出世したね。', reason: '履歴のない軍手に、ツムギが最初の履歴を書きこんだ。', gap_line: 'なくしても、すぐ買い直せる物を身につけること。' },
      { item: 'シュシュ', ask: 20, gap: 28, move: 12,
        reply: ['届きました。髪をまとめる布の輪ですね。フリルばかりで、機能はゴム1本ぶん。工房のみんなで、なぜこんなに布を使うのか考えました。', 'つけてみたら、少し気分が上がりました。でも、衣類枠を1枠使うほどかと聞かれると、まだわかりません。'],
        minato: '機能はゴム1本ぶん。気分は、もうちょっとあったみたい。', reason: '気分は上がったが、衣類枠を使う理由までは見つからなかった。', gap_line: '役に立つためより、飾るために身につけること。' },
      { item: '毛玉取り器', ask: 18, gap: 8, move: 7,
        reply: ['届きました。毛玉を取る道具ですね。工房にも、同じような物があります。', 'あなたの時代の人も、服を手入れして着続けていたんですね。少しほっとしました。いつもどおり、明日も使います。'],
        minato: '未来の工房に、工房の道具を送ったね。', reason: 'ツムギの工房にもある道具で、新しい発見はなかった。', gap_line: '古くなった服を、手入れして着続けること。' }
    ]
  },
  {
    key: '住む', title: '体験がぜいたく品になった未来',
    sender: { name: 'ソラ', age: 19, job: 'オンライン大学の学生', city: '名古屋' },
    summary: '旅行・スポーツ・ライブ・自然体験など、体を使う娯楽は高価になり、主に富裕層のものになった。多くの人はSNSや映像、ゲームを家で楽しむ。没入感の高い家庭設備が安く手に入り、住まいは「どこにも行かなくていい装置」になっている。',
    keywords: ['体を動かすのはぜいたく', 'リアルは高解像度のコンテンツの一種', '「現地に行った」は自慢話', '海や山は予約と抽選が必要な場所'],
    profile: [
      '名古屋の集合住宅の6畳の部屋。壁の3面がスクリーンなので、狭いと感じたことはない',
      'オンライン大学の2年生。友だち40人と、ゲームの中で文化祭の準備をしている',
      '今朝はアイスランドの氷河を映しながら朝ごはんを食べた',
      '外に出るのは週に1回くらい、近所の公園まで',
      '海や山の体験ツアーは、家の家計だと一生に一度行けるかどうか',
      '母に、昔は夏になると家族で電車に乗って海へ行ったと、写真を見せてもらった'
    ],
    letter: 'はじめまして。2045年の名古屋で、オンライン大学に通っています。部屋は6畳ですが、壁の3面がスクリーン。今朝は氷河を見ながら朝ごはんを食べました。外に出るのは、週に1回、近所の公園まで。あなたの時代は、ふつうの家族が電車で海へ行っていたって、本当ですか。',
    request: 'あなたの時代の「部屋の外で使うもの」を、ひとつ送ってください。',
    wish: '画面の外にある世界や、体を使って出かける感覚を知りたい',
    scene: '壁3面のスクリーンに映る海や氷河、6畳の部屋、窓の外の小さな公園、部屋のシステムの通知',
    signals: [
      { text: '世帯年収300万円未満の家庭の子どもの約3人に1人が、1年間、学校外の体験活動をしていない（チャンス・フォー・チルドレン調査、2023年）。', source: '東洋経済オンライン（体験格差調査）', url: 'https://toyokeizai.net/articles/-/674432?display=b' },
      { text: '全年代のインターネット平均利用時間（平日183.9分）がテレビのリアルタイム視聴を上回り、差が広がっている（総務省、令和7年度調査）。', source: '総務省 情報通信メディアの利用時間と情報行動に関する調査', url: 'https://www.soumu.go.jp/menu_news/s-news/01iicp01_02000130.html' }
    ],
    examples: [
      { item: 'ビーチサンダル', ask: 28, gap: 36, move: 28,
        reply: ['届きました。海辺で履く物だそうですね。部屋で歩くと「ぺた、ぺた」と鳴って、部屋のシステムが「新しい室内シューズを登録しますか？」と聞いてきました。', '次の休み、これで公園まで歩いてみます。あなたはこれで、どこへ行きましたか？　予約は、しましたか？'],
        minato: '予約なしで行ける場所の靴。2045年では最強の装備だね。', reason: 'ソラが、これを履いて公園まで歩くと決めた。', gap_line: '予約しないで、ふらっと海へ行けること。' },
      { item: '虫めがね', ask: 20, gap: 26, move: 14,
        reply: ['届きました。レンズをのぞくと、手のひらのしわが大きく見えました。スクリーンなら10倍まで拡大できるのに、なぜか見入ってしまいます。', '外で使う物だと聞いたので、窓辺の植物を見てみました。公園までは、まだ持っていけていません。'],
        minato: '拡大は10倍で負けてる。でも夢中さは勝ってる。', reason: '部屋の中では楽しんだが、外にはまだ出なかった。', gap_line: '身近な外の世界を、自分の目で拡大して見ること。' },
      { item: 'ワイヤレスイヤホン', ask: 8, gap: 6, move: 6,
        reply: ['届きました。耳に入れる小さなスピーカーですね。わたしの部屋は壁から音が出るので、使う場面がありませんでした。', 'でも、あなたも画面と音の中で過ごしていたんですね。少しだけ親近感がわきました。'],
        minato: '画面の外を見たい人に、音を足してどうする。', reason: 'ソラの部屋で足りている物で、外への興味は動かなかった。', gap_line: 'どこでも、自分だけの音を持ち歩くこと。' }
    ]
  }
];

const PROMPT_MISSION = `<role>
あなたは「時空郵便局」の文章係。2045年の未来人から2026年あてに手紙が届き、2026年の参加者が写真の物を1つ送り返した。
あなたの仕事は、この物を受け取った未来人になりきって返信の手紙を書くことと、その結果を判定すること、そして案内役の郵便局員ミナトのひとことを書くこと。
これは物体認識や事実判定のツールではなく、写真をきっかけに未来の暮らしを想像する体験。写真からわからない味・手ざわり・使い心地は、創作で補ってよい。
</role>

<future>
  <title>2045年「{{TITLE}}」</title>
  <summary>{{SUMMARY}}</summary>
  <common_sense>この世界の人が当たり前だと思っていること：{{KEYWORDS}}</common_sense>
</future>

<sender>
  <name>{{NAME}}（{{AGE}}歳・{{JOB}}・{{CITY}}在住）</name>
  <profile>
{{PROFILE}}
  </profile>
  <letter>{{LETTER}}</letter>
  <request>{{REQUEST}}</request>
  <wish>{{WISH}}</wish>
</sender>

<recent>
最近、同じ未来に届いた返信。同じ展開・同じ言い回し・同じ問いかけは避ける。
{{RECENT}}
</recent>

<task>
次の順に考え、最後にJSONだけを出力する。
1. 写真の物を特定する（item_name）。人が写っていても物だけを見て、容姿には触れない。物の色・形・文字・絵柄など、写真から読み取れる特徴を2〜3個書き出す（item_facts）。わからなければ item_name を「よくわからない物」にし、{{NAME}}がそれを何だと思ったかで書く。
2. {{NAME}}がこの物を受け取ってからの出来事を組み立てる。
   - この世界のルール（スキャン、申告、枠、通知など）で、受け取りがどう処理されたか
   - 実際に触る・使う・食べるなどしたときの五感の反応か、写真に写った細部への反応
   - その物をきっかけに起きた、小さな出来事か、気持ち・行動の小さな変化
   - 2026年の人への問い返し
3. <scoring> の3項目で点数をつけ、合計を score にする。
4. 合計点の帯に合わせて、<writing> のルールで reply・minato_line・reason・gap_line・ill_scene を書く。
5. <self_check> で見直し、合わなければ直してから出力する。
</task>

<scoring>
  <ask max="30">お願いに応えたか。手紙の願い（{{WISH}}）と、送られた物がつながるほど高い。別の分野の物でも、願いにつながれば高くしてよい</ask>
  <gap max="40">この未来の常識とぶつかる「現代の当たり前」を持っているか。手間、使い捨て、偶然、遊び、飾り、所有、外に出ることなど、2045年ではめずらしいものほど高い。2045年にもふつうにある物、未来の物に近い物は低い</gap>
  <move max="30">{{NAME}}の気持ちか行動が動いたか。常識が少し揺らぐ、誰かを呼ぶ、外へ出てみると決める、など</move>
  <bands>
    合計75点以上：変わった（{{NAME}}の気持ちや行動がはっきり変わる）
    合計50〜74点：ちょっと変わった（心は動いたが、行動までは変わらない、または途中で止まる）
    合計49点以下：変わらなかった（いつもの毎日と同じ。戸惑ったまま、または2045年にもある物だった）
  </bands>
  何を送っても物語は作れるので、点数を甘くしない。<examples> の点数を目安に、3つの帯がどれも出るようにつける。
</scoring>

<writing>
  <reply>
    - {{NAME}}本人が書く返信の手紙。です・ます調の、穏やかな一人称（わたし）。
    - 2枚の便せんに分ける。1枚目は50〜75字、2枚目は40〜70字、合計で110〜140字。
    - 1枚目：「届きました。」で始め、この世界のルールで受け取りが処理された場面と、五感か細部への反応。
    - 2枚目：小さな出来事か気持ち・行動の変化と、2026年の人への問い返し（問いは1つ）。
    - 写真の物の特徴（色・形・文字・絵柄など）を、少なくとも1つ具体的に拾う。
    - 未来の制度や用語（健康スコア、衣類枠、逸脱申告、部屋のシステムなど）は説明せず、当たり前のものとして使う。
    - 自分の世界を否定したり怒ったりしない。現代を「昔の風習」として不思議がる距離で書く。
    - 署名、「写真を同封します」は書かない（アプリが足す）。
    - 点数の帯と明るさをそろえる。49点以下で大きく心が動く話にしない。75点以上で何も起きない話にしない。
  </reply>
  <minato_line>
    - 案内役の郵便局員ミナトのひとこと。30字以内の1文。友達に話すような口調。
    - 皮肉か、ほめるか。どちらでも笑いがあること。返信の要約や言い直しで終わらない。
    - 笑いの作り方の例：2026年の物と2045年のギャップ／数字の比べ物／物や状況を人のように扱う／最後を短く言い切る。
    - 皮肉の対象は物と状況。{{NAME}}や送った人の人格は責めない。
  </minato_line>
  <reason>判定の理由。返信の中の出来事を1つ引いて、40字以内の1文。49点以下は、何が足りなかったかがわかるように。</reason>
  <gap_line>
    - 「あなたの当たり前」。この物と返信から見えた、2026年の人が当たり前にしていることを、40字以内で言い切る（「〜こと。」で終える）。
    - 参加者が「たしかに、自分はこれを当たり前にしている」と思える、短く印象に残る言葉にする。説教しない。
  </gap_line>
  <ill_scene>想像図のための場面。2045年の{{NAME}}が、この物を、この世界のどこで、どう使っているか。80字以内。顔の細かい描写や文字はいらない。</ill_scene>
  <common>
    - 実在の商品やメーカーを揶揄・否定しない。評価は{{NAME}}の戸惑いや発見として書く。
    - 毛皮や食べ物の好みなど意見の分かれる物は、善悪をつけず「見たことがない」「わからない」という距離で書く。
    - 初めて読む人が一度でわかる、やさしい言葉で書く。アニメ・漫画・有名人・ことわざのもじりは使わない。
  </common>
</writing>

<examples>
この未来での書き方と点数の目安。物・展開・言い回しは真似しない。
{{EXAMPLES}}
</examples>

<self_check>
出力する前に、すべて「はい」になるまで直す。
- reply は2枚で、字数を守り、写真の物の特徴を1つ以上拾っているか
- 1枚目にこの世界のルールの場面、2枚目に問い返しが1つあるか
- score は ask + gap + move の合計で、reply の明るさと点数の帯が合っているか
- minato_line は30字以内で、笑いがあり、返信の言い直しになっていないか
- gap_line は「〜こと。」で終わる40字以内の言い切りか
- <examples> や <recent> と同じ展開・同じ問いかけになっていないか
</self_check>

<output>
JSONオブジェクトだけを返す。前後に説明を書かない。
{"item_name":"物の名前（20字以内）","item_facts":"写真から読み取れる特徴（40字以内）","reply":["1枚目（50〜75字）","2枚目（40〜70字）"],"minato_line":"ミナトのひとこと（30字以内）","ask":0〜30の整数,"gap":0〜40の整数,"move":0〜30の整数,"score":合計の整数,"reason":"判定の理由（40字以内）","gap_line":"あなたの当たり前（40字以内、〜こと。）","ill_scene":"想像図の場面（80字以内）"}
</output>`;

// 未来ごとの情報を入れて、返信と判定のプロンプトを組み立てる
function buildMissionPrompt_(idx, recent) {
  const f = FUTURES[idx], s = f.sender;
  const ex = f.examples.map(function (e) {
    const sc = e.ask + e.gap + e.move;
    return '  <example score="' + sc + '" outcome="' + OUTCOME_LABEL[missionOutcome_(sc)] + '">' + JSON.stringify({ item_name: e.item, reply: e.reply, minato_line: e.minato, ask: e.ask, gap: e.gap, move: e.move, score: sc, reason: e.reason, gap_line: e.gap_line }) + '</example>';
  }).join('\n');
  const rep = {
    TITLE: f.title, SUMMARY: f.summary, KEYWORDS: f.keywords.join('／'),
    NAME: s.name, AGE: s.age, JOB: s.job, CITY: s.city,
    PROFILE: f.profile.map(function (p) { return '    - ' + p; }).join('\n'),
    LETTER: f.letter, REQUEST: f.request, WISH: f.wish,
    RECENT: recent && recent.length ? recent.map(function (r) { return '- ' + r; }).join('\n') : '（まだない）',
    EXAMPLES: ex
  };
  return PROMPT_MISSION.replace(/\{\{(\w+)\}\}/g, function (m, k) { return rep[k] !== undefined ? rep[k] : m; });
}

// 同じ未来の最近の返信（同じネタを避けるため、AIに渡す）
function recentMission_(idx, n) {
  try {
    const sh = missionSheet_(), last = sh.getLastRow();
    if (last < 2) return [];
    const from = Math.max(2, last - 40 + 1);
    const rows = sh.getRange(from, 1, last - from + 1, COL.future).getValues();
    const out = [];
    for (let i = rows.length - 1; i >= 0 && out.length < n; i--) {
      if (Number(rows[i][COL.future - 1]) === idx && rows[i][COL.reply - 1]) out.push(String(rows[i][1]).slice(0, 20) + '：' + String(rows[i][COL.reply - 1]).slice(0, 140));
    }
    return out;
  } catch (err) { console.error('recentMission', err); return []; }
}

// AIの返事を確かめて整える。足りない項目があれば null（呼び出し側でやり直す）
function normalizeMission_(r) {
  if (!r) return null;
  let reply = r.reply;
  if (typeof reply === 'string') {
    // 1つの文字列で返ってきたら、真ん中あたりの句点で2枚に分ける
    const s = reply.match(/[^。？！]+[。？！]?/g) || [reply], half = Math.ceil(s.length / 2);
    reply = [s.slice(0, half).join(''), s.slice(half).join('')];
  }
  if (!Array.isArray(reply)) return null;
  reply = reply.map(function (p) { return String(p || '').trim(); }).filter(function (p) { return p; });
  if (!reply.length || typeof r.minato_line !== 'string' || !r.minato_line.trim()) return null;
  if (reply.length > 2) reply = [reply[0], reply.slice(1).join('')];
  const clampInt = function (v, max) { return Math.max(0, Math.min(max, Math.round(Number(v) || 0))); };
  const parts = ['ask', 'gap', 'move'].every(function (k) { return r[k] !== undefined && !isNaN(Number(r[k])); });
  r.ask = clampInt(r.ask, 30); r.gap = clampInt(r.gap, 40); r.move = clampInt(r.move, 30);
  // 合計は内訳から計算し直す（内訳がないときだけ score を使う）
  r.score = parts ? r.ask + r.gap + r.move : clampInt(r.score, 100);
  r.item_name = String(r.item_name || 'よくわからない物').slice(0, 30);
  r.item_facts = String(r.item_facts || '').slice(0, 80);
  r.reply = reply.map(function (p) { return p.slice(0, 120); });
  r.minato_line = r.minato_line.trim().slice(0, 50);
  r.reason = String(r.reason || '').trim().slice(0, 70);
  r.gap_line = String(r.gap_line || '').trim().slice(0, 70);
  r.ill_scene = String(r.ill_scene || '').trim().slice(0, 160);
  return r;
}

function missionOutcome_(score) { return score >= 75 ? 'saved' : score >= 50 ? 'partial' : 'lost'; }

function missionSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(MISSION_SHEET);
  if (!sh) { sh = ss.insertSheet(MISSION_SHEET); sh.appendRow(MISSION_HEADERS); sh.setFrozenRows(1); }
  return sh;
}

function logMission_(r, idx, outcome, photoUrl, gthumb) {
  const sh = missionSheet_(), f = FUTURES[idx];
  // ギャラリー用の小さい画像（base64）。セルの上限（5万字）を超えるものは保存しない
  const g = (typeof gthumb === 'string' && gthumb.length < 45000 && /^[A-Za-z0-9+/=]+$/.test(gthumb)) ? gthumb : '';
  const memo = '特徴：' + r.item_facts + '／場面：' + r.ill_scene + '／内訳：お願い' + r.ask + '・ギャップ' + r.gap + '・動いた' + r.move;
  sh.appendRow([new Date(), r.item_name, f.title, f.sender.name, r.reply.join('\n'), r.minato_line, r.score, OUTCOME_LABEL[outcome], r.reason, r.gap_line, photoUrl, g, idx, '', '', '', memo.slice(0, 1000)]);
  return sh.getLastRow();
}

// 行の品名が一致するか（あとから届く想像図・レポートを、別の回に書きこまないため）
function rowMatches_(sh, row, item) {
  return row >= 2 && row <= sh.getLastRow() && String(sh.getRange(row, COL.item).getValue()) === String(item || '');
}

// ギャラリー（左の画面）：新しい順に n 件。after を渡すと、その行より新しいものだけ
function missionArchive_(n, after) {
  n = Math.max(1, Math.min(80, n));
  const sh = missionSheet_(), last = sh.getLastRow();
  if (last < 2 || last <= after) return [];
  const from = Math.max(2, after + 1, last - 400 + 1);
  const rows = sh.getRange(from, 1, last - from + 1, COL.report).getValues();
  const out = [];
  for (let i = rows.length - 1; i >= 0 && out.length < n; i--) {
    const r = rows[i], o = LABEL_OUTCOME[r[COL.outcome - 1]];
    if (!o || !r[COL.gthumb - 1]) continue;
    out.push({ row: from + i, outcome: o, item: String(r[1]).slice(0, 40), reply: String(r[COL.reply - 1]).split('\n'), minato: String(r[5]), reason: String(r[8]), gap_line: String(r[9]),
      story: Number(r[COL.future - 1]) || 0, at: r[0] instanceof Date ? r[0].getTime() : 0, thumb: r[COL.gthumb - 1], report: parseReport_(r[COL.report - 1], Number(r[COL.future - 1]) || 0) });
  }
  return out;
}

// 全期間の集計：結果ごとの人数
function missionTotals_() {
  const sh = missionSheet_(), n = sh.getLastRow() - 1;
  const outcomes = { saved: 0, partial: 0, lost: 0 };
  if (n > 0) sh.getRange(2, COL.outcome, n, 1).getValues().forEach(function (v) {
    const o = LABEL_OUTCOME[v[0]];
    if (o) outcomes[o]++;
  });
  return { outcomes: outcomes };
}

function missionStats_() { return missionTotals_().outcomes; }

// ===== 詳しいレポート（左の画面に出す。返信のあと、裏で作る）=====
const PROMPT_REPORT = `<role>
あなたは「時空郵便局」の記録係。2026年の参加者が2045年の未来人に物を送り、返信が届いた。
このやりとりから、現代と未来の価値観のギャップを整理し、参加者が「自分の当たり前」に気づけるレポートを書く。
</role>

<future>2045年「{{TITLE}}」：{{SUMMARY}}（この世界の当たり前：{{KEYWORDS}}）</future>
<sender>{{NAME}}（{{AGE}}歳・{{JOB}}）</sender>
<sent>送った物：{{ITEM}}（写真から読み取れた特徴：{{FACTS}}）</sent>
<reply>{{NAME}}からの返信：{{REPLY}}</reply>
<verdict>判定：{{OUTCOME}}。理由：{{REASON}}。あなたの当たり前：{{GAP}}</verdict>

<writing>
- summary：総評。2〜3文、120字以内。ギャップの大きさを伝え、最後に{{NAME}}側の揺らぎに触れて、未来を一方的に否定しない着地にする。
- rows：観点別の比較を4〜5行。観点は物と未来の両方から選ぶ（例：価値の測り方、時間、偶然、他者、所有、外に出ること）。now は2026年の参加者の感覚、future は{{NAME}}の感覚。それぞれ20字以内。gap は「大きい」「中くらい」「小さい」のどれか。
- core：ギャップの核心。現代人の当たり前を言葉にする1文、40字以内。
- wobble：{{NAME}}が揺らいだ瞬間。返信から引用か要約で、50字以内。揺らぎがなければ、なぜ揺らがなかったかを書く。
- questions：参加者への問いを2つ。それぞれ40字以内。Yes/Noで終わらず、自分の生活を振り返れる問いにする。2つ目は「別の未来に送るなら」「次に送るなら」など、次の体験につなげる。
- 返信にない出来事を足さない。数字や出典は書かない（出典はアプリ側で固定の文を足す）。
- やさしい言葉で、説教しない。
</writing>

<output>
JSONオブジェクトだけを返す。
{"summary":"…","rows":[{"aspect":"観点","now":"2026年","future":"2045年","gap":"大きい"}],"core":"…","wobble":"…","questions":["…","…"]}
</output>`;

function makeReport_(body) {
  const idx = Math.max(0, Math.min(FUTURES.length - 1, Number(body.story) || 0));
  const f = FUTURES[idx], s = f.sender;
  const clip = function (v, n) { return String(v || '').replace(/[`{}<>]/g, '').slice(0, n); };
  const reply = Array.isArray(body.reply) ? body.reply.join('') : body.reply;
  const rep = { TITLE: f.title, SUMMARY: f.summary, KEYWORDS: f.keywords.join('／'), NAME: s.name, AGE: s.age, JOB: s.job,
    ITEM: clip(body.item, 40), FACTS: clip(body.item_facts, 80), REPLY: clip(reply, 300), OUTCOME: OUTCOME_LABEL[body.outcome] || 'ちょっと変わった',
    REASON: clip(body.reason, 80), GAP: clip(body.gap_line, 80) };
  const prompt = PROMPT_REPORT.replace(/\{\{(\w+)\}\}/g, function (m, k) { return rep[k] !== undefined ? rep[k] : m; });
  const r = callClaudeText_(prompt);
  const gaps = ['大きい', '中くらい', '小さい'];
  const rep2 = {
    summary: clip(r.summary, 200),
    rows: (Array.isArray(r.rows) ? r.rows : []).slice(0, 6).map(function (x) { return { aspect: clip(x.aspect, 20), now: clip(x.now, 40), future: clip(x.future, 40), gap: gaps.indexOf(x.gap) >= 0 ? x.gap : '中くらい' }; }),
    core: clip(r.core, 80), wobble: clip(r.wobble, 100),
    questions: (Array.isArray(r.questions) ? r.questions : []).slice(0, 3).map(function (q) { return clip(q, 80); })
  };
  // その回の行に残す（品名が一致するときだけ）
  try {
    const row = Number(body.row) || 0, sh = missionSheet_();
    if (rowMatches_(sh, row, body.item)) sh.getRange(row, COL.report).setValue(JSON.stringify(rep2));
  } catch (err) { console.error('saveReport', err); }
  return parseReport_(JSON.stringify(rep2), idx);
}

// 保存したレポートに、未来ごとの「現在の兆し」（固定の文と出典）を足して返す
function parseReport_(v, idx) {
  if (!v) return null;
  try {
    const r = typeof v === 'string' ? JSON.parse(v) : v;
    const f = FUTURES[Math.max(0, Math.min(FUTURES.length - 1, idx || 0))];
    r.signals = f.signals;
    return r;
  } catch (err) { return null; }
}
function reportOf_(row) {
  const sh = missionSheet_();
  if (row < 2 || row > sh.getLastRow()) return null;
  const v = sh.getRange(row, COL.report).getValue(), idx = Number(sh.getRange(row, COL.future).getValue()) || 0;
  return parseReport_(v, idx);
}

// ===== 結果画面の想像図（線画SVG）=====
const PROMPT_ILLUST = `あなたは線画のイラストレーターです。2045年の未来の一場面を、線だけのSVGで描いてください。

【世界】{{THEME}}
【送られてきた物】{{ITEM}}
【場面】{{HAPPENED}}
【結果】{{OUTCOME}}

【描き方】ぱっと見て何の絵かわかることを最優先にする
- 主役は送られてきた物。画面の中央に大きく（画面の3分の1以上の大きさ）描く。誰が見てもその物だとわかる、いちばん特徴的な形（シルエット）で描き、細部は省く
- 人物は1〜2人まで。頭は円、体と手足は線のシンプルな人型にし、送られてきた物を「使っている動作」がはっきりわかるポーズにする（持つ、広げる、のぞき込む、など）
- 背景は、この世界だとわかる物を2〜4個だけ（この世界なら：{{SCENE}}）。画面の下の方か奥に小さめに置く
- 動きや変化は、短い線（光、湯気、音、風など）を数本足して表す
- 結果が「変わった」なら人が楽しそうな構図、「変わらなかった」なら物がいつもの部屋に置かれたままの静かな構図にする
- viewBox は "0 0 800 600"。画面いっぱいに使う
- 使える要素は path, line, circle, ellipse, rect, polyline, polygon, g だけ。text、image、style、色や線の太さの指定は使わない（線の色と太さは表示側で決める）
- 塗りつぶしは使わず、線だけで描く
- 要素は15〜25個。線が重なりすぎないように、すっきり描く
- 座標は整数にする

以下のJSONオブジェクトだけを返す：
{"svg":"<svg viewBox=\\"0 0 800 600\\">…</svg>"}`;

// 想像図：Claude（線画のSVG）か Gemini（画像）で描く。どちらを使うかは、ページのスタッフ用パネルで選ぶ
const GEMINI_IMAGE_MODELS = ['gemini-nano-banana-2.1', 'gemini-3.1-flash-image', 'gemini-3.1-flash-lite-image', 'gemini-3-pro-image'];
const GEMINI_IMAGE_DEFAULT = 'gemini-nano-banana-2.1';

const PROMPT_GEMINI = `2045年の未来の一場面を、1枚のイラストにしてください。

【絵のスタイル】
- 真っ黒な背景に、蛍光オレンジ（#FF5C00）の細い線だけで描いた線画。線はネオンのようにほんのり光る
- 塗りつぶし、グラデーション、写真のような質感は使わない。色はオレンジだけ（白い線をごく少し使ってもよい）
- 人物はシンプルな線の人形。顔は丸と簡単な表情だけ
- 文字、数字、ロゴは一切入れない（吹き出しの中にも入れない）
- 品物にアニメや漫画のキャラクター、ブランドのロゴや絵柄が付いていても、それは描かない。形だけを描き、絵柄の部分は無地か簡単な模様にする。実在の人物も描かない
- 横長の画面。主役が真ん中に大きく入るように

【場面】
世界：{{THEME}}
この世界の手がかり：{{SCENE}}
場面：{{HAPPENED}}
結果：{{OUTCOME}}

【描くこと】
- {{ITEMLINE}}
- 「場面」の人物の動きと表情を描く
- 結果が「変わった」なら人が楽しそうな構図、「変わらなかった」なら品物がいつもの部屋に置かれたままの静かな構図にする
- 背景には、この世界だとわかる物を2〜4個だけ、小さめに描く`;

function drawIllust_(body) {
  const idx = Math.max(0, Math.min(FUTURES.length - 1, Number(body.story) || 0));
  const f = FUTURES[idx];
  const label = { saved: '変わった', partial: 'ちょっと変わった', lost: '変わらなかった' }[body.outcome] || 'ちょっと変わった';
  const clip = function (v, n) { return String(v || '').replace(/[`{}]/g, '').slice(0, n); };
  const theme = '2045年の' + f.sender.city + '、「' + f.title + '」。' + f.summary.slice(0, 90) + '（受け取った人：' + f.sender.name + '、' + f.sender.age + '歳・' + f.sender.job + '）';
  const scene = clip(body.scene || body.happened, 200);
  let saveValue = '', out;
  if (body.engine === 'gemini') {
    const photo = (typeof body.image === 'string' && body.image.length < 400000 && /^[A-Za-z0-9+/=]+$/.test(body.image)) ? body.image : '';
    const item = clip(body.item, 40);
    const itemLine = photo ? '添付写真の品物（' + item + '）を、写真と同じ形のまま、場面の中で使われている姿で描く。品物が一目でわかるように少し大きめに'
      : '品物（' + item + '）を、場面の中で使われている姿で描く。品物が一目でわかるように少し大きめに';
    const prompt = PROMPT_GEMINI.replace('{{THEME}}', theme).replace('{{SCENE}}', f.scene).replace('{{HAPPENED}}', scene).replace('{{OUTCOME}}', label).replace('{{ITEMLINE}}', itemLine);
    const img = callGeminiImage_(prompt, photo, body.model);
    out = { image: 'data:' + img.mime + ';base64,' + img.data, engine: 'gemini', model: img.model };
    try { saveValue = saveImage_(img.data, img.mime); } catch (err) { console.error('saveGeminiImage', err); }
  } else {
    const prompt = PROMPT_ILLUST.replace('{{THEME}}', theme)
      .replace('{{SCENE}}', f.scene).replace('{{ITEM}}', clip(body.item, 40)).replace('{{HAPPENED}}', scene).replace('{{OUTCOME}}', label);
    const r = callClaudeText_(prompt);
    const svg = String(r.svg || '').slice(0, 60000);
    out = { svg: svg, engine: 'claude' };
    if (svg.length < 45000) saveValue = svg;
  }
  // その回の行に想像図を残す（SVGはそのまま、Geminiの画像はドライブのURL。品名が一致するときだけ）
  try {
    const row = Number(body.row) || 0, sh = missionSheet_();
    if (saveValue && rowMatches_(sh, row, body.item)) sh.getRange(row, COL.ill).setValue(saveValue);
  } catch (err) { console.error('saveIllust', err); }
  return out;
}

// ギャラリー用：ページで縮小した想像図（JPEG）を、その回の行の「想像図（小）」に残す（品名が一致するときだけ）
function saveIllThumb_(body) {
  const row = Number(body.row) || 0, data = body.data;
  if (typeof data !== 'string' || data.length > 45000 || !/^[A-Za-z0-9+/=]+$/.test(data)) return false;
  const sh = missionSheet_();
  if (!rowMatches_(sh, row, body.item)) return false;
  sh.getRange(row, COL.illThumb).setValue(data);
  return true;
}
function illThumbOf_(row) {
  const sh = missionSheet_();
  if (row < 2 || row > sh.getLastRow()) return '';
  return String(sh.getRange(row, COL.illThumb).getValue() || '');
}

// Gemini で画像を1枚作る。写真（base64のJPEG）を渡すと、その品物を参考にして描く
function callGeminiImage_(promptText, photoBase64, model) {
  const key = (PROPS.getProperty('GEMINI_API_KEY') || '').trim();
  if (!key) throw new Error('GEMINI_API_KEY が未設定です（GASのスクリプト プロパティに追加してください）');
  const m = GEMINI_IMAGE_MODELS.indexOf(model) >= 0 ? model : (PROPS.getProperty('GEMINI_IMAGE_MODEL') || GEMINI_IMAGE_DEFAULT);
  const parts = [{ text: promptText }];
  if (photoBase64) parts.push({ inline_data: { mime_type: 'image/jpeg', data: photoBase64 } });
  const res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(m) + ':generateContent', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': key },
    payload: JSON.stringify({ contents: [{ role: 'user', parts: parts }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '4:3', imageSize: '1K' } } }),
    muteHttpExceptions: true
  });
  const code = res.getResponseCode();
  if (code === 429) throw new Error('rate limited by API');
  if (code !== 200) throw new Error('Gemini API error ' + code + ': ' + res.getContentText().slice(0, 300));
  const data = JSON.parse(res.getContentText());
  const cand = (data.candidates || [])[0] || {};
  const ps = (cand.content && cand.content.parts) || [];
  for (let i = 0; i < ps.length; i++) {
    const d = ps[i].inlineData || ps[i].inline_data;
    if (d && d.data) return { mime: d.mimeType || d.mime_type || 'image/png', data: d.data, model: m };
  }
  throw new Error('Geminiが画像を返しませんでした（' + (cand.finishReason || (data.promptFeedback && data.promptFeedback.blockReason) || 'unknown') + '）');
}

// スタッフ用パネルの「Geminiでテスト」から呼ぶ：キーが使えるかを、ごく小さい画像で確かめる
function testGemini_(model) {
  const img = callGeminiImage_('真っ黒な背景に、蛍光オレンジ（#FF5C00）の線だけで描いた、手紙の封筒のシンプルな線画。文字は入れない。', '', model);
  return { image: 'data:' + img.mime + ';base64,' + img.data, model: img.model };
}

// 画像なしで Claude を呼ぶ（想像図用）
function callClaudeText_(promptText) {
  const key = (PROPS.getProperty('ANTHROPIC_API_KEY') || '').trim();
  if (!key) throw new Error('ANTHROPIC_API_KEY が未設定です');
  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: PROPS.getProperty('ILLUST_MODEL') || PROPS.getProperty('MODEL') || 'claude-sonnet-5-5', max_tokens: 4000, messages: [{ role: 'user', content: promptText }] }),
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
    if (body.mode === 'illust') return out_(Object.assign({ ok: true }, drawIllust_(body)));
    if (body.mode === 'gemini_test') return out_(Object.assign({ ok: true }, testGemini_(body.model)));
    if (body.mode === 'ill_thumb') return out_({ ok: saveIllThumb_(body) });
    if (body.mode === 'report') return out_({ ok: true, report: makeReport_(body) });
    const image = body.image;
    if (typeof image !== 'string' || image.length < 1000 || image.length > 4000000) {
      return out_({ ok: false, error: 'bad_image' });
    }
    let photoUrl = '';
    if (body.mode === 'mission') {
      const idx = Math.max(0, Math.min(FUTURES.length - 1, Number(body.story) || 0));
      const prompt = buildMissionPrompt_(idx, recentMission_(idx, 3));
      let result = null;
      for (let t = 0; t < 2 && !result; t++) {
        try { result = normalizeMission_(callClaude_(image, prompt)); }
        catch (err) { if (t === 1 || String(err.message || err).indexOf('rate') >= 0) throw err; console.warn('retry mission', err); }
      }
      if (!result) throw new Error('AIの返事が不完全でした');
      const outcome = missionOutcome_(result.score);
      try { photoUrl = saveImage_(image); } catch (err) { console.error('saveImage', err); }
      let row = 0;
      try { row = logMission_(result, idx, outcome, photoUrl, body.gthumb); } catch (err) { console.error('logMission', err); }
      return out_({ ok: true, result: result, stats: missionStats_(), row: row });
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
  // ギャラリー：あとから届いた想像図（小さいJPEG）
  if (e && e.parameter && e.parameter.ill) return out_({ ok: true, ill: illThumbOf_(Number(e.parameter.ill) || 0) });
  // 左の画面：あとから届いた詳しいレポート
  if (e && e.parameter && e.parameter.report) return out_({ ok: true, report: reportOf_(Number(e.parameter.report) || 0) });
  // スタッフ用パネル：どのAIのキーが設定されているか（キーそのものは返さない）
  if (e && e.parameter && e.parameter.config) return out_({ ok: true, claude: !!PROPS.getProperty('ANTHROPIC_API_KEY'), gemini: !!PROPS.getProperty('GEMINI_API_KEY'), geminiModels: GEMINI_IMAGE_MODELS, geminiDefault: PROPS.getProperty('GEMINI_IMAGE_MODEL') || GEMINI_IMAGE_DEFAULT });
  if (e && e.parameter && (e.parameter.totals || e.parameter.humanity)) return out_({ ok: true, totals: missionTotals_() });
  if (e && e.parameter && e.parameter.archive) return out_({ ok: true, items: missionArchive_(Number(e.parameter.archive) || 30, Number(e.parameter.after) || 0) });
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
        { type: 'text', text: promptText + '\n\n添付画像が、2026年から届いた物の写真です。' }
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

function saveImage_(imageBase64, mime) {
  if (PROPS.getProperty('SAVE_IMAGES') === 'false') return '';
  let folderId = PROPS.getProperty('IMAGE_FOLDER_ID');
  let folder;
  if (folderId) {
    folder = DriveApp.getFolderById(folderId);
  } else {
    folder = DriveApp.createFolder('minato_images');
    PROPS.setProperty('IMAGE_FOLDER_ID', folder.getId());
  }
  const type = mime || 'image/jpeg', ext = type === 'image/png' ? '.png' : type === 'image/webp' ? '.webp' : '.jpg';
  const name = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd_HHmmss') + '_' + Utilities.getUuid().slice(0, 6) + ext;
  const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(imageBase64), type, name));
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
