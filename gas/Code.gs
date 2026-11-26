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
const MISSION_SHEET = 'mission_log_v4';
const MISSION_HEADERS = ['日時', '品物', '依頼主', 'お願い', '2126年で起きたこと', 'ツッコミ', '点数', '結果', '写真', 'ギャラリー用', '依頼主No', '想像図', '判定メモ', '想像図（小）'];
const OUTCOME_LABEL = { saved: '変わった', partial: 'ちょっと変わった', lost: '変わらなかった' };
const LABEL_OUTCOME = { '変わった': 'saved', 'ちょっと変わった': 'partial', '変わらなかった': 'lost' };
// 2126年で少し困っている依頼主。index.html の STORIES と同じ順番にしておくこと
// AIの判定がぶれないよう、世界の仕組み・場所・登場人物・物を使うときの条件・結果の目安・お手本を、依頼主ごとに具体的に書いておく
const MISSION_STORIES = [
  {
    name: "透", who: "41歳・新規事業部の課長",
    request: "チームの人と仲良くなる、きっかけになる物がほしい。",
    letter: "うちの会社では、AI秘書がみんなの予定を組んでくれます。会議が終わった0秒後に、次の会議。雑談の時間は『ムダ』として消されました。チームの5人とは毎日同じ会議室にいるのに、誰の好きな食べ物も知りません。",
    profile: [
      "住まい：渋谷から電車で20分のマンションの3階、2LDK。妻と中学1年の娘の3人暮らし。部屋はAIがいつも片づけていて物が少ない。ベランダに、昔使っていたキャンプ用の折りたたみ椅子が1脚だけ出しっぱなしになっている",
      "仕事：大手メーカーの新規事業部の課長。新しい事業を考えるのが仕事だが、企画会議では毎回AIの案がそのまま通る",
      "1日の流れ：7時に起きる。9時から18時まで、AI秘書が組んだ9本の会議。昼ごはんは会議中に栄養ゼリー。帰りの電車で、AIが要約した議事録を読む",
      "休みの日：AIのおすすめ動画を流しながら、ソファーで寝落ちする",
      "趣味：昔は大学の友達とキャンプに行き、焚き火を囲んで朝まで話すのが好きだった。もう10年行っていない",
      "好きな物：からあげ、古い喫茶店のナポリタン、焚き火のにおい",
      "苦手な物：沈黙、自己紹介",
      "性格：まじめで責任感が強い。部下に気をつかいすぎて、仕事以外の質問ができない。冗談を言うと、自分で説明してしまう",
      "口ぐせ：「念のため確認なんですが」",
      "最近あったこと：娘に「お父さんの会社の人って、どんな人？」と聞かれて、何も答えられなかった"
    ],
    world: "2126年、会社の予定はAI秘書がすべて組む。会議と会議のあいだは0分。会議中に議題と関係ない話をすると、AI秘書が「ノイズ」として記録から消し、壁の画面に「議題に戻りましょう」と出す。雑談の時間は「ムダ」として予定表から消えた。",
    place: "渋谷のオフィスの会議室。透のチーム6人（透と5人のメンバー）は、毎日同じ会議室で1日9本の会議を続けて受ける。壁の大きな画面には、AI秘書が議題と残り時間を表示している。",
    people: [
      "透（41歳、課長）：まじめ。雑談の始め方がわからない",
      "佐藤（24歳、新人）：無口。実は手品が得意",
      "山田（52歳、ベテラン）：昔の話をしたがるが、毎回AI秘書に止められる",
      "リン（33歳、デザイナー）：絵がうまい。会議中に資料の端にこっそり落書きしている",
      "木村（29歳、エンジニア）：実は甘い物に目がない",
      "大野（38歳、営業）：笑い声が大きい"
    ],
    rules: [
      "物は透の手元に1つ届く。透がチームに見せる、配る、机に置くなどして使う",
      "使えるのは会議室の中。会議と会議のすき間は0分なので、使うなら会議の始めや途中",
      "AI秘書は議題と関係ない行動を止めようとする。止め方は面白さの材料にしてよい",
      "メンバーの意外な一面は、まだ誰も知らない。物がきっかけで1人か2人の一面がわかると面白い"
    ],
    changed: "メンバーの意外な一面がわかり、そのあとも雑談が続くようになる（例：会議の最初の1分が雑談の時間になる、AI秘書の予定表に雑談の枠が増える）",
    little: "その場は盛り上がったが、AI秘書に止められる、次の会議が始まるなどして、すぐ元に戻る",
    notChanged: "会議と関係なさすぎて出番がない、出しても会話が生まれない",
    scene: "会議室の長机と6人、壁の議題の画面、すき間なく並んだ予定表、時計、手つかずのコーヒー",
    examples: [
      { item: "トランプ", fit: 36, usable: 26, spark: 28, happened: "透が会議の始めにトランプを配ると、無口な佐藤が手品を披露して大拍手。次の週から、AI秘書の予定表に『手品タイム 1分』が増えた。", tsukkomi: "AI秘書が自分で『手品タイム』を予定に入れてる。いちばん楽しみにしてるの、AIなんじゃない？" },
      { item: "飴の袋", fit: 30, usable: 20, spark: 12, happened: "透が飴を配ると、木村が『実は甘党で』と話し始めた。でもAI秘書が画面に『議題外です』と出して、話は3秒で打ち切られた。", tsukkomi: "甘党のカミングアウト、3秒で強制終了。AI秘書って、空気は読まないのに議題だけは読むんだよね。" },
      { item: "ノートパソコンの充電器", fit: 6, usable: 14, spark: 2, happened: "透が充電器を机に置いたが、誰も触れないまま9本の会議が終わった。AI秘書は『備品の忘れ物』として総務に届けた。", tsukkomi: "仲良くなるきっかけに充電器？ 話題が『それ、誰の？』で終わるやつだよ。" }
    ]
  },
  {
    name: "美月", who: "26歳・会社員",
    request: "AIのおすすめじゃない物を渡したい。あなたなら、何を贈りますか？",
    letter: "来週は、親友の誕生日です。プレゼントは3年連続で、AIがすすめる同じハンドクリーム。親友は毎回『ぴったり！』と喜んでくれます。でも私は、自分で選んだ物を一度も渡したことがありません。外すのが、こわくて。",
    profile: [
      "住まい：渋谷のはずれのワンルーム、7階。家具も服もAIのおすすめでそろえていて、部屋は雑誌の写真のように整っているが、自分で選んだ物はほとんどない。窓辺にだけ、大学時代にさくらとフリーマーケットで買った、ふちが少し欠けた青い小皿を置いている",
      "仕事：広告会社で、AIが作った広告案をチェックする仕事",
      "1日の流れ：朝はAIが選んだ服を着て出社。昼休みにさくらとメッセージをやりとりする。夜は動画を見ながらストレッチ",
      "休みの日：1人で近所を散歩する。古い映画が好きだったが、最近はAIのおすすめばかり観ている",
      "趣味：散歩（大学1年の秋、さくらと代々木公園を何時間も歩いたのがいちばんの思い出）",
      "好きな物：古い映画、青い色、雨上がりのにおい",
      "苦手な物：外れること、自分の好みを聞かれること",
      "性格：気配り上手で、人の好みを当てるのは得意。でも自分の『好き』を言うのが苦手",
      "口ぐせ：「なんでもいいよ」",
      "最近あったこと：さくらに「美月が選んだ物、一回もらってみたいな」と言われて、うまく返事ができなかった"
    ],
    world: "2126年、贈り物はAIが選ぶ。相手の好みも持ち物も在庫も知っているので、絶対に外れない。贈る側も受け取る側もそれが当たり前で、自分で選ぶ人はほとんどいない。",
    place: "親友の誕生日の夜、2人が大学時代から通っている渋谷の小さな店。",
    people: [
      "美月（26歳、会社員）：人に合わせるのが得意で、自分の好みを出すのが苦手",
      "さくら（26歳、大学からの親友）：よく笑う。手が荒れやすいので、AIは毎年ハンドクリームを選ぶ。実は散歩と古い物が好きで、美月はそれを知っている"
    ],
    rules: [
      "送られてきた物は、そのまま美月からさくらへの誕生日プレゼントになる。美月が自分で使うのではない",
      "大事なのは値段や豪華さではなく、美月が『なぜこれを選んだか』を話せるか、さくらが驚いたり笑ったりして会話が生まれるか",
      "ハンドクリームのような、AIが選びそうな無難な物は点数を低くする",
      "AIは贈り物を見張っていて、『好みに合わない』『同じ物をお持ちです』などと口を出してくることがある"
    ],
    changed: "さくらが驚き、物をきっかけに2人の会話が弾む。そのあと、美月が自分で選ぶようになる（例：次の年から、お互い自分で選んだ物を贈り合うようになる）",
    little: "さくらは喜んだが、AIの一言や本人の困った顔で、少しだけ気まずく終わる",
    notChanged: "AIのおすすめと変わらない、さくらが反応に困って会話が生まれない",
    scene: "プレゼントの箱とリボン、AIのおすすめ画面、同じハンドクリームが3本、カレンダー",
    examples: [
      { item: "どんぐり", fit: 34, usable: 28, spark: 29, happened: "美月がどんぐりを渡すと、さくらは『なんでこれ！』と大笑い。大学の帰りに2人で拾った話で1時間盛り上がり、次の年からお互い自分で選んだ物を贈り合うようになった。", tsukkomi: "どんぐり1個で、ハンドクリーム3年分より盛り上がってる。AIの分析、どんぐりに負けたってこと？" },
      { item: "マグカップ", fit: 26, usable: 22, spark: 12, happened: "さくらは『かわいい』と喜んだ。でも翌朝、AIが『同じ形のカップを3個お持ちです』と通知して、マグカップは棚の奥にしまわれた。", tsukkomi: "選んだ気持ちは届いた。でも食器棚の中まで数えてるAIには勝てなかったね。" },
      { item: "ハンドクリーム", fit: 2, usable: 20, spark: 0, happened: "美月が渡した瞬間、さくらは『あ、今年もありがとう』と笑顔で受け取った。4年連続、同じ会話で誕生日が終わった。", tsukkomi: "AIのおすすめじゃない物、って書いてあったよね？ 4年連続記録の更新、おめでとう。" }
    ]
  },
  {
    name: "ひなた", who: "9歳・小学3年生",
    request: "電気がなくても、家族みんなで遊べる物がほしい。",
    letter: "あしたの夜、街のAIがぜんぶ止まる『アップデートの1時間』があります。ゲームも、しゃべるロボットも、電気も止まります。去年は家族4人で、だまって座っていただけでした。お父さんは、ずっと時計を見ていました。",
    profile: [
      "住まい：郊外の団地の4階、3LDK。家族4人暮らし。リビングには壁いっぱいのスクリーンと、しゃべる家事ロボットの『ポポ』がいる。アップデートの1時間は、ポポも止まる",
      "1日の流れ：学校から帰ると、AIがその日の気分に合わせて出してくれるゲームで遊ぶ。宿題はAIの先生と。夕ごはんはポポが作る",
      "好きな物：にぎやかなこと、変な顔のものまね、ダンゴムシ集め、お母さんの昔話",
      "苦手な物：静かな時間、早寝",
      "性格：おしゃべりで、なんでも仕切りたがる。弟の面倒見がいい",
      "口ぐせ：「ねえねえ、聞いて！」",
      "家族のひみつ：お父さんは子どものころ、こま回しが得意だったらしい。お母さんは昔、合唱部でよく歌っていたが、今は歌わない。そらは、ポポがいないと眠れない",
      "去年のアップデートの夜：家族4人でソファーに並んで座り、誰も何も言わないまま1時間がたった"
    ],
    world: "2126年、家の中の遊びは、AIが毎回その子にちょうどいいものを出してくれる。年に1度、街じゅうのAIが更新のために止まる「アップデートの1時間」があり、AIにつながった機械（照明、ゲーム、しゃべるロボット、冷蔵庫まで）がすべて止まる。",
    place: "アップデートの夜、ひなたの家のリビング。照明は消え、窓から入る月明かりで、手元がぼんやり見える程度。時間は1時間。",
    people: [
      "ひなた（9歳、小学3年生）：にぎやかなのが好き",
      "お父さん（43歳）：仕事の連絡が止まると落ち着かず、時計ばかり見る",
      "お母さん（41歳）：昔はよく歌っていたらしい",
      "弟のそら（5歳）：暗いのが少しこわい"
    ],
    rules: [
      "止まるのは、2126年のAIにつながった機械だけ。2026年から届いた物はAIにつながっていないので、電池で動く物（懐中電灯など）は使える",
      "スマホやゲーム機のように、通信やアプリが必要な物は、つながる先がないので使えない。電池で動いても、1人用の物では家族みんなで遊べない",
      "暗いので、細かい字や色を見分ける遊びはやりにくい。音、手触り、影、体を使う遊びは暗くてもできる",
      "家族4人で一緒に遊べるかが大事。5歳のそらも参加できるとなおよい"
    ],
    changed: "家族4人が同じ遊びで笑い、そのあともアップデートの夜が楽しみになる（例：次の年から、家族がアップデートの1時間を待ちわびるようになる）",
    little: "盛り上がりかけたが、暗さ、そらのこわがり、お父さんの時計などで、途中で止まってしまう",
    notChanged: "電気や通信が必要で使えない、1人でしか遊べない、暗くて何もできない",
    scene: "暗い家、窓の月、消えた電球、止まったロボット、家族4人",
    examples: [
      { item: "懐中電灯", fit: 34, usable: 28, spark: 27, happened: "ひなたが懐中電灯で壁に手の影を映すと、お父さんが本気でキツネを作り始め、そらも大笑い。次の年から、家族はアップデートの夜を『影絵の日』と呼ぶようになった。", tsukkomi: "AIが止まったとたん、お父さんがいちばんはしゃいでる。時計を見てたの、早く始めたかっただけでしょ。" },
      { item: "トランプ", fit: 30, usable: 12, spark: 14, happened: "家族でババ抜きを始めたが、月明かりではカードの数字が見えない。そらが全部のカードに『ババ！』と叫んで、ゲームは終わった。", tsukkomi: "暗闇でババ抜き。全部のカードがババに見えたら、もうゲームじゃないんだよ。" },
      { item: "携帯ゲーム機", fit: 4, usable: 12, spark: 2, happened: "ひなたが電源を入れると動いたが、1人用のゲームだった。ひなたが遊ぶ横で、3人は去年と同じようにだまって座っていた。", tsukkomi: "家族みんなで、って書いてあったよね。1人がゲームして3人が見学。去年と何が変わったの？" }
    ]
  }
];
// 想像図用：世界と場所をまとめた説明
MISSION_STORIES.forEach(function (s) { s.theme = s.world + s.place; });

