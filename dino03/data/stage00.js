/* =================================================================
   data/stage00.js - v8.21.03 (序章)
   【絶対ルール遵守：一切の省略なし】
   修正・統合内容：
   1. 地形刷新：指示に基づき「左上」と「右上」に高低差を集中。手前をひらけた野原に。
   2. 階段構造：右上の高台を、頂上(h=10)へ向けて1段ずつランダムに登れる階段状に再設計。
   3. タイポ修正：postBattleTalk の「チビティナノ」を「チビティラノ」へ完全修正。
   4. 既存維持：ユニット配置、全ルビ設定、obstacles、関数構造を完全保護。
   ================================================================= */

export const VERSION = "8.21.03";

export const StageData = {
    info: { 
        chapter: "<ruby>序章<rt>じょしょう</rt></ruby>", 
        name: "<ruby>消<rt>き</rt></ruby>えた<ruby>温<rt>ぬく</rt></ruby>もり" 
    },
    units: [
        { id: "ティラノ", displayName: "チビティラノ", emoji: "🦖", x: 4, z: 12, hp: 30, mp: 5, str: 8, def: 6, spd: 8, mag: 2, move: 4, jump: 1, isPlayer: true, level: 1 },
        { id: "ママティラノ", emoji: "🦖", x: 5, z: 10, hp: 120, mp: 30, str: 35, def: 25, spd: 12, mag: 15, move: 4, jump: 1, isPlayer: true, level: 10 },
        { id: "コンプソグナトゥス", emoji: "🦎", x: 4, z: 10, hp: 10, mp: 0, str: 1, def: 1, spd: 5, mag: 1, move: 3, jump: 1, isPlayer: false, level: 1 }
    ],
    obstacles: [
        { x: 1, z: 2, type: 'moss_rock' }, { x: 2, z: 1, type: 'moss_rock' },
        { x: 1, z: 4, type: 'rock' }, { x: 8, z: 4, type: 'rock' },
        { x: 3, z: 13, type: 'rock' }, { x: 6, z: 13, type: 'rock' }
    ],
    preBattleTalk: [
        { name: "チビティラノ", text: "お<ruby>母<rt>かあ</rt></ruby>さん、<ruby>見<rt>み</rt></ruby>てて！" },
        { name: "ママティラノ", text: "ええ、<ruby>見<rt>み</rt></ruby>てるわ。" },
        { name: "チビティラノ", text: "<ruby>食<rt>た</rt></ruby>べちゃうぞー！ ガオー！" },
        { name: "ママティラノ", text: "ふふ、もう<ruby>立派<rt>りっぱ</rt></ruby>なハンターね。" },
        { name: "ママティラノ", text: "...！ <ruby>坊<rt>ぼう</rt></ruby>や、<ruby>離<rt>はな</rt></ruby>れないで。" },
        { name: "ギガノトサウルス", text: "...<ruby>見付<rt>みつ</rt></ruby>けたぞ。" }
    ],
    postBattleTalk: [
        { name: "ギガノトサウルス", text: "お<ruby>前<rt>まえ</rt></ruby>、<ruby>私<rt>わたし</rt></ruby>のコレクションにさせてもらうぞ" },
        { name: "チビティラノ", text: "うおおおおッ！ お<ruby>母<rt>かあ</rt></ruby>さんをはなせぇッ！！！" },
        { name: "ギガノトサウルス", text: "......<ruby>蚊<rt>か</rt></ruby>に<ruby>刺<rt>さ</rt></ruby>されたほどにも<ruby>感<rt>かん</rt></ruby>じんな。<ruby>邪魔<rt>じゃま</rt></ruby>だ、<ruby>失<rt>う</rt></ruby>せろ。" },
        { name: "チビティラノ", text: "ぐはッ......！" },
        { name: "ママティラノ", text: "<ruby>坊<rt>ぼう</rt></ruby>や！" },
        { name: "ギガノトサウルス", text: "お<ruby>前<rt>まえ</rt></ruby>はこっちだ。<ruby>行<rt>い</rt></ruby>くぞ" },
        { name: "チビティラノ", text: "<ruby>待<rt>ま</rt></ruby>って......！...お<ruby>母<rt>かあ</rt></ruby>さん......！！" }
    ],
    generateLayout: function() {
        let d = []; 
        for(let z=0; z<15; z++){
            d[z]=[]; 
            for(let x=0; x<10; x++){
                let h = 1; let t = 2; // デフォルトはひらけた野原

                // A. 左上の壁（Back-Left）
                if (x <= 3 && z <= 5) {
                    h = 6; t = 3; // 苔岩の壁
                }

                // B. 右上の階段高台（Back-Right）
                // 右端(x=9)かつ奥(z=0)に向けて高くなる
                if (x >= 5 && z <= 7) {
                    t = 1; // 土壌
                    // 右上(x=9, z=0)からの距離で高さを計算
                    let distToSummit = (9 - x) + z; 
                    // 頂上(h=10)から、距離1につき「ほぼ1段」下げる
                    // ランダム要素(Math.random)を入れて、1段ずつかつ不規則な階段に
                    let stepH = 10 - distToSummit;
                    if (Math.random() > 0.7) stepH -= 1; // 30%の確率で少し低くして不規則さを出す
                    h = Math.max(1, stepH);
                }

                // C. ギガノト出現ポイントの足場保証 (x=8, z=2)
                if (x === 8 && z === 2) { h = 10; t = 1; }

                // D. 手前（親子練習場）の見やすさ確保
                if (z >= 9) { h = 1; t = 2; }

                d[z][x] = {h: Math.min(h, 10), type: t};
            }
        } 
        return d;
    }
};
