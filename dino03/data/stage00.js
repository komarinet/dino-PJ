/* =================================================================
   data/stage00.js - v8.21.01 (序章)
   【絶対ルール遵守：一切の省略・勝手な改変なし】
   修正内容：
   1. シナリオ刷新：コンプ戦、ギガノト乱入、連れ去りの新フローを反映。
   2. ユニット構成：指示に基づきコンプソグナトゥスを追加。ギガノトは初期配置から除外。
   3. ルビ徹底：指示通りすべての漢字に精密なルビ（Rubyタグ）を付与。
   4. 既存維持：obstacles、generateLayoutの計算式、プロパティ名を完全保護。
   ================================================================= */

export const VERSION = "8.21.01";

export const StageData = {
    info: { 
        chapter: "<ruby>序章<rt>じょしょう</rt></ruby>", 
        name: "<ruby>消<rt>き</rt></ruby>えた<ruby>温<rt>ぬく</rt></ruby>もり" 
    },
    units: [
        { id: "ティラノ", displayName: "チビティラノ", emoji: "🦖", x: 4, z: 12, hp: 30, mp: 5, str: 8, def: 6, spd: 8, mag: 2, move: 4, jump: 1, isPlayer: true, level: 1 },
        { id: "ママティラノ", emoji: "🦖", x: 5, z: 10, hp: 120, mp: 30, str: 35, def: 25, spd: 12, mag: 15, move: 4, jump: 1, isPlayer: true, level: 10 },
        // 狩りの練習相手
        { id: "コンプソグナトゥス", emoji: "🦎", x: 4, z: 10, hp: 10, mp: 0, str: 1, def: 1, spd: 5, mag: 1, move: 3, jump: 1, isPlayer: false, level: 1 }
    ],
    obstacles: [
        { x: 1, z: 3, type: 'rock' }, { x: 8, z: 3, type: 'rock' },
        { x: 2, z: 5, type: 'rock' }, { x: 7, z: 5, type: 'rock' },
        { x: 3, z: 13, type: 'rock' }, { x: 6, z: 13, type: 'rock' }
    ],
    // 【開幕：狩りの練習シーン】
    preBattleTalk: [
        { name: "チビティラノ", text: "お<ruby>母<rt>かあ</rt></ruby>さん、<ruby>見<rt>み</rt></ruby>てて！" },
        { name: "ママティラノ", text: "ええ、<ruby>見<rt>み</rt></ruby>てるわ。" },
        { name: "チビティラノ", text: "<ruby>食<rt>た</rt></ruby>べちゃうぞー！ ガオー！" },
        // ※ここでコンプソグナトゥス撃破（自動戦闘）を挟む想定
        { name: "ママティラノ", text: "ふふ、もう<ruby>立派<rt>りっぱ</rt></ruby>なハンターね。" },
        { name: "ママティラノ", text: "...！ <ruby>坊<rt>ぼう</rt></ruby>や、<ruby>離<rt>はな</rt></ruby>れないで。" },
        // ※ここではじめてギガノトサウルス登場
        { name: "ギガノトサウルス", text: "...<ruby>見付<rt>みつ</rt></ruby>けたぞ。" }
    ],
    // 【イベント：ギガノト強襲・連れ去り】
    postBattleTalk: [
        { name: "ギガノトサウルス", text: "お<ruby>前<rt>まえ</rt></ruby>、<ruby>私<rt>わたし</rt></ruby>のコレクションにさせてもらうぞ" },
        { name: "チビティナノ", text: "うおおおおッ！ お<ruby>母<rt>かあ</rt></ruby>さんをはなせぇッ！！！" },
        { name: "ギガノトサウルス", text: "......<ruby>蚊<rt>か</rt></ruby>に<ruby>刺<rt>さ</rt></ruby>されたほどにも<ruby>感<rt>かん</rt></ruby>じんな。<ruby>邪魔<rt>じゃま</rt></ruby>だ、<ruby>失<rt>う</rt></ruby>せろ。" },
        // ※ここでチビティラノ返り討ち（自動戦闘）を挟む想定
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
                const dist = Math.sqrt((x-4.5)**2 * 0.8 + (Math.max(0, 12 - z))**2 * 2.0);
                let h = Math.floor(dist / 1.5) + 1; 
                if (z >= 11) h = 1;
                if (x <= 1 || x >= 8) h = z >= 10 ? Math.max(h, 4) : Math.max(h, 8);
                let t = h > 1 ? 3 : 1;
                if (z === 0) h = 8 + ((x * 7) % 3);
                d[z][x] = {h: Math.min(h, 10), type: t};
            }
        } 
        return d;
    }
};