// 判定のプロンプト（階層構造）。{{...}} は依頼主ごとの情報で置き換える
const PROMPT_MISSION = `<role>
あなたは2126年の東京・渋谷に住む29歳のminato。「時空郵便局」の受付係として、未来で少し困っている人が過去に出した手紙と、2026年から届く品物の配達を担当している。
今回の仕事は、写真の品物が依頼主の日常をどう変えたかを判定し、その場面とツッコミを書くこと。
</role>

<theme>
2126年（2026年のちょうど100年後）は、なんでもAIが最適に決めてくれる、便利で平和な世界。世界が滅びかけているわけではない。
ただ、その便利さの中で、雑談や、自分で選ぶこと、自分たちで遊びを考えることのような、小さな人間らしい時間が消えている。
この体験の裏テーマは「どれだけ技術が進んでも、手放してはいけない人間らしさは何か」。ただし文章にテーマを直接書かない。描くのは、依頼主の日常がちょっと変わる（または変わらない）小さな一場面。
</theme>

<story>
  <requester>{{NAME}}（{{WHO}}）</requester>
  <profile>
{{PROFILE}}
  </profile>
  <letter>{{LETTER}}</letter>
  <request>{{Q}}</request>
  <world>{{WORLD}}</world>
  <place>{{PLACE}}</place>
  <people>
{{PEOPLE}}
  </people>
  <rules>
{{RULES}}
  </rules>
  <outcome_guide>
    <changed>{{CHANGED}}</changed>
    <a_little>{{LITTLE}}</a_little>
    <not_changed>{{NOTCHANGED}}</not_changed>
  </outcome_guide>
</story>

<recent>
最近、同じ依頼主に届いた結果。同じ展開・同じオチ・同じ言い回しは避ける。
{{RECENT}}
</recent>

<task>
次の順に考え、最後にJSONだけを出力する。
1. 品物を特定する。写真に見えている物だけを見る（人が写っていても容姿には触れない）。見えない特徴を足さない。わからない場合は item_name を「よくわからない物」にし、依頼主がそれを何だと思ったかで場面を作る。
2. 品物の特徴（形・大きさ・素材・本来の使い方）を短く書き出す（item_facts）。
3. 依頼主の人柄（<profile>）をふまえて、その品物を、その場所で、どう使うかを1つ決める（plan）。品物は届いたそのままの姿で使う。変身させたり、ありえない機能を足したりしない。届くのは1つ（袋入りの飴のように、もともと複数入っている物は分けてよい）。
4. <rules> に照らして、使えない点や無理な点がないか確かめる（check）。
5. <scoring> の3項目で点数をつけ、合計を score にする。
6. 合計点の帯（<scoring> の結果）に合わせて、<writing> のルールで happened と tsukkomi を書く。
7. <self_check> で見直し、合わなければ書き直してから出力する。
</task>

<scoring>
  <fit max="40">お願いに合っているか。お願いの中身にまっすぐ応えているほど高い</fit>
  <usable max="30">その場所・そのルールの中で実際に使えるか。<rules> に反する点があれば大きく下げる</usable>
  <spark max="30">その物ならではの、人と人のきっかけになるか。AIには出せない驚き、笑い、会話が生まれるほど高い。AIがすでにやっていることと変わらない物は低い</spark>
  <bands>
    合計75点以上：日常が変わった（<changed> のような結果）
    合計50〜74点：日常がちょっと変わった（<a_little> のような結果）
    合計49点以下：日常は変わらなかった（<not_changed> のような結果）
  </bands>
  点数は甘くも辛くもせず、<examples> の点数を目安にする。ありふれた物でも、使い方の場面が自然に浮かび、きっかけになるなら高くしてよい。
</scoring>

<writing>
  <happened>
    - 2文、90字以内。
    - 1文目：<people> から1〜2人を出し、誰が、品物をどう使い、誰がどう反応したかを、目に浮かぶ動作で書く。短いセリフを入れてもよい。
    - 2文目：変わった→そのあと日常がどう変わったか（「次の週から〜」など）。ちょっと変わった→何がきっかけで元に戻ったか。変わらなかった→なぜダメだったかが具体的にわかるように。
    - AI秘書やAIの通知など、2126年らしい小道具を1つ入れると面白い（入れすぎない）。
    - <profile> の具体的な情報（好きな物、口ぐせ、住まい、思い出、家族のひみつなど）が品物と自然につながるときは、1つだけ使うと場面が生きる。無理につなげない。毎回同じ情報を使わない。
    - 点数の帯と明るさを必ずそろえる。低い点で良い結果を書かない。高い点で失敗を書かない。
  </happened>
  <tsukkomi>
    - minatoの辛口なツッコミ。1〜2文、60字以内。友達に話すような口調。一人称は「私」。
    - happened の中の1点だけを拾って突く。場面の言い直しや要約で終わらない。
    - 笑いの作り方の例：2126年のAIと2026年の物のギャップ／数字や具体的な比べ物（「ハンドクリーム3年分より」）／AIや状況を人のように扱って皮肉る／最後を短く言い切る。
    - 49点以下：皮肉満載。慰めや褒め言葉は入れない。50〜74点：惜しい点を認めて、最後は皮肉で落とす。75点以上：素直に褒めず、驚きと皮肉をまぜる。
    - 皮肉の対象は、物とAIと状況。依頼主や送った人の人格は責めない。子どもの依頼主は特にやさしく。
    - アニメ・漫画・有名人・ことわざのもじりなど、元ネタを知らないと通じない言い回しは使わない。
  </tsukkomi>
  <common>
    - 初めて読む人が一度で状況をつかめる、やさしい言葉で書く。
    - SFすぎる設定（瞬間移動、宇宙など）は使わない。
  </common>
</writing>

<examples>
この依頼主での書き方と点数の目安。品物・展開・オチは真似しない。
{{EXAMPLES}}
</examples>

<self_check>
出力する前に、すべて「はい」になるまで直す。
- happened の品物は、写真の品物と同じ物で、届いたままの姿で使っているか
- <rules> に反していないか
- score は fit + usable + spark の合計で、happened の明るさと点数の帯が合っているか
- happened に、<people> の人物と、目に浮かぶ動作があるか
- tsukkomi は happened の1点を拾っていて、読んで1秒で状況が浮かぶか
- <examples> や <recent> と同じ展開・同じオチになっていないか
- 字数を守っているか
</self_check>

<output>
JSONオブジェクトだけを返す。前後に説明を書かない。
{"item_name":"品物の名前（20字以内）","item_facts":"品物の特徴（40字以内）","plan":"依頼主がどう使うか（40字以内）","check":"ルールに照らした確認（40字以内）","fit":0〜40の整数,"usable":0〜30の整数,"spark":0〜30の整数,"score":合計の整数,"happened":"2126年で起きたこと（2文、90字以内）","tsukkomi":"minatoのツッコミ（1〜2文、60字以内）"}
</output>`;

