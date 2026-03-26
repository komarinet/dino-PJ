/* =================================================================
   units.js - v8.20.66
   【絶対ルール順守：一切の省略なし】
   修正・統合内容：
   1. 母ティラノ対応：3x5グリッド素材（1〜15番）のインデックス計算を実装。
   2. アニメーション：1-11番の歩行、13番やられ、14番倒れ、15番攻撃を定義。
   3. 描画設定：影の renderOrder=10、本体 renderOrder=999 を維持。
   4. 既存維持：レベルアップ時のATTACKポーズ、Str/Def強化バランスを完備。
   ================================================================= */

export const VERSION = "8.20.66";

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
        this.shadow = null;
        this.hasMoved = false; this.hasAttacked = false; this.hasActed = false;
        this.spriteConfig = spriteConfig;
        this.texture = spriteConfig ? spriteConfig.tex : null;
        this.animTime = 0; this.animSpeed = 150; this.animState = 'IDLE'; 
        this.facing = 1; this.baseScaleX = 1; 

        if(this.texture) { this.initTextureSprite(); }
    }

    /**
     * 経験値の加算とレベルアップ演出
     */
    addExp(amount, uiCtrl, camera) {
        this.exp += amount;
        let leveledUp = false;
        while (this.exp >= 100) {
            this.levelUp();
            leveledUp = true;
            if (uiCtrl && camera) {
                const heightOffset = (this.spriteConfig.type === 'bra') ? 100 : (this.spriteConfig.type === 'mom' ? 90 : 70);
                uiCtrl.showFloatingText(this, "LEVEL UP!", "levelup", camera, heightOffset);
            }
        }

        if (leveledUp) {
            this.setAction('ATTACK');
            setTimeout(() => {
                if (this.hp > 0) this.setIdle();
            }, 1500);
        }
    }

    /**
     * 成長システム：ステータス上昇値
     */
    levelUp() {
        this.level++;
        this.exp -= 100;
        if (this.exp < 0) this.exp = 0;
        this.maxHp += 10; this.hp = this.maxHp; 
        this.maxMp += 5;  this.mp = this.maxMp;
        this.str += 5; this.def += 4; this.spd += 1;
    }

    /**
     * スプライト生成と描画優先度の設定
     */
    initTextureSprite() {
        const conf = this.spriteConfig;
        this.texture.repeat.set(1 / conf.cols, 1 / conf.rows);
        this.texture.magFilter = THREE.NearestFilter;
        this.material = new THREE.SpriteMaterial({ map: this.texture, transparent: true, alphaTest: 0.5 });
        this.sprite = new THREE.Sprite(this.material);
        this.sprite.center.set(0.5, 0.0); 
        
        this.sprite.renderOrder = 999;
        
        const cellW = conf.w / conf.cols; const cellH = conf.h / conf.rows;
        // 高設定：ブラキオ90, 母85, プレイヤー・他60
        let h = 60;
        if (conf.type === 'bra') h = 90;
        else if (conf.type === 'mom') h = 85; 

        this.baseScaleX = h * (cellW / cellH);
        this.sprite.scale.set(this.baseScaleX * this.facing, h, 1);
        this.sprite.userData = { isUnit: true, unit: this };
        this.setIdle();

        const shadowGeo = new THREE.CircleGeometry(this.baseScaleX * 0.4, 32);
        const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false });
        this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.renderOrder = 10;
    }

    dispose(scene) {
        if(this.sprite) { scene.remove(this.sprite); if(this.material) this.material.dispose(); this.sprite = null; }
        if(this.shadow) { scene.remove(this.shadow); this.shadow.geometry.dispose(); this.shadow.material.dispose(); this.shadow = null; }
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
        } 
        else if(this.spriteConfig.type === 'mom') {
            // 母ティラノ：1〜11番のループ（3列x5行）
            const idx = (Math.floor(this.animTime / 150) % 11) + 1;
            const col = (idx - 1) % 3;
            const row = Math.floor((idx - 1) / 3);
            this.setRawFrame(col, row);
        }
        else if(this.spriteConfig.type === 'rex') {
            const f = 11 - (Math.floor(this.animTime / this.animSpeed) % 12); 
            this.setRawFrame(f % 4, Math.floor(f / 4));
        } 
        else if(this.spriteConfig.type === 'comp') {
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
        } 
        else if(this.spriteConfig.type === 'mom') {
            // 母ティラノ：13番やられ、14番倒れ、15番攻撃
            if(action === 'ATTACK') this.setRawFrame(2, 4);      // 15番
            else if(action === 'HURT') this.setRawFrame(0, 4);   // 13番
            else if(action === 'DOWN') this.setRawFrame(1, 4);   // 14番
        }
        else if(this.spriteConfig.type === 'rex') {
            if(action === 'ATTACK') this.setRawFrame(1, 3); 
            else if(action === 'HURT') this.setRawFrame(0, 3);  
            else if(action === 'DOWN') this.setRawFrame(2, 3);  
        } 
        else if(this.spriteConfig.type === 'comp') {
            if(action === 'ATTACK') this.setRawFrame(2, 0); 
            else if(action === 'HURT') this.setRawFrame(0, 1);  
            else if(action === 'DOWN') this.setRawFrame(1, 1);  
        }
    }

    setIdle() { 
        this.animState = 'IDLE'; 
        if(this.spriteConfig.type === 'mom') this.setRawFrame(0, 0); // 1番フレーム
        else this.setRawFrame(0, 0); 
    }
}

export const getUnitAt = (units, x, z) => units.find(u => u.x === x && u.z === z && u.hp > 0);

export const getAttackableEnemies = (units, unit) => {
    let targets = [];
    for(let d of [[0,1],[1,0],[0,-1],[-1,0]]) {
        let u = getUnitAt(units, unit.x + d[0], unit.z + d[1]);
        if(u && u.isPlayer !== unit.isPlayer && Math.abs(unit.h - u.h) <= 1) {
            targets.push(u);
        }
    }
    return targets;
};
