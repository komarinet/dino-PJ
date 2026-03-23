export const VERSION = "8.16.0";

export const StageData = {
    info: { chapter: "第一章", name: "母を訪ねて" },
    units: [
        { id: "ティラノ", emoji: "🦖", x: 12, z: 15, hp: 30, mp: 10, str: 10, def: 8, spd: 5, mag: 5, move: 4, jump: 3, isPlayer: true, level: 1 },
        { id: "コンプソグナトゥスA", emoji: "🦎", x: 10, z: 10, hp: 15, mp: 0, str: 8, def: 5, spd: 6, mag: 0, move: 5, jump: 4, isPlayer: false, level: 1 },
        { id: "コンプソグナトゥスB", emoji: "🦎", x: 14, z: 10, hp: 15, mp: 0, str: 8, def: 5, spd: 6, mag: 0, move: 5, jump: 4, isPlayer: false, level: 1 },
        { id: "コンプソグナトゥスC", emoji: "🦎", x: 9, z: 6, hp: 15, mp: 0, str: 8, def: 5, spd: 6, mag: 0, move: 5, jump: 4, isPlayer: false, level: 1 },
        { id: "コンプソグナトゥスD", emoji: "🦎", x: 15, z: 6, hp: 15, mp: 0, str: 8, def: 5, spd: 6, mag: 0, move: 5, jump: 4, isPlayer: false, level: 1 },
        { id: "ブラキオサウルス", emoji: "🦕", x: 12, z: 3, hp: 60, mp: 10, str: 20, def: 15, spd: 4, mag: 2, move: 4, jump: 2, isPlayer: false, level: 5 }
    ],
    preBattleTalk: [
        { name: "ティラノ", face: "🦖", text: "探したぞッ！　お前たちが『ブラキーズ』か！" },
        { name: "ブラキオサウルス", face: "🦕", text: "ふん。我らが毎日何頭の恐竜を攫ってると思う？" },
        { name: "ティラノ", face: "🦖", text: "お母さんをどこに連れて行った！" },
        { name: "ブラキオサウルス", face: "🦕", text: "力ずくで聞き出してみるがいい！" }
    ],
    generateLayout: function() {
        let d = []; 
        for (let z = 0; z < 25; z++) {
            d[z] = [];
            for (let x = 0; x < 25; x++) {
                let h = 2, t = 0;
                if (z >= 16) { h = 0; t = 4; }
                if (z <= 6) { h = 5; t = 5; }
                if (z <= 3 && x >= 8 && x <= 16) { h = 9; t = 3; }
                d[z][x] = { h, type: t };
            }
        }
        return d;
    }
};
