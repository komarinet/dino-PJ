window.Unit = class {
    constructor(id, emoji, x, z, hp, mp, str, def, spd, mag, move, jump, isPlayer) {
        this.id = id; this.emoji = emoji;
        this.x = x; this.z = z; this.h = 0;
        this.hp = hp; this.maxHp = hp;
        this.mp = mp; this.maxMp = mp;
        this.str = str; this.def = def; this.spd = spd; this.mag = mag;
        this.move = move; this.jump = jump;
        this.isPlayer = isPlayer;
        this.sprite = null;
        this.hasMoved = false; 
        this.hasAttacked = false;
    }
};

// ★配置変更: ティラノは階段下(z:22)、トリケラは城の王座(z:10)
window.player = new window.Unit("ティラノ", "🦖", 12, 22, 30, 10, 15, 10, 5, 8, 4, 2, true);
window.enemy  = new window.Unit("トリケラ", "🦕", 12, 10, 20, 5, 12, 12, 4, 2, 4, 2, false);
window.units = [window.player, window.enemy];

window.getUnitAt = function(x, z) {
    return window.units.find(u => u.x === x && u.z === z && u.hp > 0);
};

window.getAttackableEnemies = function(unit) {
    let targets = [];
    for(let d of [[0,1],[1,0],[0,-1],[-1,0]]) {
        let u = window.getUnitAt(unit.x + d[0], unit.z + d[1]);
        if(u && u.isPlayer !== unit.isPlayer) targets.push(u);
    }
    return targets;
};
