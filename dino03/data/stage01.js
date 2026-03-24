export const VERSION = "8.19.0";

export const StageData = {
    info: { chapter: "第一章", name: "<ruby>母<rt>はは</rt></ruby>を<ruby>訪<rt>たず</rt></ruby>ねて" },
    
    // ★ 変更：マップ縮小に伴う初期座標(x,z)の調整と、Jump力(登れる段差)の差別化
    units: [
        { id: "ティラノ", emoji: "🦖", x: 4, z: 14, hp: 30, mp: 10, str: 10, def: 8, spd: 5, mag: 5, move: 4, jump: 1, isPlayer: true, level: 1 },
        { id: "コンプソグナトゥスA", emoji: "🦎", x: 1, z: 5, hp: 15, mp: 0, str: 8, def: 5, spd: 6, mag: 0, move: 5, jump: 2, isPlayer: false, level: 1 },
        { id: "コンプソグナトゥスB", emoji: "🦎", x: 8, z: 5, hp: 15, mp: 0, str: 8, def: 5, spd: 6, mag: 0, move: 5, jump: 2, isPlayer: false, level: 1 },
        { id: "コンプソグナトゥスC", emoji: "🦎", x: 3, z: 8, hp: 15, mp: 0, str: 8, def: 5, spd: 6, mag: 0, move: 5, jump: 2, isPlayer: false, level: 1 },
        { id: "コンプソグナトゥスD", emoji: "🦎", x: 6, z: 8, hp: 15, mp: 0, str: 8, def: 5, spd: 6, mag: 0, move: 5, jump: 2, isPlayer: false, level: 1 },
        { id: "ブラキオサウルス", emoji: "🦕", x: 4, z: 1, hp: 60, mp: 10, str: 20, def: 15, spd: 4, mag: 2, move: 3, jump: 1, isPlayer: false, level: 5 }
    ],
    
    // ★ 追加：木や岩を配置する障害物データ
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
        { name: "ブラキオサウルス", face: "🦕", text: "<ruby>火山<rt>かざん</rt></ruby>の<ruby>方<rt>ほう</rt></ruby>だ。それ<ruby>以上<rt>いじょう</rt></ruby>は<ruby>知<rt>し</rt></ruby>らん" },
        { name: "ティラノ", face: "🦖", text: "<ruby>火山<rt>かざん</rt></ruby>か。わかった" },
        { name: "ブラキオサウルス", face: "🦕", text: "<ruby>命<rt>いのち</rt></ruby>だけは<ruby>助<rt>たす</rt></ruby>けてくれ" },
        { name: "ティラノ", face: "🦖", text: "お<ruby>前<rt>まえ</rt></ruby>の<ruby>命<rt>いのち</rt></ruby>なんか、<ruby>興味<rt>きょうみ</rt></ruby>ない" },
        { name: "ティラノ", face: "🦖", text: "<ruby>僕<rt>ぼく</rt></ruby>はお<ruby>母<rt>かあ</rt></ruby>さんを<ruby>助<rt>たす</rt></ruby>けたいだけだ" },
        { name: "ブラキオサウルス", face: "🦕", text: "<ruby>母親<rt>ははおや</rt></ruby>か・・・" }
    ],
    
    // ★ 変更：10x15マスの新地形。川と橋、最大高さ10の崖を配置
    generateLayout: function() {
        let d = []; 
        for(let z=0; z<15; z++){ // 奥行き(Z)は15
            d[z]=[]; 
            for(let x=0; x<10; x++){ // 幅(X)は10
                let h=1, t=0; // デフォルト：高さ1、草原(0)
                
                // ティラノのスタート地点周辺
                if(z >= 12) { h = 1; t = 0; }
                else if(z >= 9) { h = 2; t = 1; } // 土の丘
                
                // 中央を分断する「川」と「橋」
                else if(z === 8 || z === 7) {
                    if(x === 4 || x === 5) { h = 2; t = 1; } // 橋（土）
                    else { h = 0; t = 4; } // 深い川（水場）
                }
                
                // 川を越えた先の敵陣（徐々に高くなる）
                else if(z >= 5) { h = 4; t = 2; } // 苔の岩場
                else if(z >= 3) { h = 7; t = 3; } // 岩場
                
                // ボス周辺の最奥地（高さ10の崖）
                else if(z <= 2) { h = 10; t = 3; } 

                // コンプが登れるように、崖の両脇に「階段状の岩」を配置
                if((z === 4 || z === 5) && (x === 1 || x === 8)) { h = 6; t = 3; }
                if(z === 3 && (x === 1 || x === 8)) { h = 8; t = 3; }

                d[z][x] = {h, type: t};
            }
        } 
        return d;
    }
};
