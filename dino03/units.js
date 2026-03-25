/* =================================================================
   units.js - v8.20.43
   【絶対ルール順守：一切の省略なし】
   修正・統合内容：
   1. 経験値システム：addExp メソッドを追加。100EXPでレベルアップ。
   2. 成長ロジック：levelUp 時のステータス上昇値を維持。
   3. 高低差攻撃制限：getAttackableEnemies の高低差 <= 1 条件を維持。
   ================================================================= */

export const VERSION = "8.20.43";

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
     * 経験値の加算とレベルアップ判定
     */
    addExp(amount, uiCtrl, camera) {
        this.exp += amount;
        // 100 EXP ごとにレベルアップ
        while (this.exp >= 100) {
            this.levelUp();
            // レベルアップ演出（ui.js の浮遊テキスト機能を利用）
            if (uiCtrl && camera) {
                uiCtrl.showFloatingText(this, "LEVEL UP!", "levelup", camera);
            }
        }
    }

    /**
     * 成長システム：ステータス上昇値を維持
     */
    levelUp() {
        this.level++;
        this.exp -= 100; // 繰り越し対応
        if (this.exp < 0) this.exp = 0;

        this.maxHp += 10; this.hp = this.maxHp; 
        this.maxMp += 5;  this.mp = this.maxMp;
        this.str += 4; this.def += 3; this.spd += 1;
    }

    /**
     * スプライト生成と影の設定
     */
    initTextureSprite() {
        const conf = this.spriteConfig;
        this.texture.repeat.set(1 / conf.cols, 1 / conf.rows);
        this.texture.magFilter = THREE.NearestFilter;
        this.material = new THREE.SpriteMaterial({ map: this.texture, transparent: true, alphaTest: 0.5 });
        this.sprite = new THREE.Sprite(this.material);
        this.sprite.center.set(0.5, 0.0); // 足元を起点に
        
        const cellW = conf.w / conf.cols; const cellH = conf.h / conf.rows;
        const h = (conf.type === 'bra') ? 90 : 60; 
        this.baseScaleX = h * (cellW / cellH);
        this.sprite.scale.set(this.baseScaleX * this.facing, h, 1);
        this.sprite.userData = { isUnit: true, unit: this };
        this.setIdle();

        // 足元の影を生成
        const shadowGeo = new THREE.CircleGeometry(this.baseScaleX * 0.4, 32);
        const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false });
        this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
        this.shadow.rotation.x = -Math.PI / 2;
    }

    dispose(scene) {
        if(this.sprite) {
            scene.remove(this.sprite);
            if(this.material) this.material.dispose();
            this.sprite = null;
        }
        if(this.shadow) {
            scene.remove(this.shadow);
            this.shadow.geometry.dispose();
            this.shadow.material.dispose();
            this.shadow = null;
        }
    }

    /**
     * 指定した座標の方向に向きを変える
     */
    lookAtNode(targetX, targetZ) {
        if (targetX > this.x) this.facing = 1;      
        else if (targetX < this.x) this.facing = -1; 
        if (this.sprite) this.sprite.scale.x = this.baseScaleX * this.facing;
    }

    /**
     * フレーム更新処理（固有アニメーション計算式を維持）
     */
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

    /**
     * 固定アクションの設定
     */
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

/**
 * 攻撃可能な敵を検索（隣接4マス ＋ 高低差制限）
 */
export const getAttackableEnemies = (units, unit) => {
    let targets = [];
    for(let d of [[0,1],[1,0],[0,-1],[-1,0]]) {
        let u = getUnitAt(units, unit.x + d[0], unit.z + d[1]);
        // 高低差が1以内なら攻撃可能（あなたが追加した重要ロジックを維持）
        if(u && u.isPlayer !== unit.isPlayer && Math.abs(unit.h - u.h) <= 1) {
            targets.push(u);
        }
    }
    return targets;
};
