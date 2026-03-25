/* ui.js - v8.20.25 */
export const VERSION = "8.20.25";

export class UIControl {
    constructor(cameraCtrl) {
        this.cameraCtrl = cameraCtrl;
        this.dom = {
            statusUi: document.getElementById('status-ui'),
            detailUi: document.getElementById('detail-ui'),
            commandUi: document.getElementById('command-ui'),
            targetUi: document.getElementById('target-ui'),
            confirmUi: document.getElementById('confirm-ui'),
            eventUi: document.getElementById('event-ui'),
            evNamePlate: document.getElementById('ev-name-plate'),
            evText: document.getElementById('ev-text'),
            evPortrait: document.getElementById('ev-portrait'),
            msgArea: document.getElementById('msg-area')
        };
    }

    setMsg(text, color = "#fff") {
        if(!this.dom.msgArea) return;
        this.dom.msgArea.innerText = text;
        this.dom.msgArea.style.color = color;
        this.dom.msgArea.style.opacity = 1;
        setTimeout(() => { this.dom.msgArea.style.opacity = 0; }, 2000);
    }

    hideAll() {
        const wins = [this.dom.statusUi, this.dom.detailUi, this.dom.commandUi, this.dom.targetUi, this.dom.confirmUi, this.dom.eventUi];
        wins.forEach(el => { if(el) el.style.display = 'none'; });
    }

    showStatus(unit) {
        this.hideAll();
        this.dom.statusUi.style.display = 'block';
        const hpPer = (unit.hp / unit.maxHp) * 100;
        this.dom.statusUi.innerHTML = `
            <div class="unit-name">${unit.id} Lv.${unit.level}</div>
            <div style="font-size:0.8rem;">HP ${unit.hp}/${unit.maxHp}</div>
            <div class="bar-bg"><div class="hp-bar" style="width:${hpPer}%"></div></div>
        `;
    }

    updateCommandMenu(unit) {
        const btnMove = document.getElementById('cmd-move');
        if(btnMove) btnMove.disabled = unit.hasMoved;
    }

    renderTalkLine(data, units, player) {
        if(!this.dom.eventUi) return;
        this.dom.evNamePlate.innerText = data.name;
        // ★修正：確実にinnerHTMLでルビ付きテキストを流し込む
        this.dom.evText.innerHTML = data.text || "";

        const speaker = units.find(u => u.id === data.name);
        if (speaker) {
            this.dom.evPortrait.innerText = speaker.emoji;
            // ★ Box3による中心補正をここでも実行
            const targetCenter = new THREE.Vector3();
            new THREE.Box3().setFromObject(speaker.sprite).getCenter(targetCenter);
            this.cameraCtrl.centerOn(targetCenter);
        }
    }

    showDamageText(targetUnit, damage, scene, camera) {
        const vector = targetUnit.sprite.position.clone();
        vector.y += 50;
        vector.project(camera);
        const canvas = document.querySelector('canvas');
        const x = (vector.x * 0.5 + 0.5) * canvas.clientWidth;
        const y = (-vector.y * 0.5 + 0.5) * canvas.clientHeight;

        const el = document.createElement('div');
        el.className = 'floating-text'; // style.cssの既存クラスを使用
        el.innerText = damage;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.color = targetUnit.isPlayer ? '#ff5555' : '#ffffff';
        document.body.appendChild(el);

        gsap.to(el, { y: y - 50, opacity: 0, duration: 0.8, onComplete: () => el.remove() });
    }
}