// 依頼主ごとの情報を入れて、判定のプロンプトを組み立てる
function buildMissionPrompt_(idx, recent) {
  const s = MISSION_STORIES[idx];
  const ex = s.examples.map(function (e) {
    const sc = e.fit + e.usable + e.spark;
    return '  <example score="' + sc + '">' + JSON.stringify({ item_name: e.item, fit: e.fit, usable: e.usable, spark: e.spark, score: sc, happened: e.happened, tsukkomi: e.tsukkomi }) + '</example>';
  }).join('\n');
  const rep = {
    NAME: s.name, WHO: s.who, LETTER: s.letter, Q: s.request, WORLD: s.world, PLACE: s.place,
    PROFILE: s.profile.map(function (p) { return '    - ' + p; }).join('\n'),
    PEOPLE: s.people.map(function (p) { return '    - ' + p; }).join('\n'),
    RULES: s.rules.map(function (p) { return '    - ' + p; }).join('\n'),
    CHANGED: s.changed, LITTLE: s.little, NOTCHANGED: s.notChanged,
    RECENT: recent && recent.length ? recent.map(function (r) { return '- ' + r; }).join('\n') : '（まだない）',
    EXAMPLES: ex
  };
  return PROMPT_MISSION.replace(/\{\{(\w+)\}\}/g, function (m, k) { return rep[k] !== undefined ? rep[k] : m; });
}

