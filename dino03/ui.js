/* =================================================================
   ui.js - v8.20.31
   【絶対ルール遵守：一切の省略なし】
   復元・統合内容：
   1. v8.18.0 の顔グラフィック表示ロジック（CSS切り出し）を完全復元。
   2. コマンドボタンのグレーアウト＆カーソル制御を完全復元。
   3. ステータス窓の Ruby タグ更新ロジックを完全復元。
   4. 最新の Box3 カメラ補正およびダメージ表示 (showDamageText) を統合。
   ================================================================= */

export const VERSION = "8.20.31";

export class UIControl {
    constructor(cameraControl) {
        this.cameraControl = cameraControl;
        
        // HTML v8.17.1 の ID 構造に 100% 準拠
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

    /**
     * メッセージの表示・非表示
     */
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

    /**
     * すべてのウィンドウを非表示にする
     */
    hideAll() {
        const windows = [
            this.dom.statusUi, this.dom.detailUi, this.dom.commandUi, 
            this.dom.confirmUi, this.dom.targetUi, this.dom.eventUi
        ];
        windows.forEach(el => {
            if (el) el.style.display = 'none';
        });
    }

    /**
     * コマンドボタンの状態（グレーアウト）を更新
     */
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

    /**
     * ユニットステータスの表示（Rubyタグの復元を含む）
     */
    showStatus(unit) {
        if (!this.dom.statusUi) return;
        this.setMsg("");
        this.dom.statusUi.style.display = 'block';
        
        if (this.dom.stName) this.dom.stName.innerText = unit.id;
        if (this.dom.stLv) this.dom.stLv.innerText = unit.level;
        
        // ラベルの Ruby 表示を復元
        if (this.dom.stHpLabel) this.dom.stHpLabel.innerHTML = `<ruby>体力<rt>たいりょく</rt></ruby> (HP): <span id="st-hp"></span>`;
        if (this.dom.stMpLabel) this.dom.stMpLabel.innerHTML = `<ruby>恐竜力<rt>きょうりゅうりょく</rt></ruby> (MP): <span id="st-mp"></span>`;
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

    /**
     * 会話シーンの描画（顔グラフィック切り出しロジックを完全復元）
     */
    renderTalkLine(data, units, player) {
        if (!this.dom.evNamePlate || !this.dom.evText) return;
        this.dom.evNamePlate.innerText = data.name;
        this.dom.evText.innerHTML = data.text;
        if (this.dom.evTextArea) this.dom.evTextArea.scrollTop = 0;

        const speaker = units.find(u => u.id === data.name);
        
        // 顔グラフィックの復元
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
            // Box3 による中心補正を適用したカメラ移動
            const targetCenter = new THREE.Vector3();
            new THREE.Box3().setFromObject(speaker.sprite).getCenter(targetCenter);
            this.cameraControl.centerOn(targetCenter, 0.8);

            // 向きの補正
            if (speaker !== player) {
                speaker.lookAtNode(player.x, player.z);
                player.lookAtNode(speaker.x, speaker.z);
            }
        }
    }

    /**
     * ダメージ表示（battle.js 用）
     */
    showDamageText(unit, text, scene, camera) {
        this.showFloatingText(unit, text, 'damage', camera);
    }

    /**
     * 浮遊テキスト表示（v8.18.0 から完全復元）
     */
    showFloatingText(unit, text, type, camera) {
        if (!unit || !unit.sprite || !camera) return;
        const vector = unit.sprite.position.clone();
        vector.y += 50; 
        vector.project(camera);
        
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        const x = (vector.x * 0.5 + 0.5) * canvas.clientWidth;
        const y = (vector.y * -0.5 + 0.5) * canvas.clientHeight;
        
        const el = document.createElement('div');
        el.className = 'floating-text';
        el.innerText = text;
        el.style.color = (type === 'heal') ? '#00ffff' : (type === 'levelup' ? '#ffff00' : '#ffffff');
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.position = 'absolute';
        el.style.pointerEvents = 'none';
        el.style.zIndex = '5000';
        document.body.appendChild(el);
        
        gsap.to(el, { 
            y: y - 100, 
            opacity: 0, 
            duration: 1.5, 
            ease: "power2.out", 
            onComplete: () => el.remove() 
        });
    }
}
