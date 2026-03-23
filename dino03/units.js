window.Unit = class {
    constructor(id, emoji, x, z, hp, mp, str, def, spd, mag, move, jump, isPlayer, spriteConfig) {
        this.id = id; this.emoji = emoji;
        this.x = x; this.z = z; this.h = 0;
        this.hp = hp; this.maxHp = hp;
        this.mp = mp; this.maxMp = mp;
        this.str = str; this.def = def; this.spd = spd; this.mag = mag;
        this.move = move; this.jump = jump;
        this.isPlayer = isPlayer;
        
        this.sprite = null; this.material = null;
        this.hasMoved = false; this.hasAttacked = false;

        this.spriteConfig = spriteConfig;
        this.texture = spriteConfig ? spriteConfig.tex : null;
        this.animTime = 0;
        // ★修正：ティラノの歩行速度（1コマ150ms）をUnitクラスで管理★
        this.animSpeed = 150; 
        this.animState = 'IDLE'; 

        this.facing = 1; 
        this.baseScaleX = 1; 

        if(this.texture) { this.initTextureSprite(); }
    }

    initTextureSprite() {
        const conf = this.spriteConfig;
        this.texture.repeat.set(1 / conf.cols, 1 / conf.rows);
        this.texture.magFilter = THREE.NearestFilter;
        
        this.material = new THREE.SpriteMaterial({ map: this.texture, transparent: true });
        this.sprite = new THREE.Sprite(this.material);
        this.sprite.center.set(0.5, 0.0); 
        
        const cellW = conf.w / conf.cols;
        const cellH = conf.h / conf.rows;
        
        const h = (conf.type === 'bra') ? 90 : 60; 
        this.baseScaleX = h * (cellW / cellH);
        
        this.sprite.scale.set(this.baseScaleX * this.facing, h, 1);
        this.sprite.userData = { isUnit: true, unit: this };
        this.setIdle();
    }

    setBaseScale(w) {
        this.baseScaleX = w;
        if(this.sprite) {
            this.sprite.scale.x = this.baseScaleX * this.facing;
        }
    }

    lookAtNode(targetX, targetZ) {
        if (targetX > this.x) this.facing = 1;      
        else if (targetX < this.x) this.facing = -1; 
        else if (targetZ < this.z) this.facing = 1;  
        else if (targetZ > this.z) this.facing = -1; 
        
        if (this.sprite) {
            this.sprite.scale.x = this.baseScaleX * this.facing;
        }
    }

    updateAnimation(delta) {
        if(!this.texture || this.animState === 'FIXED') return;
        
        if(this.animState === 'IDLE') {
            this.animTime += delta;
            if(this.spriteConfig.type === 'bra') {
                const frame = (Math.floor(this.animTime / 500) % 2); // 0 or 1
                this.setRawFrame(0, frame);
            } else if(this.spriteConfig.type === 'rex') {
                // ★修正箇所：歩行アニメーションのループ順序を逆転させる★
                // 増加する animTime に基づいて 11, 10, 9, ..., 0, 11, ... と減少させる
                const f = 11 - (Math.floor(this.animTime / this.animSpeed) % 12); 
                const col = f % 4;
                const row = Math.floor(f / 4);
                this.setRawFrame(col, row);
            }
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
            if(action === 'ATTACK') this.setRawFrame(0, 2);
            else if(action === 'HURT') this.setRawFrame(0, 3);
            else if(action === 'DOWN') this.setRawFrame(0, 3);
        } else if(this.spriteConfig.type === 'rex') {
            if(action === 'ATTACK') this.setRawFrame(1, 3); 
            else if(action === 'HURT') this.setRawFrame(0, 3);  
            else if(action === 'DOWN') this.setRawFrame(2, 3);  
        }
    }

    setIdle() {
        this.animState = 'IDLE';
        this.setRawFrame(0, 0); 
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
