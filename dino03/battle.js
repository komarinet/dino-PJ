/* =================================================================
   battle.js - v8.20.37
   【絶対ルール遵守：一切の省略なし】
   修正内容：
   1. ユニット同期：units.js (v8.20.36) の仕様に合わせ、
      setAnimation('move') などの未定義関数を setIdle() に修正。
   2. アクション同期：setAction('ATTACK') 等の引数を units.js と完全一致。
   3. 演出維持：段差ジャンプ移動およびヒット時の揺れ、死亡演出を完備。
   ================================================================= */

export const VERSION = "8.20.37";

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
                // units.js の仕様に合わせ、アニメーションサイクルを開始
                if (unit.setIdle) unit.setIdle();
            },
            onComplete: () => {
                // 移動終了時に再度状態をリセット
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

            // 1マス進むごとに、進む方向に向きを変える
            tl.to({}, {
                duration: 0.01,
                onStart: () => { unit.lookAtNode(node.x, node.z); }
            });

            if (isStep) {
                // 【段差がある場合：ぴょんっとジャンプ】
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
                // 【平地：シュッとスライド】
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
     * 攻撃の実行
     */
    executeAttack(attacker, target, allUnits, camera, callback, scene) {
        // お互いの方を向く
        attacker.lookAtNode(target.x, target.z);
        target.lookAtNode(attacker.x, attacker.z);

        // 攻撃アニメーションのセット
        if (attacker.setAction) attacker.setAction('ATTACK');

        // ダメージ計算（基本攻撃力 - 防御力の半分）
        const damage = Math.max(1, attacker.str - Math.floor(target.def / 2));
        
        setTimeout(() => {
            target.hp -= damage;
            if (target.hp < 0) target.hp = 0;

            // ヒット演出（ユニットを小刻みに揺らす）
            if (target.sprite) {
                gsap.to(target.sprite.position, {
                    x: target.sprite.position.x + (Math.random() - 0.5) * 10,
                    duration: 0.05,
                    repeat: 5,
                    yoyo: true
                });
            }

            // ダメージ数字のポップアップ表示
            if (this.uiCtrl && typeof this.uiCtrl.showDamageText === 'function') {
                this.uiCtrl.showDamageText(target, damage, scene, camera);
            }

            if (target.hp <= 0) {
                // 死亡演出（DOWNポーズのあと消滅）
                setTimeout(() => {
                    if (target.setAction) target.setAction('DOWN');
                    gsap.to(target.sprite.scale, { x: 0, y: 0, z: 0, duration: 0.5, delay: 0.5 });
                    if (target.shadow) target.shadow.visible = false;
                }, 300);
            } else {
                // 被弾アニメーション (HURT)
                if (target.setAction) target.setAction('HURT');
                setTimeout(() => {
                    if (target.hp > 0 && target.setIdle) target.setIdle();
                }, 500);
            }

            // 攻撃側の状態復帰
            setTimeout(() => {
                if (attacker.setIdle) attacker.setIdle();
                if (callback) callback();
            }, 600);

        }, 500);
    }
}
