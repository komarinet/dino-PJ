window.StageData = {
    info: {
        chapter: "第一章",
        name: "<ruby>母<rt>はは</rt></ruby>を<ruby>訪<rt>たず</rt></ruby>ねて"
    },

    // ★ユニットにレベル(level)を追加、敵を追加配置
    // ティラノはLv4以上にならないとブラキオ（DEF 15）にまともなダメージが通らない設定
    units: [
        { id: "ティラノ", emoji: "🦖", x: 12, z: 15, hp: 30, mp: 10, str: 10, def: 8, spd: 5, mag: 5, move: 4, jump: 3, isPlayer: true, level: 1 },
        { id: "コンプソグナトゥスA", emoji: "🦎", x: 10, z: 10, hp: 15, mp: 0, str: 8, def: 5, spd: 6, mag: 0, move: 5, jump: 4, isPlayer: false, level: 1 },
        { id: "コンプソグナトゥスB", emoji: "🦎", x: 14, z: 10, hp: 15, mp: 0, str: 8, def: 5, spd: 6, mag: 0, move: 5, jump: 4, isPlayer: false, level: 1 },
        { id: "コンプソグナトゥスC", emoji: "🦎", x: 9, z: 6, hp: 15, mp: 0, str: 8, def: 5, spd: 6, mag: 0, move: 5, jump: 4, isPlayer: false, level: 1 },
        { id: "コンプソグナトゥスD", emoji: "🦎", x: 15, z: 6, hp: 15, mp: 0, str: 8, def: 5, spd: 6, mag: 0, move: 5, jump: 4, isPlayer: false, level: 1 },
        { id: "ブラキオサウルス", emoji: "🦕", x: 12, z: 3, hp: 60, mp: 10, str: 20, def: 15, spd: 4, mag: 2, move: 4, jump: 2, isPlayer: false, level: 5 }
    ],

    // ★戦闘前シナリオ：ルビ付き新バージョン★
    preBattleTalk: [
        { name: "ティラノ", face: "🦖", text: "<ruby>探<rt>さが</rt></ruby>したぞッ！　お<ruby>前<rt>まえ</rt></ruby>たちが『ブラキーズ』か！" },
        { name: "コンプソグナトゥスA", face: "🦎", text: "なんだァ、お<ruby>前<rt>まえ</rt></ruby>" },
        { name: "ティラノ", face: "🦖", text: "お<ruby>前<rt>まえ</rt></ruby>たちに<ruby>連<rt>つ</rt></ruby>れさらわれたティラノサウルスの<ruby>息子<rt>むすこ</rt></ruby>だ。<br>お<ruby>母<rt>かあ</rt></ruby>さんをどこに<ruby>連<rt>つ</rt></ruby>れて<ruby>行<rt>い</rt></ruby>った！" },
        { name: "ブラキオサウルス", face: "🦕", text: "ふん。我らが<ruby>毎日何頭<rt>まいにちなんとう</rt></ruby>の<ruby>恐竜<rt>きょうりゅう</rt></ruby>を<ruby>攫<rt>さら</rt></ruby>ってると思(おも)う？" },
        { name: "ブラキオサウルス", face: "🦕", text: "お<ruby>前<rt>まえ</rt></ruby>の<ruby>母親<rt>ははおや</rt></ruby>などいちいち<ruby>覚<rt>おぼ</rt></ruby>えておらんわ" },
        { name: "ティラノ", face: "🦖", text: "じゃあ、<ruby>連<rt>つ</rt></ruby>れて<ruby>行<rt>い</rt></ruby>った<ruby>恐竜<rt>きょうりゅう</rt></ruby>たちの<ruby>居場所<rt>いばしょ</rt></ruby>はどこだ！" },
        { name: "コンプソグナトゥスB", face: "🦎", text: "バーカ。<ruby>教<rt>おし</rt></ruby>えるわけないだろ" },
        { name: "コンプソグナトゥスC", face: "🦎", text: "<ruby>痛<rt>いた</rt></ruby>い<ruby>目<rt>め</rt></ruby><ruby>見<rt>み</rt></ruby>る<ruby>前<rt>まえ</rt></ruby>にさっさと<ruby>帰<rt>かえ</rt></ruby>りな、<ruby>坊<rt>ぼう</rt></ruby>や" },
        { name: "ティラノ", face: "🦖", text: "あくまでも<ruby>言<rt>い</rt></ruby>わないつもりかっ！<br>だったら<ruby>力<rt>ちから</rt></ruby>ずくで<ruby>聞<rt>き</rt></ruby>き<ruby>出<rt>だ</rt></ruby>してやる！" }
    ],

    // 【戦闘後】
    postBattleTalk: [
        { name: "ブラキオサウルス", face: "🦕", text: "つ、<ruby>強<rt>つよ</rt></ruby>い" },
        { name: "ティラノ", face: "🦖", text: "さあ<ruby>言<rt>い</rt></ruby>え！　<ruby>恐竜<rt>きょうりゅう</rt></ruby>たちの<ruby>居場所<rt>いばしょ</rt></ruby>を！" },
        { name: "ブラキオサウルス", face: "🦕", text: "か、<ruby>火山<rt>かざん</rt></ruby>の<ruby>方<rt>ほう</rt></ruby>だ。それ<ruby>以上<rt>いじょう</rt></ruby>は<ruby>知<rt>し</rt></ruby>らん" },
        { name: "ティラノ", face: "🦖", text: "<ruby>火山<rt>かざん</rt></ruby>か。わかった" },
        { name: "ブラキオサウルス", face: "🦕", text: "<ruby>命<rt>いのち</rt></ruby>だけは<ruby>助<rt>たす</rt></ruby>けてくれ" },
        { name: "ティラノ", face: "🦖", text: "お<ruby>前<rt>まえ</rt></ruby>の<ruby>命<rt>いのち</rt></ruby>なんか、<ruby>興味<rt>きょうみ</rt></ruby>ない" },
        { name: "ティラノ", face: "🦖", text: "<ruby>僕<rt>ぼく</rt></ruby>はお<ruby>母<rt>かあ</rt></ruby>さんを<ruby>助<rt>たす</rt></ruby>けたいだけだ" },
        { name: "ブラキオサウルス", face: "🦕", text: "<ruby>母親<rt>ははおや</rt></ruby>か・・・" }
    ],

    generateLayout: function() {
        let data = [];
        for (let z = 0; z < window.MAP_D; z++) {
            data[z] = [];
            for (let x = 0; x < window.MAP_W; x++) {
                let h = 2; let type = 0;
                if (z >= 16) { h = 0; type = 4; }
                if (z < 16) { h = 2; type = 0; }
                if (z < 14) { h = 3; }
                if (z <= 10) { h = 5; type = 5; }
                if (z <= 6) { h = 7; type = 5; }
                if (z <= 3 && x >= 8 && x <= 16) { h = 9; type = 3; }
                if (x >= 11 && x <= 13) {
                    if (z === 11) { h = 4; type = 3; }
                    if (z === 10) { h = 5; type = 3; }
                    if (z === 7)  { h = 6; type = 3; }
                    if (z === 6)  { h = 7; type = 3; }
                }
                if (z === 15) { h = 1; type = 2; }
                data[z][x] = { h, type };
            }
        }
        return data;
    }
};
