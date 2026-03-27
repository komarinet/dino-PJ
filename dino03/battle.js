/* =================================================================
   battle.js - v8.21.01
   【絶対ルール遵守：一切の省略なし】
   修正・統合内容：
   1. ルビ徹底：指示に従い、割り込み台詞およびシステムメッセージの全漢字にルビを付与。
   2. バージョン同期：システム診断画面との整合性のため v8.21.01 へ更新。
   3. ロジック保護：移動(executeMovement)、攻撃(executeAttack)、反撃、高低差補正を完全維持。
   4. 演出維持：ヒット時の揺れ、死亡時のスケールダウン消滅演出を継承。
   ================================================================= */

export const VERSION = "8.21.01";

import { TILE_SIZE, H_STEP, MAP_W, MAP_D } from './map.js';

export class BattleSystem {
    constructor(uiCtrl, cameraCtrl) {
        this.uiCtrl = uiCtrl;
        this.cameraCtrl = cameraCtrl;
    }

    /**
     * ユニットの移動処理（スライド＆ジャンプ）
     * @param {number} speedMultiplier - 速度倍率。1.0より大きいと遅くなります。
     */
    executeMovement(unit, path, callback, speedMultiplier = 1.0) {
        if (!path || path.length === 0) {
            if (callback) callback();
            return;
        }

        const tl = gsap.timeline({
            onStart: () => { if (unit.setIdle) unit.setIdle(); },
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
            
            const duration = (isStep ? 0.35 : 0.25) * speedMultiplier;

            tl.to({}, {
                duration: 0.01,
                onStart: () => { unit.lookAtNode(node.x, node.z); }
            });

            if (isStep) {
                // 段差ジャンプ
                tl.to(unit.sprite.position, {
                    x: targetX, z: targetZ, duration: duration, ease: "power1.inOut"
                }, "jump" + index);

                tl.to(unit.sprite.position, {
                    y: Math.max(targetY, currentH * H_STEP) + 25, duration: duration * 0.5, ease: "power2.out"
                }, "jump" + index);

                tl.to(unit.sprite.position, {
                    y: targetY, duration: duration * 0.5, ease: "power2.in",
                    onComplete: () => { unit.x = node.x; unit.z = node.z; unit.h = node.h; }
                }, "jump" + index + "+=" + (duration * 0.5));
            } else {
                // 平地スライド
                tl.to(unit.sprite.position, {
                    x: targetX, z: targetZ, y: targetY, duration: duration, ease: "none",
                    onComplete: () => { unit.x = node.x; unit.z = node.z; unit.h = node.h; }
                });
            }
            currentH = node.h;
        });
    }

    /**
     * 攻撃の実行
     */
    executeAttack(attacker, target, allUnits, camera, callback, scene, isCounter = false) {
        attacker.lookAtNode(target.x, target.z);
        target.lookAtNode(attacker.x, attacker.z);

        if (attacker.setAction) attacker.setAction('ATTACK');

        // ダメージ計算（高低差補正）
        const hDiff = attacker.h - target.h;
        let hBonus = 1.0;
        if (hDiff > 0) hBonus = 1.2;
        else if (hDiff < 0) hBonus = 0.8;

        const damageBase = attacker.str - Math.floor(target.def / 2);
        const damage = Math.max(1, Math.floor(damageBase * hBonus));
        
        setTimeout(() => {
            target.hp -= damage;
            if (target.hp < 0) target.hp = 0;

            // ヒット揺れ
            if (target.sprite) {
                gsap.to(target.sprite.position, {
                    x: target.sprite.position.x + (Math.random() - 0.5) * 10,
                    duration: 0.05, repeat: 5, yoyo: true
                });
            }

            // ダメージ表示
            if (this.uiCtrl) this.uiCtrl.showDamageText(target, damage, scene, camera);

            if (target.hp <= 0) {
                // ★序章限定：ママティラノ/チビティラノ撃破時の割り込み台詞（ルビ付き）
                if (target.displayName === "ママティラノ") {
                    this.uiCtrl.renderTalkLine({ 
                        name: "チビティラノ", 
                        text: "お<ruby>母<rt>かあ</rt></ruby>さん！ よくもお<ruby>母<rt>かあ</rt></ruby>さんを！" 
                    }, allUnits);
                } else if (target.displayName === "チビティラノ") {
                    this.uiCtrl.renderTalkLine({ 
                        name: "ママティラノ", 
                        text: "<ruby>坊<rt>ぼう</rt></ruby>や！ よくも<ruby>私<rt>わたし</rt></ruby>の<ruby>子<rt>こ</rt></ruby><ruby>供<rt>ども</rt></ruby>を！ <ruby>許<rt>ゆる</rt></ruby>さない！" 
                    }, allUnits);
                }

                // 経験値獲得
                if (attacker.isPlayer && attacker.addExp) {
                    const expGain = target.id.includes('コンプ') ? 50 : 100;
                    attacker.addExp(expGain, this.uiCtrl, camera);
                }

                // 死亡演出
                setTimeout(() => {
                    if (target.setAction) target.setAction('DOWN');
                    gsap.to(target.sprite.scale, { x: 0, y: 0, z: 0, duration: 0.5, delay: 0.5 });
                    if (target.shadow) target.shadow.visible = false;
                    
                    setTimeout(() => {
                        if (attacker.setIdle) attacker.setIdle();
                        if (callback) callback();
                    }, 600);
                }, 300);

            } else {
                // 生存：被弾アクション
                if (target.setAction) target.setAction('HURT');
                
                setTimeout(() => {
                    if (target.hp > 0 && target.setIdle) target.setIdle();
                    
                    // 反撃ロジック
                    const dist = Math.abs(attacker.x - target.x) + Math.abs(attacker.z - target.z);
                    const canReach = (dist === 1 && Math.abs(attacker.h - target.h) <= 1);

                    if (!isCounter && canReach) {
                        this.uiCtrl.setMsg("<ruby>反撃<rt>はんげき</rt></ruby>！", "#ffaa00");
                        setTimeout(() => {
                            this.executeAttack(target, attacker, allUnits, camera, callback, scene, true);
                        }, 500);
                    } else {
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
