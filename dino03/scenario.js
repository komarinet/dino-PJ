export const VERSION = "8.15.0";
export const StageData = {
    info: { chapter: "第一章", name: "<ruby>母<rt>はは</rt></ruby>を<ruby>訪<rt>たず</rt></ruby>ねて" },
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
        { name: "コンプソグナトゥスA", face: "🦎", text: "なんだァ、お前" },
        { name: "ティラノ", face: "🦖", text: "お前たちに連れさらわれたティラノサウルスの息子だ。<br>お母さんをどこに連れて行った！" },
        { name: "ブラキオサウルス", face: "🦕", text: "ふん。我らが毎日何頭の恐竜を攫ってると思う？" },
        { name: "ブラキオサウルス", face: "🦕", text: "お前の母親などいちいち覚えておらんわ" },
        { name: "ティラノ", face: "🦖", text: "じゃあ、連れて行った恐竜たちの居場所はどこだ！" },
        { name: "コンプソグナトゥスB", face: "🦎", text: "バーカ。教えるわけないだろ" },
        { name: "コンプソグナトゥスC", face: "🦎", text: "痛い目見る前にさっさと帰りな、坊や" },
        { name: "ティラノ", face: "🦖", text: "あくまでも言わないつもりかっ！<br>だったら力ずくで聞き出してやる！" }
    ],
    postBattleTalk: [
        { name: "ブラキオサウルス", face: "🦕", text: "つ、強い" },
        { name: "ティラノ", face: "🦖", text: "さあ言え！　恐竜たちの居場所を！" },
        { name: "ブラキオサウルス", face: "🦕", text: "か、火山の方だ。それ以上は知らん" },
        { name: "ティラノ", face: "🦖", text: "火山か。わかった" },
        { name: "ブラキオサウルス", face: "🦕", text: "命だけは助けてくれ" },
        { name: "ティラノ", face: "🦖", text: "お前の命なんか、興味ない" },
        { name: "ティラノ", face: "🦖", text: "僕はお母さんを助けたいだけだ" },
        { name: "ブラキオサウルス", face: "🦕", text: "母親か・・・" }
    ],
    generateLayout: function() {
        let d = []; for(let z=0;z<25;z++){ d[z]=[]; for(let x=0;x<25;x++){
            let h=2, t=0; if(z>=16){ h=0; t=4; } if(z<16)h=2; if(z<14)h=3; if(z<=10){h=5;t=5;} if(z<=6){h=7;t=5;}
            if(z<=3 && x>=8 && x<=16){h=9;t=3;} if(x>=11&&x<=13){ if(z===11)h=4; if(z===10)h=5; if(z===7)h=6; if(z===6)h=7; t=3;}
            if(z===15){h=1;t=2;} d[z][x]={h,type:t};
        }} return d;
    }
};
