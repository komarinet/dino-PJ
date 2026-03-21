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

        // アニメーション用
        this.texture = texture;
        this.animTime = 0; // 時間計測
        this.animSpeed = 500; // 1フレームの長さ(ms)
        this.animState = 'IDLE'; // IDLE, ATTACK, HURT

        if(this.texture) { this.initTextureSprite(); }
    }

    // ★ドット絵スプライトの初期化★
    initTextureSprite() {
        // テクスチャ設定。1枚の画像を縦4分割（縦repeat: 0.25）
        this.texture.repeat.set(1, 0.25);
        this.texture.magFilter = THREE.NearestFilter; // ドットをクッキリ
        
        this.material = new THREE.SpriteMaterial({ map: this.texture, transparent: true });
        this.sprite = new THREE.Sprite(this.material);
        
        // ★重要：スプライトの中心を足元に（x:0.5, y:0.0）★
        this.sprite.center.set(0.5, 0.0);
        
        // スケーリング。画像のサイズ（352x250）をゲーム単位に調整。
        // とりあえず1タイル（60px）の3倍の高さに。
        const baseH = 200;
        this.sprite.scale.set(baseH * (352/250), baseH, 1);
        
        this.sprite.userData = { isUnit: true, unit: this };
        this.updateUV(); // 最初のフレーム設定
    }

    // ★アニメーション状態の更新（animateループ内で呼ばれる）★
    updateAnimation(delta) {
        if(!this.texture) return;
        this.animTime += delta;
        
        if(this.animState === 'IDLE') {
            // 待機中：フレーム1と2を交互
            const frame = (Math.floor(this.animTime / this.animSpeed) % 2) + 1;
            this.updateUV(frame);
        }
        // 他のステート（ATTACK, HURT）は、攻撃や被弾時に外部から設定する
    }

    // ★UV座標（フレーム）の切り替え★
    updateUV(frameNum) {
        if(!this.texture) return;
        // 縦に4つ積み上げている場合のオフセット計算（下から上への0〜1座標）
        // 1(Stand): 0.75, 2(Foot): 0.5, 3(Atk): 0.25, 4(Hurt): 0.0
        let offsetY = 0.0;
        switch(frameNum) {
            case 1: offsetY = 0.75; break; // 立ち姿
            case 2: offsetY = 0.50; break; // 足上げ
            case 3: offsetY = 0.25; break; // 攻撃
            case 4: offsetY = 0.00; break; // 被弾
            default: offsetY = 0.75; // デフォルトは立ち
        }
        this.texture.offset.y = offsetY;
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
