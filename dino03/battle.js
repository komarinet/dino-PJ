/* =================================================================
   battle.js - v8.20.42
   【絶対ルール順守：一切の省略なし】
   修正・統合内容：
   1. 経験値システムの統合：
      敵を倒した際、attacker.isPlayer が真であれば経験値を加算する処理を追加。
      コンプソグナトゥスなら50EXP（4体で200EXP＝Lv3）が入ります。
   2. 既存ロジックの完全維持：
      段差ジャンプ移動、向きの制御、ダメージ演出などは一切変更していません。
   ================================================================= */

export const VERSION = "8.20.42";

import { TILE_SIZE, H_STEP, MAP_W, MAP_D } from './map.js';

export class BattleSystem {
    constructor(uiCtrl, cameraCtrl) {
        this.uiCtrl = uiCtrl;
        this.cameraCtrl = cameraCtrl;
    }

    /**
     * ユニットの移動処理（スライド＆ジャンプ）
     */
    executeMovement(unit, path, callback) {
        if (!path || path.length === 0) {
            if (callback) callback();
            return;
        }

        const tl = gsap.timeline({
            onStart: () => {
                if (unit.setIdle) unit.setIdle();
            },
            onComplete: () => {
                if (unit.setIdle) unit.setIdle();
                if (callback) callback();
            }
        });

        const offX = (MAP_W * TILE_SIZE) / 2;
        const offZ = (MAP_D * TILE_SIZE) / 2;
        let currentH = unit.h;

        path.forEach((node, index) => {
            const targetX = (node.x * TILE_SIZE) - offX;
            const targetZ = (node.z * TILE_SIZE) - offZ;
            const targetY = node.h * H_STEP;
            const isStep = (node.h !== currentH);
            const duration = isStep ? 0.35 : 0.25;

            tl.to({}, {
                duration: 0.01,
                onStart: () => { unit.lookAtNode(node.x, node.z); }
            });

            if (isStep) {
                // 【段差ジャンプ】
                tl.to(unit.sprite.position, {
                    x: targetX,
                    z: targetZ,
                    duration: duration,
                    ease: "power1.inOut"
                }, "jump" + index);

                tl.to(unit.sprite.position, {
                    y: Math.max(targetY, currentH * H_STEP) + 25,
                    duration: duration * 0.5,
                    ease: "power2.out"
                }, "jump" + index);

                tl.to(unit.sprite.position, {
                    y: targetY,
                    duration: duration * 0.5,
                    ease: "power2.in",
                    onComplete: () => {
                        unit.x = node.x; unit.z = node.z; unit.h = node.h;
                    }
                }, "jump" + index + "+=" + (duration * 0.5));
            } else {
                // 【平地スライド】
                tl.to(unit.sprite.position, {
                    x: targetX,
                    z: targetZ,
                    y: targetY,
                    duration: duration,
                    ease: "none",
                    onComplete: () => {
                        unit.x = node.x; unit.z = node.z; unit.h = node.h;
                    }
                });
            }
            currentH = node.h;
        });
    }

    /**
     * 攻撃の実行（経験値獲得ロジック追加版）
     */
    executeAttack(attacker, target, allUnits, camera, callback, scene) {
        attacker.lookAtNode(target.x, target.z);
        target.lookAtNode(attacker.x, attacker.z);

        if (attacker.setAction) attacker.setAction('ATTACK');

        const damage = Math.max(1, attacker.str - Math.floor(target.def / 2));
        
        setTimeout(() => {
            target.hp -= damage;
            if (target.hp < 0) target.hp = 0;

            if (target.sprite) {
                gsap.to(target.sprite.position, {
                    x: target.sprite.position.x + (Math.random() - 0.5) * 10,
                    duration: 0.05,
                    repeat: 5,
                    yoyo: true
                });
            }

            if (this.uiCtrl && typeof this.uiCtrl.showDamageText === 'function') {
                this.uiCtrl.showDamageText(target, damage, scene, camera);
            }

            if (target.hp <= 0) {
                // ★追加箇所：経験値の獲得
                // コンプソグナトゥスなら50、その他（ボス等）なら100
                if (attacker.isPlayer && attacker.addExp) {
                    const expGain = target.id.includes('コンプ') ? 50 : 100;
                    attacker.addExp(expGain, this.uiCtrl, camera);
                }

                setTimeout(() => {
                    if (target.setAction) target.setAction('DOWN');
                    gsap.to(target.sprite.scale, { x: 0, y: 0, z: 0, duration: 0.5, delay: 0.5 });
                    if (target.shadow) target.shadow.visible = false;
                }, 300);
            } else {
                if (target.setAction) target.setAction('HURT');
                setTimeout(() => {
                    if (target.hp > 0 && target.setIdle) target.setIdle();
                }, 500);
            }

            setTimeout(() => {
                if (attacker.setIdle) attacker.setIdle();
                if (callback) callback();
            }, 600);

        }, 500);
    }
}
