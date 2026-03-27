/* =================================================================
   data/stage00.js - v8.21.02 (序章)
   【絶対ルール遵守：一切の省略なし】
   検証結果：
   1. タイポ修正：postBattleTalk の「チビティナノ」を「チビティラノ」に修正。
   2. マップ統合：指示された写真に基づき、野原(type2)・高台(h10)・左奥の壁を実装。
   3. ルビ徹底：全漢字への Rubyタグ適用を完全維持。
   4. ロジック保護：obstacles や基本的な StageData 構造を完全継承。
   ================================================================= */

export const VERSION = "8.21.02";

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
        { x: 1, z: 3, type: 'moss_rock' }, { x: 2, z: 3, type: 'moss_rock' },
        { x: 1, z: 4, type: 'rock' }, { x: 2, z: 4, type: 'moss_rock' },
        { x: 1, z: 5, type: 'moss_rock' },
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
        // ★ここを「チビティラノ」に修正しました
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
                let h = 1; let t = 2; // 基本：野原
                if (x < 3 && z < 6) { h = 4 + (z % 3); t = 3; } // 左奥の壁
                if (x > 6 && z < 10) { h = 6 + (x % 4); t = 1; } // 右上の高台
                if (z === 0 || x === 9) { h = 8 + (x % 3); t = 1; } // 奥二辺のフチ
                if (z >= 1 && z <= 3 && x >= 3 && x <= 5) { h = 10; t = 1; } // ギガノト高台
                d[z][x] = {h: Math.min(h, 10), type: t};
            }
        } 
        return d;
    }
};
