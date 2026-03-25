/* ui.js - v8.20.27 */
export const VERSION = "8.20.27";

export class UIControl {
    constructor(cameraCtrl) {
        this.cameraCtrl = cameraCtrl;
        // HTML v8.17.1 のIDに完全準拠
        this.dom = {
            msg: document.getElementById('msg-ui'),
            statusUi: document.getElementById('status-ui'),
            stName: document.getElementById('st-name'),
            stLv: document.getElementById('st-lv'),
            stHp: document.getElementById('st-hp'),
            stHpBar: document.getElementById('st-hp-bar'),
            stMp: document.getElementById('st-mp'),
            stMpBar: document.getElementById('st-mp-bar'),
            detailUi: document.getElementById('detail-ui'),
            dtStr: document.getElementById('dt-str'),
            dtDef: document.getElementById('dt-def'),
            dtSpd: document.getElementById('dt-spd'),
            dtMag: document.getElementById('dt-mag'),
            commandUi: document.getElementById('command-ui'),
            targetUi: document.getElementById('target-ui'),
            confirmUi: document.getElementById('confirm-ui'),
            eventUi: document.getElementById('event-ui'),
            evNamePlate: document.getElementById('ev-name-plate'),
            evText: document.getElementById('ev-text'),
            evPortrait: document.getElementById('ev-portrait')
        };
    }

    setMsg(text, color = "#fff") {
        if(!this.dom.msg) return;
        this.dom.msg.innerText = text;
        this.dom.msg.style.color = color;
        this.dom.msg.style.display = 'block';
        setTimeout(() => { this.dom.msg.style.display = 'none'; }, 2000);
    }

    hideAll() {
        const wins = [
            this.dom.statusUi, this.dom.detailUi, this.dom.commandUi, 
            this.dom.targetUi, this.dom.confirmUi, this.dom.eventUi
        ];
        wins.forEach(el => { if(el) el.style.display = 'none'; });
    }

    showStatus(unit) {
        if(!this.dom.statusUi) return;
        this.hideAll();
        this.dom.statusUi.style.display = 'block';
        if(this.dom.stName) this.dom.stName.innerText = unit.id;
        if(this.dom.stLv) this.dom.stLv.innerText = unit.level;
        if(this.dom.stHp) this.dom.stHp.innerText = `${unit.hp}/${unit.maxHp}`;
        if(this.dom.stHpBar) this.dom.stHpBar.style.width = `${(unit.hp / unit.maxHp) * 100}%`;
        if(this.dom.stMp) this.dom.stMp.innerText = `${unit.mp}/${unit.maxMp}`;
        if(this.dom.stMpBar) this.dom.stMpBar.style.width = `${unit.maxMp > 0 ? (unit.mp / unit.maxMp) * 100 : 0}%`;
        
        if(this.dom.dtStr) this.dom.dtStr.innerText = unit.str;
        if(this.dom.dtDef) this.dom.dtDef.innerText = unit.def;
        if(this.dom.dtSpd) this.dom.dtSpd.innerText = unit.spd;
        if(this.dom.dtMag) this.dom.dtMag.innerText = unit.mag;
    }

    updateCommandMenu(unit) {
        const btnMove = document.getElementById('cmd-move');
        const btnAttack = document.getElementById('cmd-attack');
        if(btnMove) btnMove.disabled = unit.hasMoved;
        if(btnAttack) btnAttack.disabled = unit.hasAttacked;
    }

    renderTalkLine(data, units) {
        if(!this.dom.eventUi) return;
        this.dom.evNamePlate.innerText = data.name || "";
        // ルビ（rubyタグ）を反映させるため innerHTML を使用
        this.dom.evText.innerHTML = data.text || "";

        const speaker = units.find(u => u.id === data.name);
        if (speaker) {
            if(this.dom.evPortrait) this.dom.evPortrait.innerText = speaker.emoji;
            
            // 修正：Box3でキャラクターの中心を捉えるカメラ移動
            if (speaker.sprite) {
                const targetCenter = new THREE.Vector3();
                new THREE.Box3().setFromObject(speaker.sprite).getCenter(targetCenter);
                this.cameraCtrl.centerOn(targetCenter);
            }
        }
    }

    showDamageText(targetUnit, damage, scene, camera) {
        if(!targetUnit || !targetUnit.sprite) return;
        const vector = targetUnit.sprite.position.clone();
        vector.y += 50;
        vector.project(camera);
        const canvas = document.querySelector('canvas');
        if(!canvas) return;
        const x = (vector.x * 0.5 + 0.5) * canvas.clientWidth;
        const y = (-vector.y * 0.5 + 0.5) * canvas.clientHeight;

        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.color = targetUnit.isPlayer ? '#ff5555' : '#ffffff';
        el.style.fontWeight = 'bold';
        el.style.fontSize = '24px';
        el.style.textShadow = '2px 2px 0 #000';
        el.style.pointerEvents = 'none';
        el.style.zIndex = '10000';
        el.innerText = damage;
        document.body.appendChild(el);

        gsap.to(el, { y: y - 50, opacity: 0, duration: 0.8, onComplete: () => el.remove() });
    }
}
