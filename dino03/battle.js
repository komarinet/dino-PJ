export const VERSION = "8.16.1";

export class BattleSystem {
    constructor(ui, cameraControl) {
        this.ui = ui;
        this.cameraControl = cameraControl;
    }

    // sceneを受け取って、敵を倒した時に完全に消去する
    executeAttack(attacker, defender, units, camera, onComplete, scene) {
        attacker.lookAtNode(defender.x, defender.z);
        defender.lookAtNode(attacker.x, attacker.z);
        
        if(attacker.texture) attacker.setAction('ATTACK');
        if(defender.texture) defender.setAction('HURT');

        const damage = Math.max(1, (attacker.str - defender.def) + (attacker.h - defender.h) * 2);
        const origPos = attacker.sprite.position.clone();
        
        // 攻撃アニメーションの移動量計算
        const dx = (defender.sprite.position.x - attacker.sprite.position.x) * 0.5;
        const dz = (defender.sprite.position.z - attacker.sprite.position.z) * 0.5;

        const tl = gsap.timeline({ onComplete: () => {
            defender.hp -= damage;
            this.ui.showFloatingText(defender, damage, 'damage', camera);
            
            if(attacker.texture) attacker.setIdle();
            if(defender.texture && defender.hp > 0) defender.setIdle();
            
            if(defender.hp <= 0) {
                if(defender.texture) defender.setAction('DOWN');
                if(attacker.isPlayer) {
                    attacker.exp += 100;
                    attacker.levelUp();
                    setTimeout(() => { 
                        this.ui.showFloatingText(attacker, "LEVEL UP!", 'levelup', camera); 
                        this.ui.showStatus(attacker); 
                    }, 400);
                }
                // 敵の消滅演出＋物理削除
                gsap.to(defender.sprite.scale, { delay: 0.3, x: 0, y: 0, duration: 0.5, onComplete: () => {
                    defender.dispose(scene); // ★完全消去
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
                if(followCamera) this.cameraControl.controls.target.copy(unit.sprite.position); 
            }});
            tl.to(unit.sprite.position, { y: tY + 20, duration: 0.125, yoyo: true, repeat: 1 }, "<");
            tl.set(unit.sprite.position, { y: tY });
        });
    }

    decideEnemyAI(units, player) {
        const enemies = units.filter(u => !u.isPlayer && u.hp > 0);
        const compAB_alive = enemies.some(u => u.id === 'コンプソグナトゥスA' || u.id === 'コンプソグナトゥスB');
        const anyComp_alive = enemies.some(u => u.id.includes('コンプソグナトゥス'));

        return enemies.filter(e => {
            const dist = Math.abs(e.x - player.x) + Math.abs(e.z - player.z);
            if (e.id.match(/[AB]$/)) return true;
            if (e.id.match(/[CD]$/)) return (!compAB_alive || dist <= 5);
            if (e.id === 'ブラキオサウルス') return !anyComp_alive;
            return false;
        });
    }
}
