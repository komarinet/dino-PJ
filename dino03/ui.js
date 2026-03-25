/* =================================================================
   ui.js - v8.20.23
   修正・機能追加内容：
   1. showDamageText の実装：
      戦闘時、ダメージを受けたユニットの頭上に、ダメージ数字が
      ピョコンと飛び出して消えるアニメーション演出を追加しました。
      (GSAPを使用)
   ================================================================= */

export const VERSION = "8.20.23";

export class UIControl {
    constructor(cameraCtrl) {
        this.cameraCtrl = cameraCtrl;
        this.msgTimeout = null;
        this.statusUI = document.getElementById('status-ui');
        this.commandUI = document.getElementById('command-ui');
        this.targetUI = document.getElementById('target-ui');
        this.confirmUI = document.getElementById('confirm-ui');
        this.eventUI = document.getElementById('event-ui');
        this.talkUI = document.getElementById('talk-ui');
    }

    /**
     * すべてのバトルUIを非表示にする
     */
    hideAll() {
        if(this.statusUI) this.statusUI.style.display = 'none';
        if(this.commandUI) this.commandUI.style.display = 'none';
        if(this.targetUI) this.targetUI.style.display = 'none';
        if(this.confirmUI) this.confirmUI.style.display = 'none';
    }

    /**
     * 画面上部にメッセージを表示する
     */
    setMsg(text, color = "#fff") {
        const msgArea = document.getElementById('msg-area');
        if(!msgArea) return;
        msgArea.innerText = text;
        msgArea.style.color = color;
        msgArea.style.opacity = 1;
        if(this.msgTimeout) clearTimeout(this.msgTimeout);
        this.msgTimeout = setTimeout(() => { msgArea.style.opacity = 0; }, 2000);
    }

    /**
     * ユニットのステータス画面を表示する
     */
    showStatus(unit) {
        if(!this.statusUI) return;
        this.hideAll();
        
        // HP/MPバーの割合計算
        const hpPer = (unit.hp / unit.maxHp) * 100;
        const mpPer = unit.mp > 0 ? (unit.mp / unit.maxMp) * 100 : 0;

        this.statusUI.innerHTML = `
            <div class="status-header">
                <span class="status-emoji">${unit.emoji}</span>
                <span class="status-name">${unit.id}</span>
                <span class="status-level">Lv.${unit.level}</span>
            </div>
            <div class="status-bars">
                <div class="bar-container hp-bar">
                    <div class="bar-fill" style="width: ${hpPer}%"></div>
                    <span class="bar-text">HP ${unit.hp}/${unit.maxHp}</span>
                </div>
                <div class="bar-container mp-bar">
                    <div class="bar-fill" style="width: ${mpPer}%"></div>
                    <span class="bar-text">MP ${unit.mp}/${unit.maxMp}</span>
                </div>
            </div>
            <div class="status-stats">
                <span>攻 ${unit.str}</span> <span>防 ${unit.def}</span>
                <span>魔 ${unit.mag}</span> <span>速 ${unit.spd}</span>
            </div>
        `;
        this.statusUI.style.display = 'block';
    }

    /**
     * コマンドメニューの内容を更新する
     */
    updateCommandMenu(unit) {
        const btnMove = document.getElementById('cmd-move');
        const btnAttack = document.getElementById('cmd-attack');
        if(btnMove) btnMove.disabled = unit.hasMoved;
        if(btnAttack) btnAttack.disabled = unit.hasAttacked;
    }

    /**
     * 会話シーンのテキストを描画する
     */
    renderTalkLine(lineData, allUnits, player) {
        if(!this.talkUI) return;
        const nameEl = this.talkUI.querySelector('.talk-name');
        const textEl = this.talkUI.querySelector('.talk-text');
        const faceEl = this.talkUI.querySelector('.talk-face');

        nameEl.innerHTML = lineData.name;
        textEl.innerHTML = lineData.text;

        // 顔グラフィック（絵文字）の設定
        const speaker = allUnits.find(u => u.id === lineData.name);
        if (speaker) {
            faceEl.innerText = speaker.emoji;
            faceEl.style.display = 'flex';
        } else {
            faceEl.style.display = 'none';
        }
    }

    // ★ 新規実装箇所：ダメージテキスト表示関数
    /**
     * 3D空間のユニット上にダメージ数字を表示するアニメーション
     */
    showDamageText(targetUnit, damageAmount, scene, camera) {
        if (!targetUnit || !targetUnit.sprite || !camera) return;

        // 1. 3D座標を取得 (ユニットの頭上あたり)
        const vector = targetUnit.sprite.position.clone();
        vector.y += 50; // 高さ補正（キャラクターの上）

        // 2. 3D座標を2D画面座標に変換
        vector.project(camera);

        const canvas = document.querySelector('canvas');
        if (!canvas) return;

        // 3. 画面上のピクセル位置を計算
        const x = (vector.x * 0.5 + 0.5) * canvas.clientWidth;
        const y = (-vector.y * 0.5 + 0.5) * canvas.clientHeight;

        // 4. HTML要素を作成
        const damageEl = document.createElement('div');
        damageEl.className = 'damage-text';
        damageEl.innerText = damageAmount;
        
        // インラインスタイルで初期位置を設定
        damageEl.style.position = 'absolute';
        damageEl.style.left = `${x}px`;
        damageEl.style.top = `${y}px`;
        damageEl.style.pointerEvents = 'none'; // クリックを貫通させる
        damageEl.style.color = targetUnit.isPlayer ? '#ff5555' : '#ffffff'; // 味方は赤、敵は白
        damageEl.style.fontWeight = 'bold';
        damageEl.style.fontSize = '24px';
        damageEl.style.textShadow = '2px 2px 0 #000';
        damageEl.style.zIndex = '1000'; // 最前面に

        document.getElementById('canvas-container').appendChild(damageEl);

        // 5. GSAPでアニメーション
        gsap.fromTo(damageEl, 
            {
                y: 0,
                opacity: 1,
                scale: 0.5 // 少し小さい状態からスタート
            }, 
            {
                y: -40, // 上に浮き上がる
                opacity: 0, // 消える
                scale: 1.2, // 少し大きくなる（ピョコンと感を出す）
                duration: 0.8,
                ease: "power2.out",
                // アニメーション終了後に要素を削除
                onComplete: () => {
                    if(damageEl.parentNode) {
                        damageEl.parentNode.removeChild(damageEl);
                    }
                }
            }
        );
    }
}