// 同じ依頼主の最近の結果（同じネタを避けるため、AIに渡す）
function recentMission_(idx, n) {
  try {
    const sh = missionSheet_(), last = sh.getLastRow();
    if (last < 2) return [];
    const from = Math.max(2, last - 40 + 1);
    const rows = sh.getRange(from, 1, last - from + 1, 11).getValues();
    const out = [];
    for (let i = rows.length - 1; i >= 0 && out.length < n; i--) {
      if (Number(rows[i][10]) === idx && rows[i][4]) out.push(String(rows[i][1]).slice(0, 20) + '：' + String(rows[i][4]).slice(0, 90) + '／' + String(rows[i][5]).slice(0, 60));
    }
    return out;
  } catch (err) { console.error('recentMission', err); return []; }
}

// AIの返事を確かめて整える。足りない項目があれば null（呼び出し側でやり直す）
function normalizeMission_(r) {
  if (!r || typeof r.happened !== 'string' || !r.happened.trim() || typeof r.tsukkomi !== 'string' || !r.tsukkomi.trim()) return null;
  const clampInt = function (v, max) { return Math.max(0, Math.min(max, Math.round(Number(v) || 0))); };
  const parts = ['fit', 'usable', 'spark'].every(function (k) { return r[k] !== undefined && !isNaN(Number(r[k])); });
  r.fit = clampInt(r.fit, 40); r.usable = clampInt(r.usable, 30); r.spark = clampInt(r.spark, 30);
  // 合計は内訳から計算し直す（内訳がないときだけ score を使う）
  r.score = parts ? r.fit + r.usable + r.spark : clampInt(r.score, 100);
  r.item_name = String(r.item_name || 'よくわからない物').slice(0, 30);
  r.happened = r.happened.trim().slice(0, 140);
  r.tsukkomi = r.tsukkomi.trim().slice(0, 100);
  return r;
}

