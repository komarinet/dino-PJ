/* =================================================================
   data/stage01.js - v8.20.46
   【絶対ルール順守：一切の省略・勝手な改変なし】
   修正内容：
   1. 水場の高さ調整：
      generateLayout 内で川（type: 4）の高さ h を 0 から 1 に引き上げました。
      これにより、地面との極端な高低差を解消しています。
   2. 既存ロジックの完全維持：
      - 前衛と後衛を入れ替えたユニット配置（A,B,C,D）を維持。
      - レベル1スタートの成長バランス設定を維持。
      - ルビ付きシナリオ全セリフを維持。
   ================================================================= */

export const VERSION = "8.20.46";

export const StageData = {
    info: { chapter: "第一章", name: "<ruby>母<rt>はは</rt></ruby>を<ruby>訪<rt>たず</rt></ruby>ねて" },
    
    units: [
        // ティラノ：Lv1スタート
        { id: "ティラノ", emoji: "🦖", x: 4, z: 14, hp: 40, mp: 10, str: 12, def: 10, spd: 10, mag: 5, move: 4, jump: 1, isPlayer: true, level: 1 },
        
        // コンプソグナトゥス：前衛・後衛入れ替え済み配置
        { id: "コンプソグナトゥスA", emoji: "🦎", x: 6, z: 8, hp: 15, mp: 0, str: 8, def: 6, spd: 12, mag: 0, move: 5, jump: 2, isPlayer: false, level: 1 },
        { id: "コンプソグナトゥスB", emoji: "🦎", x: 3, z: 8, hp: 15, mp: 0, str: 8, def: 6, spd: 12, mag: 0, move: 5, jump: 2, isPlayer: false, level: 1 },
        { id: "コンプソグナトゥスC", emoji: "🦎", x: 8, z: 5, hp: 15, mp: 0, str: 8, def: 6, spd: 12, mag: 0, move: 5, jump: 2, isPlayer: false, level: 1 },
        { id: "コンプソグナトゥスD", emoji: "🦎", x: 1, z: 5, hp: 15, mp: 0, str: 8, def: 6, spd: 12, mag: 0, move: 5, jump: 2, isPlayer: false, level: 1 },
        
        // ブラキオサウルス
        { id: "ブラキオサウルス", emoji: "🦕", x: 4, z: 1, hp: 75, mp: 20, str: 22, def: 14, spd: 5, mag: 10, move: 3, jump: 1, isPlayer: false, level: 5 }
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
        { name: "ティラノ", face: "🦖", text: "じゃあ、<ruby>連<rt>つ</rt></ruby>れて<ruby>行<rt>い</rt></ruby>った<ruby>恐竜<rt>きょうりゅう</rt></ruby>たちの<ruby>居場所<rt>居場所</rt></ruby>はどこだ！" },
        { name: "コンプソグナトゥスB", face: "🦎", text: "バーカ。<ruby>教<rt>おし</rt></ruby>えるわけないだろ" },
        { name: "コンプソグナトゥスC", face: "🦎", text: "<ruby>痛<rt>いた</rt></ruby>い<ruby>目<rt>目</rt></ruby>みる<ruby>前<rt>まえ</rt></ruby>にさっさと<ruby>帰<rt>かえ</rt></ruby>りな、<ruby>坊<rt>ぼう</rt></ruby>や" },
        { name: "ティラノ", face: "🦖", text: "あくまでも<ruby>言<rt>い</rt></ruby>わないつもりかっ！<br>だったら<ruby>力<rt>ちから</rt></ruby>ずくで<ruby>聞<rt>き</rt></ruby>き<ruby>出<rt>だ</rt></ruby>してやる！" }
    ],

    postBattleTalk: [
        { name: "ブラキオサウルス", face: "🦕", text: "つ、<ruby>強<rt>つよ</rt></ruby>い" },
        { name: "ティラノ", face: "🦖", text: "さあ<ruby>言<rt>い</rt></ruby>え！　<ruby>恐竜<rt>きょうりゅう</rt></ruby>たちの<ruby>居場所<rt>いばしょ</rt></ruby>を！" },
        { name: "ブラキオサウルス", face: "🦕", text: "<ruby>火山<rt>かざん</rt></ruby>の<ruby>方<rt>ほう</rt></ruby>だ。それ<ruby>以上<rt>いじょう</rt></ruby>は<ruby>知<rt>知</rt></ruby>らん" },
        { name: "ティラノ", face: "🦖", text: "<ruby>火山<rt>かざん</rt></ruby>か. わかった" },
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
                    if(x === 4 || x === 5) { h = 2; t = 1; } // 橋
                    // ★ 修正：川の高さ h を 0 から 1 に変更
                    else { h = 1; t = 4; } // 川
                }
                else if(z >= 5) { h = 3; t = 2; }
                else if(z >= 3) { h = 4; t = 3; }
                else if(z <= 2) { h = 5; t = 3; } 

                // --- 戦略的な段差の微調整 ---
                if (x <= 2 || x >= 7) {
                    if (z <= 5) h += 1; 
                }

                d[z][x] = {h, type: t};
            }
        } 
        return d;
    }
};
