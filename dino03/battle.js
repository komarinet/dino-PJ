/* =================================================================
   battle.js - v8.20.22
   修正内容：
   1. フリーズ回避：showDamageText が未実装の場合でも、処理が止まらないよう
      安全チェックを追加。これにより、敵の攻撃時にフリーズする問題を解消。
   ================================================================= */

export const VERSION = "8.20.22";

import { TILE_SIZE, H_STEP, MAP_W, MAP_D } from './map.js';

export class BattleSystem {
    constructor(uiCtrl, cameraCtrl) {
        this.uiCtrl = uiCtrl;
        this.cameraCtrl = cameraCtrl;
    }

    executeMovement(unit, path, callback) {
        if (!path || path.length === 0) {
            if (callback) callback();
            return;
        }

        const tl = gsap.timeline({
            onStart: () => { if (unit.setAnimation) unit.setAnimation('move'); },
            onComplete: () => {
                if (unit.setAnimation) unit.setAnimation('idle');
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

            tl.to({}, { duration: 0.01, onStart: () => { unit.lookAtNode(node.x, node.z); } });

            if (isStep) {
                tl.to(unit.sprite.position, { x: targetX, z: targetZ, duration: duration, ease: "power1.inOut" }, "jump" + index);
                tl.to(unit.sprite.position, { y: Math.max(targetY, currentH * H_STEP) + 25, duration: duration * 0.5, ease: "power2.out" }, "jump" + index);
                tl.to(unit.sprite.position, {
                    y: targetY, duration: duration * 0.5, ease: "power2.in",
                    onComplete: () => { unit.x = node.x; unit.z = node.z; unit.h = node.h; }
                }, "jump" + index + "+=" + (duration * 0.5));
            } else {
                tl.to(unit.sprite.position, {
                    x: targetX, z: targetZ, y: targetY, duration: duration, ease: "none",
                    onComplete: () => { unit.x = node.x; unit.z = node.z; unit.h = node.h; }
                });
            }
            currentH = node.h;
        });
    }

    executeAttack(attacker, target, allUnits, camera, callback, scene) {
        attacker.lookAtNode(target.x, target.z);
        target.lookAtNode(attacker.x, attacker.z);
        if (attacker.setAnimation) attacker.setAnimation('attack');

        const damage = Math.max(1, attacker.str - Math.floor(target.def / 2));
        
        setTimeout(() => {
            target.hp -= damage;
            if (target.hp < 0) target.hp = 0;

            if (target.sprite) {
                gsap.to(target.sprite.position, {
                    x: target.sprite.position.x + (Math.random() - 0.5) * 10,
                    duration: 0.05, repeat: 5, yoyo: true
                });
            }

            // ★ 修正箇所：関数が存在するかチェックし、なければスキップ（フリーズ防止）
            if (this.uiCtrl && typeof this.uiCtrl.showDamageText === 'function') {
                this.uiCtrl.showDamageText(target, damage, scene, camera);
            }

            if (target.hp <= 0) {
                setTimeout(() => {
                    if (target.setAnimation) target.setAnimation('die');
                    gsap.to(target.sprite.scale, { x: 0, y: 0, z: 0, duration: 0.5, delay: 0.5 });
                    if (target.shadow) target.shadow.visible = false;
                }, 300);
            } else {
                if (target.setAnimation) target.setAnimation('damage');
                setTimeout(() => { if (target.hp > 0 && target.setAnimation) target.setAnimation('idle'); }, 500);
            }

            setTimeout(() => {
                if (attacker.setAnimation) attacker.setAnimation('idle');
                if (callback) callback();
            }, 600);
        }, 500);
    }
}