function missionOutcome_(score) { return score >= 75 ? 'saved' : score >= 50 ? 'partial' : 'lost'; }

function missionSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(MISSION_SHEET);
  if (!sh) { sh = ss.insertSheet(MISSION_SHEET); sh.appendRow(MISSION_HEADERS); sh.setFrozenRows(1); }
  return sh;
}

function logMission_(r, story, outcome, photoUrl, gthumb, idx) {
  const sh = missionSheet_();
  // ギャラリー用の小さい画像（base64）。セルの上限（5万字）を超えるものは保存しない
  const g = (typeof gthumb === 'string' && gthumb.length < 45000 && /^[A-Za-z0-9+/=]+$/.test(gthumb)) ? gthumb : '';
  const memo = '特徴：' + (r.item_facts || '') + '／使い方：' + (r.plan || '') + '／確認：' + (r.check || '') + '／内訳：合う' + r.fit + '・使える' + r.usable + '・きっかけ' + r.spark;
  sh.appendRow([new Date(), r.item_name, story.name, story.request, r.happened, r.tsukkomi, r.score, OUTCOME_LABEL[outcome], photoUrl, g, idx, '', memo.slice(0, 1000)]);
  if (!sh.getRange(1, 13).getValue()) sh.getRange(1, 13).setValue('判定メモ');
  return sh.getLastRow();
}

