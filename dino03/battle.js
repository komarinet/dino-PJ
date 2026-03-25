/* =================================================================
   battle.js - v8.20.59
   【絶対ルール遵守：一切の省略なし】
   統合内容：
   1. 演出対応：executeMovement に speedMultiplier を完備。退場等の「ゆっくり歩き」に対応。
   2. 戦闘ロジック：高低差ダメージ補正（1.2倍/0.8倍）と経験値獲得（addExp）を維持。
   3. 反撃システム：生存時の自動反撃ロジックを完全継承。
   4. 演出：ジャンプ移動、ヒット時の揺れ、死亡時の消滅演出を完備。
   ================================================================= */

export const VERSION = "8.20.59";

import { TILE_SIZE, H_STEP, MAP_W, MAP_D } from './map.js';

export class BattleSystem {
    constructor(uiCtrl, cameraCtrl) {
        this.uiCtrl = uiCtrl;
        this.cameraCtrl = cameraCtrl;
    }

    /**
     * ユニットの移動処理（スライド＆ジャンプ）
     * @param {number} speedMultiplier - 速度倍率。1.0より大きいと遅くなります（エンディング演出等で使用）
     */
    executeMovement(unit, path, callback, speedMultiplier = 1.0) {
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
            
            // 速度倍率を適用（2.0なら通常の2倍の時間をかけてゆっくり移動）
            const duration = (isStep ? 0.35 : 0.25) * speedMultiplier;

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
     * 攻撃の実行（反撃・高低差補正・撃破判定）
     * @param {boolean} isCounter - 反撃としての呼び出しかどうか
     */
    executeAttack(attacker, target, allUnits, camera, callback, scene, isCounter = false) {
        attacker.lookAtNode(target.x, target.z);
        target.lookAtNode(attacker.x, attacker.z);

        if (attacker.setAction) attacker.setAction('ATTACK');

        // --- ダメージ計算（高低差補正の適用） ---
        const hDiff = attacker.h - target.h;
        let hBonus = 1.0;
        if (hDiff > 0) hBonus = 1.2;      // 高いところから攻撃（有利）
        else if (hDiff < 0) hBonus = 0.8; // 低いところから攻撃（不利）

        const damageBase = attacker.str - Math.floor(target.def / 2);
        const damage = Math.max(1, Math.floor(damageBase * hBonus));
        
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

            // ダメージ数字の表示
            if (this.uiCtrl && typeof this.uiCtrl.showDamageText === 'function') {
                this.uiCtrl.showDamageText(target, damage, scene, camera);
            }

            if (target.hp <= 0) {
                // 撃破時：経験値獲得
                if (attacker.isPlayer && attacker.addExp) {
                    const expGain = target.id.includes('コンプ') ? 50 : 100;
                    attacker.addExp(expGain, this.uiCtrl, camera);
                }

                // 死亡演出
                setTimeout(() => {
                    if (target.setAction) target.setAction('DOWN');
                    gsap.to(target.sprite.scale, { x: 0, y: 0, z: 0, duration: 0.5, delay: 0.5 });
                    if (target.shadow) target.shadow.visible = false;
                    
                    // 終了（main.js側のコールバックへ）
                    setTimeout(() => {
                        if (attacker.setIdle) attacker.setIdle();
                        if (callback) callback();
                    }, 600);
                }, 300);

            } else {
                // 生存時：被弾アクション
                if (target.setAction) target.setAction('HURT');
                
                setTimeout(() => {
                    if (target.hp > 0 && target.setIdle) target.setIdle();
                    
                    // --- 反撃ロジック ---
                    // 反撃中でない、かつ相手が隣接射程内、かつ高低差1以内の場合に反撃
                    const dist = Math.abs(attacker.x - target.x) + Math.abs(attacker.z - target.z);
                    const canReach = (dist === 1 && Math.abs(attacker.h - target.h) <= 1);

                    if (!isCounter && canReach) {
                        this.uiCtrl.setMsg("反撃！", "#ffaa00");
                        setTimeout(() => {
                            this.executeAttack(target, attacker, allUnits, camera, callback, scene, true);
                        }, 500);
                    } else {
                        // 終了
                        setTimeout(() => {
                            if (attacker.setIdle) attacker.setIdle();
                            if (callback) callback();
                        }, 200);
                    }
                }, 500);
            }
        }, 500);
    }
}
