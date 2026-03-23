export const VERSION = "8.16.0";
export class Unit {
    constructor(id, emoji, x, z, hp, mp, str, def, spd, mag, move, jump, isPlayer, spriteConfig, level = 1) {
        this.id = id; this.emoji = emoji; this.x = x; this.z = z; this.h = 0;
        this.level = level; this.maxHp = hp; this.hp = hp;
        this.str = str; this.def = def; this.spd = spd; this.move = move; this.jump = jump;
        this.isPlayer = isPlayer; this.hasMoved = false; this.hasAttacked = false;
        this.spriteConfig = spriteConfig; this.animTime = 0; this.animState = 'IDLE'; this.facing = 1;
        if(spriteConfig) this.initSprite();
    }
    initSprite() {
        const conf = this.spriteConfig;
        conf.tex.repeat.set(1 / conf.cols, 1 / conf.rows);
        this.material = new THREE.SpriteMaterial({ map: conf.tex, transparent: true, alphaTest: 0.5 });
        this.sprite = new THREE.Sprite(this.material);
        this.sprite.center.set(0.5, 0);
        const h = (conf.type === 'bra') ? 90 : 60;
        this.baseScaleX = h * (conf.w / conf.cols) / (conf.h / conf.rows);
        this.sprite.scale.set(this.baseScaleX, h, 1);
        this.sprite.userData = { isUnit: true, unit: this };
        this.setIdle();
    }
    // ★ 物理削除（メモリリーク対策）
    dispose(scene) {
        if(this.sprite) {
            scene.remove(this.sprite);
            if(this.material) this.material.dispose();
            this.sprite = null;
        }
    }
    lookAtNode(tx, tz) { if(tx > this.x) this.facing = 1; else if(tx < this.x) this.facing = -1; if(this.sprite) this.sprite.scale.x = this.baseScaleX * this.facing; }
    updateAnimation(delta) {
        if(!this.sprite || this.animState === 'FIXED') return;
        this.animTime += delta;
        const conf = this.spriteConfig;
        if(conf.type === 'bra') this.setFrame(0, Math.floor(this.animTime/500)%2);
        else if(conf.type === 'rex') { const f = 11-(Math.floor(this.animTime/150)%12); this.setFrame(f%4, Math.floor(f/4)); }
        else if(conf.type === 'comp') this.setFrame(Math.floor(this.animTime/200)%2, 0);
    }
    setFrame(c, r) { if(this.sprite) { this.sprite.material.map.offset.set(c/this.spriteConfig.cols, 1-(r+1)/this.spriteConfig.rows); } }
    setAction(act) { this.animState = 'FIXED'; if(act === 'ATTACK') this.setFrame(1,3); else if(act === 'HURT') this.setFrame(0,3); }
    setIdle() { this.animState = 'IDLE'; this.setFrame(0,0); }
}
export const getUnitAt = (units, x, z) => units.find(u => u.x === x && u.z === z && u.hp > 0);
export const getAttackableEnemies = (units, unit) => {
    return units.filter(u => !u.isPlayer && u.hp > 0 && Math.abs(u.x-unit.x)+Math.abs(u.z-unit.z) === 1);
};
