window.Unit = class {
    constructor(id, emoji, x, z, hp, mp, str, def, spd, mag, move, jump, isPlayer, texture) {
        this.id = id; this.emoji = emoji;
        this.x = x; this.z = z; this.h = 0;
        this.hp = hp; this.maxHp = hp;
        this.mp = mp; this.maxMp = mp;
        this.str = str; this.def = def; this.spd = spd; this.mag = mag;
        this.move = move; this.jump = jump;
        this.isPlayer = isPlayer;
        
        this.sprite = null; this.material = null;
        this.hasMoved = false; this.hasAttacked = false;

        // アニメーション制御
        this.texture = texture;
        this.animTime = 0;
        this.animSpeed = 500; // 0.5秒ごとに切り替え
        this.animState = 'IDLE'; // IDLE, FIXED

        if(this.texture) { this.initTextureSprite(); }
    }

    initTextureSprite() {
        this.texture.repeat.set(1, 0.25);
        this.texture.magFilter = THREE.NearestFilter;
        
        this.material = new THREE.SpriteMaterial({ map: this.texture, transparent: true });
        this.sprite = new THREE.Sprite(this.material);
        this.sprite.center.set(0.5, 0.0); // 足元基準
        
        const h = 150;
        this.sprite.scale.set(h * (352/250), h, 1);
        this.sprite.userData = { isUnit: true, unit: this };
        this.setFrame(1);
    }

    updateAnimation(delta) {
        if(!this.texture || this.animState === 'FIXED') return;
        
        if(this.animState === 'IDLE') {
            this.animTime += delta;
            // 待機中：フレーム1(立ち)と2(足上げ)を交互
            const frame = (Math.floor(this.animTime / this.animSpeed) % 2) + 1;
            this.setFrame(frame);
        }
    }

    setFrame(num) {
        if(!this.texture) return;
        // 縦4コマの下から上へのオフセット
        const offsets = { 1: 0.75, 2: 0.50, 3: 0.25, 4: 0.00 };
        this.texture.offset.y = offsets[num] || 0.75;
    }
};

window.getUnitAt = function(x, z) { return window.units.find(u => u.x === x && u.z === z && u.hp > 0); };
window.getAttackableEnemies = function(unit) {
    let targets = [];
    for(let d of [[0,1],[1,0],[0,-1],[-1,0]]) {
        let u = window.getUnitAt(unit.x + d[0], unit.z + d[1]);
        if(u && u.isPlayer !== unit.isPlayer) targets.push(u);
    }
    return targets;
};
