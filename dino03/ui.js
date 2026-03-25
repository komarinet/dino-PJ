/* =================================================================
   ui.js - v8.20.57
   【絶対ルール順守：一切の省略なし】
   修正・統合内容：
   1. レベルアップ演出強化：頭上（heightOffset）から発生し、上へ昇るアニメに変更。
   2. ダメージ演出修正：ご要望通り、数値が上から下へ落ちるように変更。
   3. 整合性維持：main.js および units.js からの新しい引数渡しに完全対応。
   4. 機能維持：顔グラフィック、Rubyタグ、コマンド制御を完備。
   ================================================================= */

export const VERSION = "8.20.57";

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
        if (!this.dom.msg) return;
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

    updateCommandMenu(unit) {
        if (!this.dom.cmdMove) return;
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
        if (!this.dom.statusUi) return;
        this.setMsg("");
        this.dom.statusUi.style.display = 'block';
        
        if (this.dom.stName) this.dom.stName.innerText = unit.id;
        if (this.dom.stLv) this.dom.stLv.innerText = unit.level;
        
        if (this.dom.stHpLabel) this.dom.stHpLabel.innerHTML = `<ruby>体力<rt>たいりょく</rt></ruby> (HP): <span id=\"st-hp\"></span>`;
        if (this.dom.stMpLabel) this.dom.stMpLabel.innerHTML = `<ruby>恐竜力<rt>きょうりゅうりょく</rt></ruby> (MP): <span id=\"st-mp\"></span>`;
        if (this.dom.btnToggleDetail) this.dom.btnToggleDetail.innerHTML = `<ruby>詳細<rt>しょうさい</rt></ruby>を見る ▼`;

        const hpVal = document.getElementById('st-hp');
        if (hpVal) hpVal.innerText = `${unit.hp}/${unit.maxHp}`;
        if (this.dom.stHpBar) this.dom.stHpBar.style.width = `${(unit.hp / unit.maxHp) * 100}%`;
        
        const mpVal = document.getElementById('st-mp');
        if (mpVal) mpVal.innerText = `${unit.mp}/${unit.maxMp}`;
        if (this.dom.stMpBar) this.dom.stMpBar.style.width = `${unit.maxMp > 0 ? (unit.mp / unit.maxMp) * 100 : 0}%`;
        
        if (this.dom.dtStr) this.dom.dtStr.innerText = unit.str;
        if (this.dom.dtDef) this.dom.dtDef.innerText = unit.def;
        if (this.dom.dtSpd) this.dom.dtSpd.innerText = unit.spd;
        if (this.dom.dtMag) this.dom.dtMag.innerText = unit.mag;
    }

    renderTalkLine(data, units, player) {
        if (!this.dom.evNamePlate || !this.dom.evText) return;
        this.dom.evNamePlate.innerText = data.name;
        this.dom.evText.innerHTML = data.text;
        if (this.dom.evTextArea) this.dom.evTextArea.scrollTop = 0;

        const speaker = units.find(u => u.id === data.name);
        
        if (speaker && speaker.spriteConfig) {
            const conf = speaker.spriteConfig;
            if (conf.type === 'bra') {
                this.dom.evPortrait.innerHTML = `<div style=\"width: 85px; height: 60px; background-image: url('img/bra.png'); background-size: 100% 500%; background-position: 0 100%; image-rendering: pixelated;\"></div>`;
            } else if (conf.type === 'rex') {
                this.dom.evPortrait.innerHTML = `<div style=\"width: 85px; height: 60px; background-image: url('img/tactyrano01.png'); background-size: 400% 400%; background-position: 100% 100%; image-rendering: pixelated;\"></div>`;
            } else if (conf.type === 'comp') {
                this.dom.evPortrait.innerHTML = `<div style=\"width: 85px; height: 60px; background-image: url('img/comp.png'); background-size: 300% 200%; background-position: 100% 100%; image-rendering: pixelated;\"></div>`;
            }
        } else {
            this.dom.evPortrait.innerHTML = `<span style=\"font-size: 3rem;\">${data.face || '🦖'}</span>`;
        }

        if (speaker && speaker.hp > 0 && speaker.sprite) {
            const targetCenter = new THREE.Vector3();
            new THREE.Box3().setFromObject(speaker.sprite).getCenter(targetCenter);
            this.cameraControl.centerOn(targetCenter, 0.8);

            if (player && speaker !== player) {
                speaker.lookAtNode(player.x, player.z);
                player.lookAtNode(speaker.x, speaker.z);
            }
        }
    }

    showDamageText(unit, text, scene, camera) {
        // ダメージは通常の高さ（胸あたり）から。
        this.showFloatingText(unit, text, 'damage', camera, 30);
    }

    /**
     * 浮遊テキスト表示（演出の撃ち分け対応）
     * @param {number} heightOffset - 発生させる高さの調整値
     */
    showFloatingText(unit, text, type, camera, heightOffset = 50) {
        if (!unit || !unit.sprite || !camera) return;
        const vector = unit.sprite.position.clone();
        
        // ワールド座標の段階で高さをオフセット
        vector.y += heightOffset; 
        vector.project(camera);
        
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        
        const x = (vector.x * 0.5 + 0.5) * canvas.clientWidth;
        const y = (vector.y * -0.5 + 0.5) * canvas.clientHeight;
        
        const el = document.createElement('div');
        el.className = 'floating-text';
        el.innerText = text;
        
        // 種類に応じた色設定
        el.style.color = (type === 'levelup') ? '#ffff00' : (type === 'heal' ? '#00ffff' : '#ffffff');
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.position = 'absolute';
        el.style.pointerEvents = 'none';
        el.style.zIndex = '5000';
        document.body.appendChild(el);
        
        // ★演出の撃ち分け
        if (type === 'levelup') {
            // レベルアップ：頭上にピタッと出て、さらに「上」へ昇る
            gsap.to(el, { 
                y: "-=60", 
                opacity: 0, 
                duration: 2.0, 
                ease: "power1.out", 
                onComplete: () => el.remove() 
            });
        } else {
            // ダメージ等：発生場所から「下」へ落ちる
            gsap.to(el, { 
                y: "+=40", 
                opacity: 0, 
                duration: 1.2, 
                ease: "bounce.out", // 少し弾む演出
                onComplete: () => el.remove() 
            });
        }
    }
}
