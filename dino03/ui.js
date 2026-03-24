export const VERSION = "8.18.0";

export class UIControl {
    constructor(cameraControl) {
        this.cameraControl = cameraControl;
        
        this.dom = {
            msg: document.getElementById('msg-ui'),
            statusUi: document.getElementById('status-ui'),
            stName: document.getElementById('st-name'),
            stLv: document.getElementById('st-lv'),
            stHpLabel: document.getElementById('st-hp-label'),
            stHp: document.getElementById('st-hp'),
            stHpBar: document.getElementById('st-hp-bar'),
            stMpLabel: document.getElementById('st-mp-label'),
            stMp: document.getElementById('st-mp'),
            stMpBar: document.getElementById('st-mp-bar'),
            btnToggleDetail: document.querySelector('#status-ui .btn-toggle-detail'),
            detailUi: document.getElementById('detail-ui'),
            dtStr: document.getElementById('dt-str'),
            dtDef: document.getElementById('dt-def'),
            dtSpd: document.getElementById('dt-spd'),
            dtMag: document.getElementById('dt-mag'),
            commandUi: document.getElementById('command-ui'),
            // ★ 追加：コマンドボタンのキャッシュ
            cmdMove: document.getElementById('cmd-move'),
            cmdAttack: document.getElementById('cmd-attack'),
            cmdWait: document.getElementById('cmd-wait'),
            targetUi: document.getElementById('target-ui'),
            confirmUi: document.getElementById('confirm-ui'),
            eventUi: document.getElementById('event-ui'),
            evPortrait: document.getElementById('ev-portrait'),
            evNamePlate: document.getElementById('ev-name-plate'),
            evText: document.getElementById('ev-text'),
            evTextArea: document.getElementById('ev-text-area')
        };
    }

    setMsg(txt, color = "#ffffff") {
        if (!txt) {
            this.dom.msg.style.display = 'none';
        } else {
            this.dom.msg.style.display = 'block';
            this.dom.msg.innerHTML = txt;
            this.dom.msg.style.color = color;
        }
    }

    hideAll() {
        const windows = [
            this.dom.statusUi, this.dom.detailUi, this.dom.commandUi, 
            this.dom.confirmUi, this.dom.targetUi, this.dom.eventUi
        ];
        windows.forEach(el => {
            if (el) el.style.display = 'none';
        });
    }

    // ★ 追加：移動済み状態によって「移動」ボタンをグレーアウトする処理
    updateCommandMenu(unit) {
        if (unit.hasMoved) {
            this.dom.cmdMove.disabled = true;
            this.dom.cmdMove.style.color = '#777';
            this.dom.cmdMove.style.cursor = 'not-allowed';
        } else {
            this.dom.cmdMove.disabled = false;
            this.dom.cmdMove.style.color = 'white';
            this.dom.cmdMove.style.cursor = 'pointer';
        }
    }

    showStatus(unit) {
        this.setMsg("");
        this.dom.statusUi.style.display = 'block';
        
        this.dom.stName.innerText = unit.id;
        this.dom.stLv.innerText = unit.level;
        
        this.dom.stHpLabel.innerHTML = `<ruby>体力<rt>たいりょく</rt></ruby> (HP): <span id="st-hp"></span>`;
        this.dom.stMpLabel.innerHTML = `<ruby>恐竜力<rt>きょうりゅうりょく</rt></ruby> (MP): <span id="st-mp"></span>`;
        if(this.dom.btnToggleDetail) this.dom.btnToggleDetail.innerHTML = `<ruby>詳細<rt>しょうさい</rt></ruby>を見る ▼`;

        document.getElementById('st-hp').innerText = `${unit.hp}/${unit.maxHp}`;
        this.dom.stHpBar.style.width = `${(unit.hp / unit.maxHp) * 100}%`;
        
        document.getElementById('st-mp').innerText = `${unit.mp}/${unit.maxMp}`;
        this.dom.stMpBar.style.width = `${(unit.mp / unit.maxMp) * 100}%`;
        
        this.dom.dtStr.innerText = unit.str;
        this.dom.dtDef.innerText = unit.def;
        this.dom.dtSpd.innerText = unit.spd;
        this.dom.dtMag.innerText = unit.mag;
    }

    renderTalkLine(data, units, player) {
        this.dom.evNamePlate.innerText = data.name;
        this.dom.evText.innerHTML = data.text;
        this.dom.evTextArea.scrollTop = 0;

        const speaker = units.find(u => u.id === data.name);
        if (speaker && speaker.spriteConfig) {
            const conf = speaker.spriteConfig;
            if (conf.type === 'bra') {
                this.dom.evPortrait.innerHTML = `<div style="width: 85px; height: 60px; background-image: url('img/bra.png'); background-size: 100% 500%; background-position: 0 100%; image-rendering: pixelated;"></div>`;
            } else if (conf.type === 'rex') {
                this.dom.evPortrait.innerHTML = `<div style="width: 85px; height: 60px; background-image: url('img/tactyrano01.png'); background-size: 400% 400%; background-position: 100% 100%; image-rendering: pixelated;"></div>`;
            } else if (conf.type === 'comp') {
                this.dom.evPortrait.innerHTML = `<div style="width: 85px; height: 60px; background-image: url('img/comp.png'); background-size: 300% 200%; background-position: 100% 100%; image-rendering: pixelated;"></div>`;
            }
        } else {
            this.dom.evPortrait.innerHTML = `<span style="font-size: 3rem;">${data.face || '🦖'}</span>`;
        }

        if (speaker && speaker.hp > 0 && speaker.sprite) {
            this.cameraControl.centerOn(speaker.sprite.position, 0.8);
            if (speaker !== player) {
                speaker.lookAtNode(player.x, player.z);
                player.lookAtNode(speaker.x, speaker.z);
            }
        }
    }

    showFloatingText(unit, text, type, camera) {
        if(!unit.sprite) return;
        const vector = unit.sprite.position.clone();
        vector.y += unit.sprite.scale.y + 10;
        vector.project(camera);
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
        
        const el = document.createElement('div');
        el.className = 'floating-text';
        el.innerText = text;
        el.style.color = (type === 'heal') ? '#00ffff' : (type === 'levelup' ? '#ffff00' : '#ffffff');
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        document.body.appendChild(el);
        
        gsap.to(el, { y: y - 100, opacity: 0, duration: 1.5, ease: "power2.out", onComplete: () => el.remove() });
    }
}
