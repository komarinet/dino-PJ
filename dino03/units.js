class Unit {
    constructor(id, emoji, x, z, hp, mp, str, def, spd, mag, move, jump, isPlayer) {
        this.id = id; this.emoji = emoji;
        this.x = x; this.z = z; this.h = 0;
        this.hp = hp; this.maxHp = hp;
        this.mp = mp; this.maxMp = mp;
        this.str = str; this.def = def; this.spd = spd; this.mag = mag;
        this.move = move; this.jump = jump;
        this.isPlayer = isPlayer;
        this.sprite = null;
        this.hasMoved = false; this.hasAttacked = false;
    }
}

// ★キャラクターの登録★
const player = new Unit("ティラノ", "🦖", 10, 25, 30, 10, 15, 10, 5, 8, 4, 2, true);
const enemy  = new Unit("トリケラ", "🦕", 10, 21, 20, 5, 12, 12, 4, 2, 4, 2, false);
// 新しい敵を作る時は、ここに const enemy2 = new Unit(...) を書いて追加するだけ！

const units = [player, enemy];

function getUnitAt(x, z) {
    return units.find(u => u.x === x && u.z === z && u.hp > 0);
}

function getAttackableEnemies(unit) {
    let targets = [];
    for(let d of [[0,1],[1,0],[0,-1],[-1,0]]) {
        let u = getUnitAt(unit.x + d[0], unit.z + d[1]);
        if(u && u.isPlayer !== unit.isPlayer) targets.push(u);
    }
    return targets;
}
