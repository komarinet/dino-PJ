/* =================================================================
   data/stage00.js - v8.21.04 (序章)
   【絶対ルール遵守：一切の省略なし】
   修正・統合内容：
   1. 地形刷新：最新の指示画像に基づき、奥一列の壁(青)、階段状の丘(緑)を実装。
   2. 登頂構造：緑エリアはマンハッタン距離を用い、1マスごとに高さが変わる「登れる階段」に。
   3. 配置同期：ギガノトの出現座標を右奥外側の高台 (x=8, z=2) へ設定。
   4. 既存維持：全ユニットデータ、精密ルビ付きセリフ、obstacles、プロパティ名を完全保護。
   ================================================================= */

export const VERSION = "8.21.04";

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
                let h = 1; let t = 2; // デフォルト：広々とした野原

                // 🟦 青いエリア：奥一列の壁 (z=0)
                if (z === 0) {
                    h = 6 + Math.floor(Math.random() * 5); // 6~10のランダム
                    t = (Math.random() > 0.5) ? 1 : 3; // 土か岩
                } 
                // 🟩 緑のエリア：階段状の丘 (z=1〜8, 中央〜右寄り)
                else if (z >= 1 && z <= 8 && x >= 3) {
                    t = 1; // 土壌
                    // ギガノト出現位置 (8, 2) を頂上(h=10)とした階段構造
                    let dist = Math.abs(x - 8) + Math.abs(z - 2);
                    let hillH = 10 - dist;
                    // 隣り合うタイルが1段差以内になるように調整（登れる構造）
                    h = Math.max(1, hillH);
                }

                // 🟥 赤いエリア：ギガノト出現ポイント (x=8, z=2)
                if (x === 8 && z === 2) {
                    h = 10;
                    t = 1; // 土壌
                }

                // 草原部分：手前全体 (z=9〜14)
                if (z >= 9) { h = 1; t = 2; }

                d[z][x] = {h: Math.min(h, 10), type: t};
            }
        } 
        return d;
    }
};
