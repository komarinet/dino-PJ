export const VERSION = "8.16.0";

export class CameraControl {
    constructor(camera, controls) {
        this.camera = camera;
        this.controls = controls;
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

    playOpening(boss, player, callback) {
        if (!boss) { callback(); return; }
        this.centerOn(boss.sprite.position, 2.5);
        setTimeout(() => {
            this.centerOn(player.sprite.position, 1.5);
            setTimeout(callback, 1500);
        }, 3000);
    }
}
