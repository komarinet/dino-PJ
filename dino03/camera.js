export const VERSION = "8.17.0";

export class CameraControl {
    constructor(camera, controls) {
        this.camera = camera;
        this.controls = controls;
    }

    // ★ 追加：最初から「タクティクスらしい斜め見下ろし」に固定する
    setInitialAngle(targetPos) {
        this.controls.target.copy(targetPos);
        const rad = 45 * (Math.PI / 180);
        const distance = 800; // 引いた距離
        this.camera.position.set(
            targetPos.x + Math.sin(rad) * distance,
            targetPos.y + 600, // 高さを出す（見下ろす）
            targetPos.z + Math.cos(rad) * distance
        );
        this.camera.lookAt(this.controls.target);
        this.controls.update();
    }

    centerOn(pos, dur = 0.8) {
        gsap.to(this.controls.target, { x: pos.x, z: pos.z, duration: dur, ease: "power1.inOut" });
    }

    setZoom(z, dur = 1.0) {
        gsap.to(this.camera, { zoom: z, duration: dur, onUpdate: () => this.camera.updateProjectionMatrix() });
    }

    rotate(deg) {
        const r = this.controls.getDistance();
        const polar = this.controls.getPolarAngle();
        const startAz = this.controls.getAzimuthalAngle();
        const targetAz = startAz + (deg * Math.PI / 180);
        const proxy = { angle: startAz };
        
        gsap.to(proxy, { angle: targetAz, duration: 0.4, onUpdate: () => {
            this.camera.position.x = this.controls.target.x + r * Math.sin(proxy.angle) * Math.sin(polar);
            this.camera.position.z = this.controls.target.z + r * Math.cos(proxy.angle) * Math.sin(polar);
            this.camera.lookAt(this.controls.target);
            this.controls.update();
        }});
    }

    pan(dx, dy) {
        const panScale = 150;
        const ang = this.controls.getAzimuthalAngle();
        const moveX = (dx * Math.cos(ang) + dy * Math.sin(ang)) * panScale;
        const moveZ = (-dx * Math.sin(ang) + dy * Math.cos(ang)) * panScale;
        gsap.to(this.camera.position, { x: this.camera.position.x + moveX, z: this.camera.position.z + moveZ, duration: 0.3 });
        gsap.to(this.controls.target, { x: this.controls.target.x + moveX, z: this.controls.target.z + moveZ, duration: 0.3 });
    }

    // ★ 変更：鳥の視点で飛び、クローズアップしていく演出
    playOpening(boss, player, callback) {
        if (!boss || !player) { callback(); return; }
        
        // 1. 最初は「引き（ズーム1.0）」でプレイヤー付近からスタート
        this.setZoom(1.0, 0); 
        
        // 2. ボスに向かって、マップ全体を斜め上から舐めるようにパン移動
        gsap.to(this.controls.target, {
            x: boss.sprite.position.x,
            z: boss.sprite.position.z,
            duration: 4.0, // ゆったりと飛ぶ
            ease: "power1.inOut",
            onComplete: () => {
                // 3. ボスに到着後、プレイヤーへ戻りつつ「ズームイン」
                setTimeout(() => {
                    this.setZoom(2.5, 2.0); // クローズアップ！
                    gsap.to(this.controls.target, {
                        x: player.sprite.position.x,
                        z: player.sprite.position.z,
                        duration: 2.0,
                        ease: "power2.inOut",
                        onComplete: callback // ズームしきったら会話スタート
                    });
                }, 800);
            }
        });
    }
}