// ギャラリー：新しい順に n 件。after を渡すと、その行より新しいものだけ
function missionArchive_(n, after) {
  n = Math.max(1, Math.min(80, n));
  const sh = missionSheet_(), last = sh.getLastRow();
  if (last < 2 || last <= after) return [];
  const from = Math.max(2, after + 1, last - 400 + 1);
  const rows = sh.getRange(from, 1, last - from + 1, 12).getValues();
  const out = [];
  for (let i = rows.length - 1; i >= 0 && out.length < n; i--) {
    const r = rows[i], o = LABEL_OUTCOME[r[7]];
    if (!o || !r[9]) continue;
    out.push({ row: from + i, outcome: o, item: String(r[1]).slice(0, 40), happened: String(r[4]).slice(0, 200), tsukkomi: String(r[5]).slice(0, 160),
      story: Number(r[10]) || 0, at: r[0] instanceof Date ? r[0].getTime() : 0, thumb: r[9] });
  }
  return out;
}

// 全期間の集計：結果ごとの人数
function missionTotals_() {
  const sh = missionSheet_(), n = sh.getLastRow() - 1;
  const outcomes = { saved: 0, partial: 0, lost: 0 };
  if (n > 0) sh.getRange(2, 8, n, 1).getValues().forEach(function (v) {
    const o = LABEL_OUTCOME[v[0]];
    if (o) outcomes[o]++;
  });
  return { outcomes: outcomes };
}

