export const VERSION = "8.20.6";
export const StageData = {
    info: { chapter: "第1章", name: "ちびっこティラノ、<br>草原の王への第一歩" },
    generateLayout: () => {
        const layout = [];
        for (let z = 0; z < 15; z++) {
            const row = [];
            for (let x = 0; x < 10; x++) {
                let h = 0, type = 0;
                if (z >= 5 && z <= 8) { h = -1; type = 4; }
                else if (z >= 9) { h = 2; type = 1; if (z === 9 && (x === 4 || x === 5)) h = 1; }
                if ((z >= 5 && z <= 8) && (x === 4 || x === 5)) { h = 0; type = 0; }
                row.push({ h, type });
            }
            layout.push(row);
        }
        return layout;
    },
    units: [
        { id: 'ティラノ', emoji: '🦖', x: 4, z: 2, hp: 50, mp: 20, str: 15, def: 10, spd: 5, mag: 5, move: 4, jump: 1, isPlayer: true, level: 5 },
        { id: 'ブラキオサウルス', emoji: '🦕', x: 5, z: 12, hp: 200, mp: 50, str: 20, def: 15, spd: 3, mag: 10, move: 2, jump: 1, isPlayer: false, level: 10 },
        { id: 'コンプA', emoji: '🦎', x: 2, z: 10, hp: 25, mp: 10, str: 8, def: 5, spd: 7, mag: 3, move: 5, jump: 2, isPlayer: false, level: 3 },
        { id: 'コンプB', emoji: '🦎', x: 7, z: 10, hp: 25, mp: 10, str: 8, def: 5, spd: 7, mag: 3, move: 5, jump: 2, isPlayer: false, level: 3 },
        { id: 'コンプC', emoji: '🦎', x: 3, z: 13, hp: 25, mp: 10, str: 8, def: 5, spd: 7, mag: 3, move: 5, jump: 2, isPlayer: false, level: 3 },
        { id: 'コンプD', emoji: '🦎', x: 6, z: 13, hp: 25, mp: 10, str: 8, def: 5, spd: 7, mag: 3, move: 5, jump: 2, isPlayer: false, level: 3 }
    ],
    obstacles: [
        { x: 2, z: 2, type: 'tree' }, { x: 7, z: 3, type: 'tree' },
        { x: 1, z: 11, type: 'rock' }, { x: 8, z: 11, type: 'rock' },
        { x: 0, z: 6, type: 'rock' }, { x: 9, z: 7, type: 'rock' }
    ],
    preBattleTalk: [
        { id: "ブラキオサウルス", text: "ふん、ちびっこがこの地を支配しようなどと……片腹痛いわ！" },
        { id: "ティラノ", text: "ちびっこって言うな！僕が草原の王になるんだ！" },
        { id: "ブラキオサウルス", text: "なら、その牙で証明してみせよ。コンプたち、教育してやれ！" }
    ]
};
