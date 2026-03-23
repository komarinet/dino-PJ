export const VERSION = "8.16.0";
import { gameStore } from './store.js';

export class BattleSystem {
    constructor(ui, cameraControl) {
        this.ui = ui;
        this.cameraControl = cameraControl;
    }

    executeAttack(attacker, defender, units, camera, onComplete, scene) {
        attacker.lookAtNode(defender.x, defender.z);
        defender.lookAtNode(attacker.x, attacker.z);
        if (attacker.sprite) attacker.setAction('ATTACK');
        if (defender.sprite) defender.setAction('HURT');

        const damage = Math.max(1, (attacker.str - defender.def) + (attacker.h - defender.h) * 2);
        const origPos = attacker.sprite.position.clone();
        const dx = (defender.sprite.position.x - attacker.sprite.position.x) * 0.5;
        const dz = (defender.sprite.position.z - attacker.sprite.position.z) * 0.5;

        const tl = gsap.timeline({ onComplete: () => {
            defender.hp -= damage;
            this.ui.showFloatingText(defender, damage, 'damage', camera);
            if (attacker.sprite) attacker.setIdle();
            if (defender.sprite && defender.hp > 0) defender.setIdle();
            
            if (defender.hp <= 0) {
                // 物理削除シーケンス
                gsap.to(defender.sprite.scale, { delay: 0.3, x: 0, y: 0, duration: 0.5, onComplete: () => {
                    defender.dispose(scene); // シーンから完全に消去
                    onComplete();
                }});
            } else {
                onComplete();
            }
        }});
        tl.to(attacker.sprite.position, { x: origPos.x + dx, z: origPos.z + dz, duration: 0.15, ease: "power2.in" });
        tl.to(attacker.sprite.position, { x: origPos.x, z: origPos.z, duration: 0.2 });
    }

    executeMovement(unit, path, onComplete, followCamera = false) {
        const tl = gsap.timeline({ onComplete: () => {
            const last = path[path.length - 1];
            unit.x = last.x; unit.z = last.z; unit.h = last.h;
            onComplete();
        }});
        path.forEach(step => {
            const tX = (step.x * 60) - (25 * 60) / 2;
            const tZ = (step.z * 60) - (25 * 60) / 2;
            const tY = step.h * 30;
            tl.call(() => unit.lookAtNode(step.x, step.z));
            tl.to(unit.sprite.position, { x: tX, z: tZ, duration: 0.25, onUpdate: () => { 
                if (followCamera) this.cameraControl.controls.target.copy(unit.sprite.position); 
            }});
            tl.to(unit.sprite.position, { y: tY + 20, duration: 0.125, yoyo: true, repeat: 1 }, "<");
            tl.set(unit.sprite.position, { y: tY });
        });
    }

    decideEnemyAI(units, player) {
        const enemies = units.filter(u => !u.isPlayer && u.hp > 0);
        return enemies.filter(e => {
            const dist = Math.abs(e.x - player.x) + Math.abs(e.z - player.z);
            if (e.id.match(/[AB]$/)) return true;
            if (e.id.match(/[CD]$/)) return (dist <= 5); // 近くに来たら動く
            return false;
        });
    }
}
