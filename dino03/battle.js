/* =================================================================
   battle.js - v8.20.19
   修正内容：
   1. 段差対応ジャンプ移動：
      平地ではスライド、段差がある場合はぴょんと跳ねる放物線移動を実装。
   2. 全ユニット共通処理：
      プレイヤー・敵問わず、すべての移動アニメーションにこの法則を適用。
   ================================================================= */

export const VERSION = "8.20.19";

import { TILE_SIZE, H_STEP, MAP_W, MAP_D } from './map.js';

export class BattleSystem {
    constructor(uiCtrl, cameraCtrl) {
        this.uiCtrl = uiCtrl;
        this.cameraCtrl = cameraCtrl;
    }

    /**
     * ユニットを目的地まで移動させる（平地はスライド、段差はジャンプ）
     */
    executeMovement(unit, path, callback) {
        if (!path || path.length === 0) {
            if (callback) callback();
            return;
        }

        const tl = gsap.timeline({
            onStart: () => {
                if (unit.setAnimation) unit.setAnimation('move');
            },
            onComplete: () => {
                if (unit.setAnimation) unit.setAnimation('idle');
                if (callback) callback();
            }
        });

        const offX = (MAP_W * TILE_SIZE) / 2;
        const offZ = (MAP_D * TILE_SIZE) / 2;

        let currentH = unit.h; // 現在の高さ

        path.forEach((node, index) => {
            const targetX = (node.x * TILE_SIZE) - offX;
            const targetZ = (node.z * TILE_SIZE) - offZ;
            const targetY = node.h * H_STEP;
            
            // 段差があるかチェック
            const isStep = (node.h !== currentH);
            const duration = isStep ? 0.35 : 0.25; // 段差の時は少し滞空時間を長く

            // 1. まず進む方向に向きを変える
            tl.to({}, {
                duration: 0.01,
                onStart: () => {
                    unit.lookAtNode(node.x, node.z);
                }
            });

            // 2. 移動アニメーション
            if (isStep) {
                // 【段差あり：ぴょんっとジャンプ】
                // 水平移動と同時に、Y軸を放物線状に動かす
                tl.to(unit.sprite.position, {
                    x: targetX,
                    z: targetZ,
                    duration: duration,
                    ease: "power1.inOut"
                }, "jump" + index);

                tl.to(unit.sprite.position, {
                    y: Math.max(targetY, currentH * H_STEP) + 25, // 頂点（少し高めに跳ねる）
                    duration: duration * 0.5,
                    ease: "power2.out"
                }, "jump" + index);

                tl.to(unit.sprite.position, {
                    y: targetY,
                    duration: duration * 0.5,
                    ease: "power2.in",
                    onComplete: () => {
                        unit.x = node.x;
                        unit.z = node.z;
                        unit.h = node.h;
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
                        unit.x = node.x;
                        unit.z = node.z;
                        unit.h = node.h;
                    }
                });
            }
            
            currentH = node.h; // 次のステップのために現在の高さを更新
        });
    }

    /**
     * 攻撃を実行する
     */
    executeAttack(attacker, target, allUnits, camera, callback, scene) {
        // 攻撃者の方を向く
        attacker.lookAtNode(target.x, target.z);
        target.lookAtNode(attacker.x, attacker.z);

        if (attacker.setAnimation) attacker.setAnimation('attack');

        // ダメージ計算（簡易）
        const damage = Math.max(1, attacker.str - Math.floor(target.def / 2));
        
        // 攻撃ヒット時の演出
        setTimeout(() => {
            target.hp -= damage;
            if (target.hp < 0) target.hp = 0;

            // ヒット時の揺れ演出
            if (target.sprite) {
                gsap.to(target.sprite.position, {
                    x: target.sprite.position.x + (Math.random() - 0.5) * 10,
                    duration: 0.05,
                    repeat: 5,
                    yoyo: true
                });
            }

            // ダメージ数字表示
            this.uiCtrl.showDamageText(target, damage, scene, camera);

            // 死亡判定
            if (target.hp <= 0) {
                setTimeout(() => {
                    if (target.setAnimation) target.setAnimation('die');
                    // 死亡後、少し経ってからスプライトを消す、あるいは半透明にする等の処理
                    gsap.to(target.sprite.scale, { x: 0, y: 0, z: 0, duration: 0.5, delay: 0.5 });
                    if (target.shadow) target.shadow.visible = false;
                }, 300);
            } else {
                if (target.setAnimation) target.setAnimation('damage');
                setTimeout(() => {
                    if (target.hp > 0 && target.setAnimation) target.setAnimation('idle');
                }, 500);
            }

            // 攻撃終了
            setTimeout(() => {
                if (attacker.setAnimation) attacker.setAnimation('idle');
                if (callback) callback();
            }, 600);

        }, 500);
    }
}
