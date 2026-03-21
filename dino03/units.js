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

        this.texture = texture;
        this.animTime = 0;
        this.animSpeed = 500; 
        this.animState = 'IDLE'; 

        // ★新システム：向きの管理（1:右向き, -1:左向き）★
        this.facing = 1; 
        this.baseScaleX = 1; 

        if(this.texture) { this.initTextureSprite(); }
    }

    initTextureSprite() {
        this.texture.repeat.set(1, 0.25);
        this.texture.magFilter = THREE.NearestFilter;
        
        this.material = new THREE.SpriteMaterial({ map: this.texture, transparent: true });
        this.sprite = new THREE.Sprite(this.material);
        this.sprite.center.set(0.5, 0.0); 
        
        const h = 90;
        this.baseScaleX = h * (352/250);
        this.sprite.scale.set(this.baseScaleX * this.facing, h, 1);
        this.sprite.userData = { isUnit: true, unit: this };
        this.setFrame(1);
    }

    // ★ベースの大きさを保存（絵文字用）★
    setBaseScale(w) {
        this.baseScaleX = w;
        if(this.sprite) {
            this.sprite.scale.x = this.baseScaleX * this.facing;
        }
    }

    // ★ターゲットの方向を向く機能★
    lookAtNode(targetX, targetZ) {
        if (targetX > this.x) this.facing = 1;      // 右へ
        else if (targetX < this.x) this.facing = -1; // 左へ
        else if (targetZ < this.z) this.facing = 1;  // 奥（上）へ
        else if (targetZ > this.z) this.facing = -1; // 手前（下）へ
        
        if (this.sprite) {
            this.sprite.scale.x = this.baseScaleX * this.facing;
        }
    }

    updateAnimation(delta) {
        if(!this.texture || this.animState === 'FIXED') return;
        
        if(this.animState === 'IDLE') {
            this.animTime += delta;
            const frame = (Math.floor(this.animTime / this.animSpeed) % 2) + 1;
            this.setFrame(frame);
        }
    }

    setFrame(num) {
        if(!this.texture) return;
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
