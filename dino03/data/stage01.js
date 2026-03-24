/* =================================================================
   data/stage01.js - v8.20.21
   修正・統合内容：
   1. シナリオ復元：ルビ付きの「母を訪ねて」全セリフを完全復元。
   2. ユニット設定：ティラノ(1)、ブラキオ(1)、コンプ(2)のジャンプ力を適用。
   3. マップ構造：v8.20.7の「川と橋」を維持しつつ、ティラノがボスの元へ
      辿り着けるよう、中央ルートの段差を1段ずつに調整。
   ================================================================= */

export const VERSION = "8.20.21";

export const StageData = {
    info: { chapter: "第一章", name: "<ruby>母<rt>はは</rt></ruby>を<ruby>訪<rt>たず</rt></ruby>ねて" },
    
    units: [
        { id: "ティラノ", emoji: "🦖", x: 4, z: 14, hp: 100, mp: 20, str: 25, def: 15, spd: 12, mag: 5, move: 4, jump: 1, isPlayer: true, level: 5 },
        { id: "コンプソグナトゥスA", emoji: "🦎", x: 1, z: 5, hp: 30, mp: 10, str: 10, def: 8, spd: 15, mag: 2, move: 5, jump: 2, isPlayer: false, level: 3 },
        { id: "コンプソグナトゥスB", emoji: "🦎", x: 8, z: 5, hp: 30, mp: 10, str: 10, def: 8, spd: 15, mag: 2, move: 5, jump: 2, isPlayer: false, level: 3 },
        { id: "コンプソグナトゥスC", emoji: "🦎", x: 3, z: 8, hp: 30, mp: 10, str: 10, def: 8, spd: 15, mag: 2, move: 5, jump: 2, isPlayer: false, level: 3 },
        { id: "コンプソグナトゥスD", emoji: "🦎", x: 6, z: 8, hp: 30, mp: 10, str: 10, def: 8, spd: 15, mag: 2, move: 5, jump: 2, isPlayer: false, level: 3 },
        { id: "ブラキオサウルス", emoji: "🦕", x: 4, z: 1, hp: 250, mp: 50, str: 35, def: 40, spd: 5, mag: 20, move: 3, jump: 1, isPlayer: false, level: 10 }
    ],
    
    obstacles: [
        { x: 1, z: 12, type: 'tree' }, { x: 8, z: 12, type: 'tree' },
        { x: 2, z: 10, type: 'tree' }, { x: 7, z: 10, type: 'tree' },
        { x: 1, z: 6, type: 'rock' },  { x: 8, z: 6, type: 'rock' },
        { x: 3, z: 3, type: 'rock' },  { x: 6, z: 3, type: 'rock' }
    ],

    preBattleTalk: [
        { name: "ティラノ", face: "🦖", text: "<ruby>探<rt>さが</rt></ruby>したぞッ！　お<ruby>前<rt>まえ</rt></ruby>たちが『ブラキーズ』か！" },
        { name: "コンプソグナトゥスA", face: "🦎", text: "なんだァ、お<ruby>前<rt>まえ</rt></ruby>" },
        { name: "ティラノ", face: "🦖", text: "お<ruby>前<rt>まえ</rt></ruby>たちに<ruby>連<rt>つ</rt></ruby>れさらわれたティラノサウルスの<ruby>息子<rt>むすこ</rt></ruby>だ。<br>お<ruby>母<rt>かあ</rt></ruby>さんをどこに<ruby>連<rt>つ</rt></ruby>れて<ruby>行<rt>い</rt></ruby>った！" },
        { name: "ブラキオサウルス", face: "🦕", text: "ふん。我らが<ruby>毎日<rt>まいにち</rt></ruby><ruby>何頭<rt>なんとう</rt></ruby>の<ruby>恐竜<rt>きょうりゅう</rt></ruby>を<ruby>攫<rt>さら</rt></ruby>ってると思う？" },
        { name: "ブラキオサウルス", face: "🦕", text: "お<ruby>前<rt>まえ</rt></ruby>の<ruby>母親<rt>ははおや</rt></ruby>などいちいち<ruby>覚<rt>おぼ</rt></ruby>えておらんわ" },
        { name: "ティラノ", face: "🦖", text: "じゃあ、<ruby>連<rt>つ</rt></ruby>れて<ruby>行<rt>い</rt></ruby>った<ruby>恐竜<rt>きょうりゅう</rt></ruby>たちの<ruby>居場所<rt>いばしょ</rt></ruby>はどこだ！" },
        { name: "コンプソグナトゥスB", face: "🦎", text: "バーカ。<ruby>教<rt>おし</rt></ruby>えるわけないだろ" },
        { name: "コンプソグナトゥスC", face: "🦎", text: "<ruby>痛<rt>いた</rt></ruby>い<ruby>目<rt>め</rt></ruby>みる<ruby>前<rt>まえ</rt></ruby>にさっさと<ruby>帰<rt>かえ</rt></ruby>りな、<ruby>坊<rt>ぼう</rt></ruby>や" },
        { name: "ティラノ", face: "🦖", text: "あくまでも<ruby>言<rt>い</rt></ruby>わないつもりかっ！<br>だったら<ruby>力<rt>ちから</rt></ruby>ずくで<ruby>聞<rt>き</rt></ruby>き<ruby>出<rt>だ</rt></ruby>してやる！" }
    ],

    postBattleTalk: [
        { name: "ブラキオサウルス", face: "🦕", text: "つ、<ruby>強<rt>つよ</rt></ruby>い" },
        { name: "ティラノ", face: "🦖", text: "さあ<ruby>言<rt>い</rt></ruby>え！　<ruby>恐竜<rt>きょうりゅう</rt></ruby>たちの<ruby>居場所<rt>いばしょ</rt></ruby>を！" },
        { name: "ブラキオサウルス", face: "🦕", text: "<ruby>火山<rt>かざん</rt></ruby>の<ruby>方<rt>ほう</rt></ruby>だ。それ<ruby>以上<rt>いじょう</rt></ruby>は<ruby>知<rt>知</rt></ruby>らん" },
        { name: "ティラノ", face: "🦖", text: "<ruby>火山<rt>かざん</rt></ruby>か。わかった" },
        { name: "ブラキオサウルス", face: "🦕", text: "<ruby>命<rt>いのち</rt></ruby>だけは<ruby>助<rt>たす</rt></ruby>けてくれ" },
        { name: "ティラノ", face: "🦖", text: "お<ruby>前<rt>まえ</rt></ruby>の<ruby>命<rt>いのち</rt></ruby>なんか、<ruby>興味<rt>きょうみ</rt></ruby>ない" },
        { name: "ティラノ", face: "🦖", text: "<ruby>僕<rt>ぼく</rt></ruby>はお<ruby>母<rt>かあ</rt></ruby>さんを<ruby>助<rt>たす</rt></ruby>けたいだけだ" },
        { name: "ブラキオサウルス", face: "🦕", text: "<ruby>母親<rt>ははおや</rt></ruby>か・・・" }
    ],
    
    generateLayout: function() {
        let d = []; 
        for(let z=0; z<15; z++){
            d[z]=[]; 
            for(let x=0; x<10; x++){
                let h=1, t=0;
                
                // --- 高さの基本設計 ---
                if(z >= 12) { h = 1; t = 0; }
                else if(z >= 9) { h = 2; t = 1; }
                else if(z === 8 || z === 7) {
                    // 川と橋のロジック
                    if(x === 4 || x === 5) { h = 2; t = 1; } // 橋
                    else { h = 0; t = 4; } // 川
                }
                else if(z >= 5) { h = 3; t = 2; } // 1段ずつ登るように調整
                else if(z >= 3) { h = 4; t = 3; }
                else if(z <= 2) { h = 5; t = 3; } 

                // --- 戦略的な段差の微調整 ---
                // 中央ルート (x=4,5) はティラノが登れる「1段差」階段
                // 左右の崖はコンプだけが登れる「2段差」にする
                if (x <= 2 || x >= 7) {
                    if (z <= 5) h += 1; // 端の方は段差が急になる
                }

                d[z][x] = {h, type: t};
            }
        } 
        return d;
    }
};
