/* =================================================================
   data/stage00.js - v8.20.62 (序章)
   【絶対ルール順守：一切の省略・勝手な改変なし】
   内容：第1話の前日譚を描くプロローグステージ。
   1. マップ：10✕15マスの峡谷（岩場・高低差あり）。
   2. イベント：母子の平穏な日常にギガノトが現れ、母親を連れ去る。
   3. ユニットバランス：ギガノトサウルスはチビティラノでは打つ手がない圧倒的な強さに設定。
   4. シナリオ：全セリフにRubyタグ（ルビ）を完備。
   ================================================================= */

export const VERSION = "8.20.62";

export const StageData = {
    // ステージ情報：序章
    info: { chapter: "序章", name: "消えた<ruby>温<rt>ぬく</rt></ruby>もり" },
    
    units: [
        // チビティラノ（プレイヤー）：第1話よりさらに未熟な状態 (Str:8, Def:6)
        { id: "チビティラノ", emoji: "🦖", x: 4, z: 12, hp: 30, mp: 5, str: 8, def: 6, spd: 8, mag: 2, move: 4, jump: 1, isPlayer: true, level: 1 },
        
        // 母ティラノ（NPC/味方）：非常に強力だが、ギガノトには及ばない設定
        { id: "母ティラノ", emoji: "🦖", x: 5, z: 10, hp: 120, mp: 30, str: 35, def: 25, spd: 12, mag: 15, move: 4, jump: 1, isPlayer: true, level: 10 },
        
        // ギガノトサウルス（敵/ボス）：Invincibleに近い圧倒的なステータス (Def:100はチビでは貫通不能)
        { id: "ギガノトサウルス", emoji: "🐊", x: 4, z: 2, hp: 500, mp: 50, str: 100, def: 100, spd: 15, mag: 30, move: 5, jump: 2, isPlayer: false, level: 20 }
    ],
    
    // 岩場を中心とした障害物配置
    obstacles: [
        { x: 1, z: 3, type: 'rock' }, { x: 8, z: 3, type: 'rock' },
        { x: 2, z: 5, type: 'rock' }, { x: 7, z: 5, type: 'rock' },
        { x: 0, z: 8, type: 'rock' }, { x: 9, z: 8, type: 'rock' },
        { x: 3, z: 13, type: 'rock' }, { x: 6, z: 13, type: 'rock' }
    ],

    // 戦闘前会話（イベントカットシーン）
    preBattleTalk: [
        { name: "母ティラノ", face: "🦖", text: "<ruby>上手<rt>じょうず</rt></ruby>に<ruby>狩<rt>か</rt></ruby>りの<ruby>練習<rt>れんしゅう</rt></ruby>ができたわね、<ruby>坊<rt>ぼう</rt></ruby>や。" },
        { name: "チビティラノ", face: "🦖", text: "へへ。お<ruby>母<rt>かあ</rt></ruby>さんにほめられた！<br>もっともっと<ruby>強<rt>つよ</rt></ruby>くなって、お母さんを<ruby>守<rt>まも</rt></ruby>ってあげるんだ！" },
        { name: "母ティラノ", face: "🦖", text: "うふふ、頼もしいわね。<ruby>明日<rt>あした</rt></ruby>はもっと<ruby>遠<rt>とお</rt></ruby>くの岩場まで行ってみましょう..." },
        { name: "システム", face: "🌐", text: "（……<ruby>不穏<rt>ふおん</rt></ruby>な<ruby>地鳴<rt>じな</rt></ruby>りが<ruby>峡谷<rt>きょうこく</rt></ruby>に<ruby>響<rt>ひび</rt></ruby>く……）" },
        { name: "母ティラノ", face: "🦖", text: "...！ 坊や、私の後ろに！" },
        { name: "ギガノトサウルス", face: "🐊", text: "<ruby>くっくっく<rt>クックック</rt></ruby>...。<ruby>噂<rt>うわさ</rt></ruby>通りの<ruby>上玉<rt>じょうだま</rt></ruby>だ。" },
        { name: "母ティラノ", face: "🦖", text: "お<ruby>前<rt>まえ</rt></ruby>は...！ 峡谷の<ruby>暴君<rt>ぼうくん</rt></ruby>、ギガノトサウルス！<br>私の<ruby>子供<rt>こども</rt></ruby>には<ruby>手<rt>手</rt></ruby>をさせないッ！" },
        { name: "ギガノトサウルス", face: "🐊", text: "ほう、<ruby>威勢<rt>いせい</rt></ruby>がいい。<br>だが、オレ様が<ruby>用<rt>よう</rt></ruby>があるのはそのチビではなく、お<ruby>前<rt>まえ</rt></ruby>の方だ。" },
        { name: "母ティラノ", face: "🦖", text: "なんですって...？" },
        { name: "ギガノトサウルス", face: "🐊", text: "オレ様の<ruby>コレクション<rt>コレクション</rt></ruby>に<ruby>加<rt>くわ</rt></ruby>えてやる。<ruby>光栄<rt>こうえい</rt></ruby>に思え。" },
        { name: "チビティラノ", face: "🦖", text: "お、お<ruby>母<rt>かあ</rt></ruby>さんは<ruby>渡<rt>わた</rt></ruby>さないぞッ！！" },
        { name: "母ティラノ", face: "🦖", text: "坊や、ダメ！ 下がりなさい！" }
    ],

    // 戦闘後会話（母親連れ去りイベント・GAME OVERではなく Chapter1へ移行する演出）
    postBattleTalk: [
        { name: "母ティラノ", face: "🦖", text: "う、うう...。<ruby>強<rt>つよ</rt></ruby>すぎる..." },
        { name: "チビティラノ", face: "🦖", text: "お<ruby>母<rt>かあ</rt></ruby>さん！" },
        { name: "ギガノトサウルス", face: "🐊", text: "<ruby>決着<rt>けっちゃく</rt></ruby>だな。さあ、<ruby>来<rt>こ</rt></ruby>てもらおうか。" },
        { name: "システム", face: "🌐", text: "（ギガノトサウルスが母ティラノの<ruby>首筋<rt>くびすじ</rt></ruby>を<ruby>捉<rt>とら</rt></ruby>える）" },
        { name: "チビティラノ", face: "🦖", text: "うおおおおッ！ お<ruby>母<rt>かあ</rt></ruby>さんをはなせぇッ！！！" },
        { name: "システム", face: "🌐", text: "（チビティラノが<ruby>渾身<rt>こんしん</rt></ruby>の<ruby>力<rt>ちから</rt></ruby>でギガノトに体当たりするが、<ruby>岩<rt>いわ</rt></ruby>のように<ruby>動<rt>うご</rt></ruby>かない）" },
        { name: "ギガノトサウルス", face: "🐊", text: "......<ruby>蚊<rt>か</rt></ruby>に<ruby>刺<rt>さ</rt></ruby>されたほどにも感じんな。<ruby>邪魔<rt>じゃま</rt></ruby>だ、<ruby>失<rt>う</rt></ruby>せろ。" },
        { name: "システム", face: "🌐", text: "（ギガノトサウルスの<ruby>尻尾<rt>しっぽ</rt></ruby>の一撃で、チビティラノは<ruby>彼方<rt>かなた</rt></ruby>へ吹き飛ばされる）" },
        { name: "チビティラノ", face: "🦖", text: "ぐはッ......！" },
        { name: "母ティラノ", face: "🦖", text: "坊や！ ...坊や、生きるのよ...。必ず...！" },
        { name: "ギガノトサウルス", face: "🐊", text: "<ruby>無駄<rt>むだ</rt></ruby>な<ruby>会話<rt>かいわ</rt></ruby>は終わりだ。行くぞ。" },
        { name: "システム", face: "🌐", text: "（ギガノトサウルスは母ティラノを<ruby>引きずり<rt>ひきずり</rt></ruby>ながら、峡谷の奥へと消えていった）" },
        { name: "チビティラノ", face: "🦖", text: "<ruby>待<rt>ま</rt></ruby>って......！ 待ってよぉ......ッ！" },
        { name: "チビティラノ", face: "🦖", text: "お母さぁぁぁぁぁぁぁぁぁぁぁん！！！！！！！！" },
        { name: "システム", face: "🌐", text: "（峡谷にチビティラノの<ruby>悲痛<rt>ひつう</rt></ruby>な叫びが<ruby>虚<rt>むな</rt></ruby>しく<ruby>響<rt>ひび</rt></ruby>き<ruby>渡<rt>わた</rt></ruby>った……）" },
        { name: "システム", face: "🌐", text: "（そして……<ruby>数年<rt>すうねん</rt></ruby>の<ruby>月日<rt>つきひ</rt></ruby>が<ruby>流<rt>なが</rt></ruby>れた……）" }
    ],
    
    // 10x15の岩場峡谷マップ生成
    generateLayout: function() {
        let d = []; 
        for(let z=0; z<15; z++){
            d[z]=[]; 
            for(let x=0; x<10; x++){
                let h=1, t=3; // 基本は岩場 (t=3)

                // --- 高さの設計：谷間の遊び場 ---
                // マップの中心付近 (x:3-6, z:9-12) は母子の遊び場として低く、砂地にする
                if(x >= 3 && x <= 6 && z >= 9 && z <= 12) {
                    h = 1; t = 0; // 砂地
                }
                // 周囲は切り立った岩壁にしていく
                else if (x <= 1 || x >= 8 || z <= 2 || z >= 14) {
                    h = 6; // 最外周は非常に高い壁
                }
                else if (x <= 2 || x >= 7 || z <= 4 || z >= 13) {
                    h = 4; // その内側は中程度の壁
                }
                else {
                    h = 2; // それ以外は少し高い岩場
                }

                // --- 戦略的な段差の微調整 ---
                // 遊び場から岩場へ出るための緩やかな傾斜
                if (z === 8 && x === 5) h = 1; 

                d[z][x] = {h, type: t};
            }
        } 
        return d;
    }
};
