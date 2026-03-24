export const VERSION = "8.18.0";
import { TILE_SIZE, H_STEP, MAP_W, MAP_D } from './map.js';

export class BattleSystem {
    constructor(uiCtrl, cameraControl) {
        this.uiCtrl = uiCtrl;
        this.cameraControl = cameraControl;
    }

    executeMovement(unit, path, onComplete) {
        if (!path || path.length === 0) {
            if (onComplete) onComplete();
            return;
        }

        const offX = (MAP_W * TILE_SIZE) / 2;
        const offZ = (MAP_D * TILE_SIZE) / 2;

        let tl = gsap.timeline({
            onComplete: () => {
                const lastNode = path[path.length - 1];
                unit.x = lastNode.x;
                unit.z = lastNode.z;
                unit.h = lastNode.h;
                if(onComplete) onComplete();
            }
        });

        path.forEach(node => {
            tl.to(unit.sprite.position, {
                x: (node.x * TILE_SIZE) - offX,
                z: (node.z * TILE_SIZE) - offZ,
                y: node.h * H_STEP,
                duration: 0.2,
                ease: "linear",
                onStart: () => {
                    unit.lookAtNode(node.x, node.z);
                }
            });
        });
    }

    // ★ 変更：反撃（isCounter）を判定して連鎖させるロジックを追加
    executeAttack(attacker, defender, units, camera, onComplete, scene, isCounter = false) {
        attacker.setAction('ATTACK');
        
        const origX = attacker.sprite.position.x;
        const targetX = defender.sprite.position.x;
        const atkDir = targetX > origX ? 1 : -1;
        
        attacker.facing = atkDir;
        if(attacker.sprite) attacker.sprite.scale.x = attacker.baseScaleX * atkDir;

        // 突撃して戻るアニメーション（yoyo）
        gsap.to(attacker.sprite.position, {
            x: targetX - (20 * atkDir),
            duration: 0.2,
            yoyo: true,
            repeat: 1,
            onRepeat: () => {
                // ぶつかった瞬間の処理
                defender.setAction('HURT');
                
                // ダメージ計算（最低1ダメージ）
                let dmg = Math.max(1, attacker.str - defender.def);
                defender.hp -= dmg;
                this.uiCtrl.showFloatingText(defender, dmg, 'damage', camera);

                if (defender.hp <= 0) {
                    defender.setAction('DOWN');
                    // やられたらフェードアウトして消滅させる
                    gsap.to(defender.sprite.material, { 
                        opacity: 0, 
                        delay: 0.5, 
                        duration: 0.5, 
                        onComplete: () => defender.dispose(scene) 
                    });
                }
            },
            onComplete: () => {
                attacker.setIdle();
                
                if (defender.hp > 0) {
                    defender.setIdle();
                    
                    // ★ 変更：防御側が生きていて、かつこれが反撃でなければ、反撃チェック！
                    if (!isCounter) {
                        const dist = Math.abs(attacker.x - defender.x) + Math.abs(attacker.z - defender.z);
                        if (dist <= 1) { // 射程1なら反撃発動
                            setTimeout(() => {
                                this.uiCtrl.setMsg(`${defender.id} の反撃！`, "#ffcc00");
                                // 攻守を入れ替えて、isCounter = true でもう一度実行
                                this.executeAttack(defender, attacker, units, camera, onComplete, scene, true);
                            }, 500);
                            return; // 反撃が終わるまで onComplete は呼ばない
                        }
                    }
                }
                
                // すべての攻撃（または反撃）が終わったらターン進行へ
                setTimeout(() => {
                    if (onComplete) onComplete();
                }, 500);
            }
        });
    }

    decideEnemyAI(units, player) {
        // まだ行動していない生きている敵だけを抽出する
        return units.filter(u => !u.isPlayer && u.hp > 0 && !u.hasActed);
    }
}
