export const VERSION = "8.16.1";

export class Unit {
    constructor(id, emoji, x, z, hp, mp, str, def, spd, mag, move, jump, isPlayer, spriteConfig, level = 1) {
        this.id = id; this.emoji = emoji; this.x = x; this.z = z; this.h = 0;
        this.level = level; this.exp = 0;
        this.maxHp = hp; this.hp = hp;
        this.maxMp = mp; this.mp = mp;
        this.str = str; this.def = def; this.spd = spd; this.mag = mag;
        this.move = move; this.jump = jump;
        this.isPlayer = isPlayer;
        this.sprite = null; this.material = null;
        this.hasMoved = false; this.hasAttacked = false;
        this.spriteConfig = spriteConfig;
        this.texture = spriteConfig ? spriteConfig.tex : null;
        this.animTime = 0; this.animSpeed = 150; this.animState = 'IDLE'; 
        this.facing = 1; this.baseScaleX = 1; 

        if(this.texture) { this.initTextureSprite(); }
    }

    levelUp() {
        this.level++;
        this.exp = 0; 
        this.maxHp += 10; this.hp = this.maxHp; 
        this.maxMp += 5;  this.mp = this.maxMp;
        this.str += 4; this.def += 3; this.spd += 1;
    }

    initTextureSprite() {
        const conf = this.spriteConfig;
        this.texture.repeat.set(1 / conf.cols, 1 / conf.rows);
        this.texture.magFilter = THREE.NearestFilter;
        this.material = new THREE.SpriteMaterial({ map: this.texture, transparent: true, alphaTest: 0.5 });
        this.sprite = new THREE.Sprite(this.material);
        this.sprite.center.set(0.5, 0.0); 
        const cellW = conf.w / conf.cols; const cellH = conf.h / conf.rows;
        const h = (conf.type === 'bra') ? 90 : 60; 
        this.baseScaleX = h * (cellW / cellH);
        this.sprite.scale.set(this.baseScaleX * this.facing, h, 1);
        this.sprite.userData = { isUnit: true, unit: this };
        this.setIdle();
    }

    // 物理的に削除する（メモリリーク対策）
    dispose(scene) {
        if(this.sprite) {
            scene.remove(this.sprite);
            if(this.material) this.material.dispose();
            this.sprite = null;
        }
    }

    lookAtNode(targetX, targetZ) {
        if (targetX > this.x) this.facing = 1;      
        else if (targetX < this.x) this.facing = -1; 
        if (this.sprite) this.sprite.scale.x = this.baseScaleX * this.facing;
    }

    updateAnimation(delta) {
        if(!this.texture || this.animState === 'FIXED') return;
        this.animTime += delta;
        if(this.spriteConfig.type === 'bra') {
            const frame = (Math.floor(this.animTime / 500) % 2); 
            this.setRawFrame(0, frame);
        } else if(this.spriteConfig.type === 'rex') {
            const f = 11 - (Math.floor(this.animTime / this.animSpeed) % 12); 
            this.setRawFrame(f % 4, Math.floor(f / 4));
        } else if(this.spriteConfig.type === 'comp') {
            const col = (Math.floor(this.animTime / 200) % 2);
            this.setRawFrame(col, 0);
        }
    }

    setRawFrame(col, row) {
        if(!this.texture) return;
        const conf = this.spriteConfig;
        this.texture.offset.x = col / conf.cols;
        this.texture.offset.y = 1.0 - ((row + 1) / conf.rows);
    }

    setAction(action) {
        if(!this.texture) return;
        this.animState = 'FIXED';
        if(this.spriteConfig.type === 'bra') {
            this.setRawFrame(0, action === 'ATTACK' ? 2 : 3);
        } else if(this.spriteConfig.type === 'rex') {
            if(action === 'ATTACK') this.setRawFrame(1, 3); 
            else if(action === 'HURT') this.setRawFrame(0, 3);  
            else if(action === 'DOWN') this.setRawFrame(2, 3);  
        } else if(this.spriteConfig.type === 'comp') {
            if(action === 'ATTACK') this.setRawFrame(2, 0); 
            else if(action === 'HURT') this.setRawFrame(0, 1);  
            else if(action === 'DOWN') this.setRawFrame(1, 1);  
        }
    }

    setIdle() { this.animState = 'IDLE'; this.setRawFrame(0, 0); }
}

export const getUnitAt = (units, x, z) => units.find(u => u.x === x && u.z === z && u.hp > 0);
export const getAttackableEnemies = (units, unit) => {
    let targets = [];
    for(let d of [[0,1],[1,0],[0,-1],[-1,0]]) {
        let u = getUnitAt(units, unit.x + d[0], unit.z + d[1]);
        if(u && u.isPlayer !== unit.isPlayer) targets.push(u);
    }
    return targets;
};
