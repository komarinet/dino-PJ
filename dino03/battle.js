/* =================================================================
   battle.js - v8.20.0
   変更点：フリーズ防止のための非同期管理の強化
   ================================================================= */

export const VERSION = "8.20.0";
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
                // 安全のため、少し待ってからコールバックを実行
                setTimeout(() => { if(onComplete) onComplete(); }, 50);
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

    executeAttack(attacker, defender, units, camera, onComplete, scene, isCounter = false) {
        attacker.setAction('ATTACK');
        
        const origX = attacker.sprite.position.x;
        const targetX = defender.sprite.position.x;
        const atkDir = targetX > origX ? 1 : -1;
        
        attacker.facing = atkDir;
        if(attacker.sprite) attacker.sprite.scale.x = attacker.baseScaleX * atkDir;

        gsap.to(attacker.sprite.position, {
            x: targetX - (20 * atkDir),
            duration: 0.2,
            yoyo: true,
            repeat: 1,
            onRepeat: () => {
                defender.setAction('HURT');
                let dmg = Math.max(1, attacker.str - defender.def);
                defender.hp -= dmg;
                this.uiCtrl.showFloatingText(defender, dmg, 'damage', camera);

                if (defender.hp <= 0) {
                    defender.setAction('DOWN');
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
                    
                    if (!isCounter) {
                        const dist = Math.abs(attacker.x - defender.x) + Math.abs(attacker.z - defender.z);
                        // 高低差チェックも念のため追加（1以内なら反撃）
                        if (dist <= 1 && Math.abs(attacker.h - defender.h) <= 1) { 
                            setTimeout(() => {
                                this.uiCtrl.setMsg(`${defender.id} の反撃！`, "#ffcc00");
                                this.executeAttack(defender, attacker, units, camera, onComplete, scene, true);
                            }, 500);
                            return; 
                        }
                    }
                }
                
                setTimeout(() => {
                    if (onComplete) onComplete();
                }, 500);
            }
        });
    }

    decideEnemyAI(units, player) {
        return units.filter(u => !u.isPlayer && u.hp > 0 && !u.hasActed);
    }
}
