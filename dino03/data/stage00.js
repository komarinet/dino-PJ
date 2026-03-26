/* =================================================================
   data/stage00.js - v8.20.87 (序章)
   【絶対ルール順守：一切の省略・勝手な改変なし】
   修正内容：
   1. 視認性改善：手前二辺の壁を完全に撤去(h=1)し、奥二辺のみ高さを維持。
   2. 地形変更：床面をすべて「土壌(type:0)」に統一。岩ベースを廃止。
   3. ルビ精密修正：「来<rt>き</rt>」「感<rt>かん</rt>じんな」等を完全反映。
   4. 演出維持：画面揺れ、体当たり、合体アニメ、戦闘中台詞、displayName分離を完備。
   ================================================================= */

export const VERSION = "8.20.87";

export const StageData = {
    // ステージ情報
    info: { chapter: "序章", name: "消えた<ruby>温<rt>ぬく</rt></ruby>もり" },
    
    units: [
        { id: "ティラノ", displayName: "チビティラノ", emoji: "🦖", x: 4, z: 12, hp: 30, mp: 5, str: 8, def: 6, spd: 8, mag: 2, move: 4, jump: 1, isPlayer: true, level: 1 },
        { id: "ママティラノ", emoji: "🦖", x: 5, z: 10, hp: 120, mp: 30, str: 35, def: 25, spd: 12, mag: 15, move: 4, jump: 1, isPlayer: true, level: 10 },
        { id: "ギガノトサウルス", emoji: "🐊", x: 4, z: 2, hp: 500, mp: 50, str: 100, def: 100, spd: 15, mag: 30, move: 5, jump: 2, isPlayer: false, level: 20 }
    ],
    
    // オブジェクトとしての岩（土壌タイルの上に配置）
    obstacles: [
        { x: 1, z: 3, type: 'rock' }, { x: 8, z: 3, type: 'rock' },
        { x: 2, z: 5, type: 'rock' }, { x: 7, z: 5, type: 'rock' },
        { x: 0, z: 8, type: 'rock' }, { x: 9, z: 8, type: 'rock' },
        { x: 3, z: 13, type: 'rock' }, { x: 6, z: 13, type: 'rock' }
    ],

    // 戦闘前会話
    preBattleTalk: [
        { name: "ママティラノ", text: "<ruby>上手<rt>じょうず</rt></ruby>に<ruby>狩<rt>か</rt></ruby>りの<ruby>練習<rt>れんしゅう</rt></ruby>ができたわね、<ruby>坊<rt>ぼう</rt></ruby>や。" },
        { name: "チビティラノ", text: "へへ。お<ruby>母<rt>かあ</rt></ruby>さんにほめられた！<br>もっともっと<ruby>強<rt>つよ</rt></ruby>くなって、お<ruby>母<rt>かあ</rt></ruby>さんを<ruby>守<rt>まも</rt></ruby>ってあげるんだ！" },
        { name: "ママティラノ", text: "うふふ、<ruby>頼<rt>たの</rt></ruby>もしいわね。<ruby>明日<rt>あした</rt></ruby>はもっと<ruby>遠<rt>とお</rt></ruby>くの<ruby>岩場<rt>いわば</rt></ruby>まで<ruby>行<rt>い</rt></ruby>ってみましょう..." },
        { name: "チビティラノ", text: "...？ なんだか<ruby>地面<rt>じめん</rt></ruby>がゆれてる...？", action: "shake" },
        { name: "ママティラノ", text: "...！ <ruby>坊<rt>ぼう</rt></ruby>や、<ruby>私<rt>わたし</rt></ruby>の<ruby>後<rt>うしろ</rt></ruby>に！" },
        { name: "ギガノトサウルス", text: "<ruby>くっくっく<rt>クックック</rt></ruby>...。<ruby>噂<rt>うわさ</rt></ruby><ruby>通<rt>どお</rt></ruby>りの<ruby>上玉<rt>じょうだま</rt></ruby>だ。" },
        { name: "ママティラノ", text: "お<ruby>前<rt>まえ</rt></ruby>は...！ <ruby>峡谷<rt>きょうこく</rt></ruby>の<ruby>暴君<rt>ぼうくん</rt></ruby>、ギガノトサウルス！<br><ruby>私<rt>わたし</rt></ruby>の<ruby>子供<rt>こども</rt></ruby>には<ruby>手<rt>て</rt></ruby>をださせないッ！" },
        { name: "ギガノトサウルス", text: "ほう、<ruby>威勢<rt>いせい</rt></ruby>がいい。<br>だが、オレ<ruby>様<rt>さま</rt></ruby>が<ruby>用<rt>よう</rt></ruby>があるのはそのチビではなく、お<ruby>前<rt>まえ</rt></ruby>の<ruby>方<rt>ほう</rt></ruby>だ。" },
        { name: "ママティラノ", text: "なんですって...？" },
        { name: "ギガノトサウルス", text: "オレ<ruby>様<rt>さま</rt></ruby>の<ruby>コレクション<rt>コレクション</rt></ruby>に<ruby>加<rt>くわ</rt></ruby>えてやる。<ruby>光栄<rt>こうえい</rt></ruby>に<ruby>思<rt>おも</rt></ruby>え。" },
        { name: "チビティラノ", text: "お、お<ruby>母<rt>かあ</rt></ruby>さんは<ruby>渡<rt>わた</rt></ruby>さないぞッ！！" },
        { name: "ママティラノ", text: "<ruby>坊<rt>ぼう</rt></ruby>や、ダメ！ <ruby>下<rt>さ</rt></ruby>がりなさい！" }
    ],

    // 戦闘中の特殊割り込み
    midBattleTalk: {
        mamaDown: { name: "チビティラノ", text: "お<ruby>母<rt>かあ</rt></ruby>さん！ よくもお<ruby>母<rt>かあ</rt></ruby>さんを！" },
        chibiDown: { name: "ママティラノ", text: "<ruby>坊<rt>ぼう</rt></ruby>や！ よくも<ruby>私<rt>わたし</rt></ruby>の<ruby>子供<rt>こども</rt></ruby>を！ <ruby>許<rt>ゆる</rt></ruby>さない！" }
    },

    // 戦闘後会話
    postBattleTalk: [
        { name: "ママティラノ", text: "う、うう...。<ruby>強<rt>つよ</rt></ruby>すぎる..." },
        { name: "チビティラノ", text: "お・・・かあ・・・さん！" },
        { name: "ギガノトサウルス", text: "<ruby>決着<rt>けっちゃく</rt></ruby>だな。さあ、<ruby>来<rt>き</rt></ruby>てもらおうか。" },
        { name: "チビティラノ", text: "うおおおおッ！ お<ruby>母<rt>かあ</rt></ruby>さんをはなせぇッ！！！", action: "body_slam_start" },
        { name: "ギガノトサウルス", text: "......<ruby>蚊<rt>か</rt></ruby>に<ruby>刺<rt>さ</rt></ruby>されたほどにも<ruby>感<rt>かん</rt></ruby>じんな。<ruby>邪魔<rt>じゃま</rt></ruby>だ、<ruby>失<rt>う</rt></ruby>せろ。" },
        { name: "チビティラノ", text: "ぐはッ......！" },
        { name: "ママティラノ", text: "<ruby>坊<rt>ぼう</rt></ruby>や！ ...<ruby>坊<rt>ぼう</rt></ruby>や、<ruby>生<rt>い</rt></ruby>きるのよ...。<ruby>必<rt>かなら</rt></ruby>ず...！" },
        { name: "ギガノトサウルス", text: "<ruby>無駄<rt>むだ</rt></ruby>な<ruby>会話<rt>かいわ</rt></ruby>は<ruby>終<rt>お</rt></ruby>わりだ。<ruby>行<rt>い</rt></ruby>くぞ。" },
        { name: "チビティラノ", text: "<ruby>待<rt>ま</rt></ruby>って......！ <ruby>待<rt>ま</rt></ruby>ってよぉ......ッ！" },
        { name: "チビティラノ", text: "お<ruby>母<rt>かあ</rt></ruby>さぁぁぁぁぁぁぁぁぁぁぁん！！！！！！！！" }
    ],
    
    // 10x15の視認性特化マップ生成
    generateLayout: function() {
        let d = []; 
        for(let z=0; z<15; z++){
            d[z]=[]; 
            for(let x=0; x<10; x++){
                let h=1; 
                // --- 視認性向上のための高度設計 ---
                // 奥二辺 (x=0付近 または z=0付近) だけ高さを出して「峡谷感」を出す
                if (x <= 1 || z <= 1) {
                    h = 6; 
                } else if (x <= 2 || z <= 2) {
                    h = 3; // 段差で緩やかに繋ぐ
                } else {
                    // それ以外（手前側）はフラットな地面とし、ユニットを隠さない
                    h = 1;
                }

                // type は常に 0 (土壌チップ)
                d[z][x] = {h, type: 0};
            }
        } 
        return d;
    }
};