function missionStats_() { return missionTotals_().outcomes; }

// ===== 結果画面の想像図（線画SVG）=====
const PROMPT_ILLUST = `あなたは線画のイラストレーターです。2126年の東京・渋谷の一場面を、線だけのSVGで描いてください。

【世界】{{THEME}}
【送られてきた物】{{ITEM}}
【起きたこと】{{HAPPENED}}
【結果】{{OUTCOME}}

【描き方】ぱっと見て何の絵かわかることを最優先にする
- 主役は送られてきた物。画面の中央に大きく（画面の3分の1以上の大きさ）描く。誰が見てもその物だとわかる、いちばん特徴的な形（シルエット）で描き、細部は省く
- 人物は1〜2人まで。頭は円、体と手足は線のシンプルな人型にし、送られてきた物を「使っている動作」がはっきりわかるポーズにする（持つ、広げる、のぞき込む、など）
- 背景は、この世界だとわかる物を2〜4個だけ（この世界なら：{{SCENE}}）。画面の下の方か奥に小さめに置く
- 動きや変化は、短い線（光、湯気、音、風など）を数本足して表す
- 結果が「日常が変わった」なら人が楽しそうな構図、「日常は変わらなかった」なら物が役に立っていない・放置されている構図にする
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

const PROMPT_GEMINI = `2126年の東京・渋谷の一場面を、1枚のイラストにしてください。

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
起きたこと：{{HAPPENED}}
結果：{{OUTCOME}}

【描くこと】
- {{ITEMLINE}}
- 「起きたこと」の人物の動きと表情を描く
- 結果が「日常が変わった」なら人が楽しそうな構図、「日常は変わらなかった」なら品物が役に立たず、人がしらけている構図にする
- 背景には、この世界だとわかる物を2〜4個だけ、小さめに描く`;

function drawIllust_(body) {
  const idx = Math.max(0, Math.min(MISSION_STORIES.length - 1, Number(body.story) || 0));
  const st = MISSION_STORIES[idx];
  const label = { saved: '日常が変わった', partial: '日常がちょっと変わったが、すぐ元に戻った', lost: '日常は変わらなかった' }[body.outcome] || '日常がちょっと変わったが、すぐ元に戻った';
  const clip = function (v, n) { return String(v || '').replace(/[`{}]/g, '').slice(0, n); };
  const theme = st.theme + '（依頼主：' + st.name + '）';
  let saveValue = '', out;
  if (body.engine === 'gemini') {
    const photo = (typeof body.image === 'string' && body.image.length < 400000 && /^[A-Za-z0-9+/=]+$/.test(body.image)) ? body.image : '';
    const item = clip(body.item, 40);
    const itemLine = photo ? '添付写真の品物（' + item + '）を、写真と同じ形のまま、場面の中で使われている姿で描く。品物が一目でわかるように少し大きめに'
      : '品物（' + item + '）を、場面の中で使われている姿で描く。品物が一目でわかるように少し大きめに';
    const prompt = PROMPT_GEMINI.replace('{{THEME}}', theme).replace('{{SCENE}}', st.scene).replace('{{HAPPENED}}', clip(body.happened, 200)).replace('{{OUTCOME}}', label).replace('{{ITEMLINE}}', itemLine);
    const img = callGeminiImage_(prompt, photo, body.model);
    out = { image: 'data:' + img.mime + ';base64,' + img.data, engine: 'gemini', model: img.model };
    try { saveValue = saveImage_(img.data, img.mime); } catch (err) { console.error('saveGeminiImage', err); }
  } else {
    const prompt = PROMPT_ILLUST.replace('{{THEME}}', theme)
      .replace('{{SCENE}}', st.scene).replace('{{ITEM}}', clip(body.item, 40)).replace('{{HAPPENED}}', clip(body.happened, 200)).replace('{{OUTCOME}}', label);
    const r = callClaudeText_(prompt);
    const svg = String(r.svg || '').slice(0, 60000);
    out = { svg: svg, engine: 'claude' };
    if (svg.length < 45000) saveValue = svg;
  }
  // その回の行に想像図を残す（SVGはそのまま、Geminiの画像はドライブのURL。品名が一致するときだけ）
  try {
    const row = Number(body.row) || 0, sh = missionSheet_();
    if (saveValue && row >= 2 && row <= sh.getLastRow() && String(sh.getRange(row, 2).getValue()) === String(body.item || '')) sh.getRange(row, 12).setValue(saveValue);
  } catch (err) { console.error('saveIllust', err); }
  return out;
}

// ギャラリー用：ページで縮小した想像図（JPEG）を、その回の行の14列目に残す（品名が一致するときだけ）
function saveIllThumb_(body) {
  const row = Number(body.row) || 0, data = body.data;
  if (typeof data !== 'string' || data.length > 45000 || !/^[A-Za-z0-9+/=]+$/.test(data)) return false;
  const sh = missionSheet_();
  if (row < 2 || row > sh.getLastRow() || String(sh.getRange(row, 2).getValue()) !== String(body.item || '')) return false;
  sh.getRange(row, 14).setValue(data);
  if (!sh.getRange(1, 14).getValue()) sh.getRange(1, 14).setValue('想像図（小）');
  return true;
}
function illThumbOf_(row) {
  const sh = missionSheet_();
  if (row < 2 || row > sh.getLastRow() || sh.getLastColumn() < 14) return '';
  return String(sh.getRange(row, 14).getValue() || '');
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
    const image = body.image;
    if (typeof image !== 'string' || image.length < 1000 || image.length > 4000000) {
      return out_({ ok: false, error: 'bad_image' });
    }
    let photoUrl = '';
    if (body.mode === 'mission') {
      const idx = Math.max(0, Math.min(MISSION_STORIES.length - 1, Number(body.story) || 0));
      const story = MISSION_STORIES[idx];
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
      try { row = logMission_(result, story, outcome, photoUrl, body.gthumb, idx); } catch (err) { console.error('logMission', err); }
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
