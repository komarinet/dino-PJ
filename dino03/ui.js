/* =================================================================
   ui.js - v8.17.0
   UI制御（メニュー、メッセージ、確認ダイアログ）
   変更点：移動確認UIの追加
   ================================================================= */

import { store } from './store.js';

export class UIManager {
    constructor() {
        this.msgElement = document.getElementById('message');
        this.confirmElement = this.createConfirmUI();
        this.onConfirmCallback = null;
        this.onCancelCallback = null;
    }

    createConfirmUI() {
        const div = document.createElement('div');
        div.id = 'confirm-ui';
        div.style.cssText = `
            display: none; position: fixed; bottom: 100px; left: 50%;
            transform: translateX(-50%); background: rgba(0,0,0,0.8);
            color: white; padding: 20px; border-radius: 10px; text-align: center;
            z-index: 100;
        `;
        div.innerHTML = `
            <p id="confirm-text">ここへ移動しますか？</p>
            <button id="btn-yes" style="padding: 10px 20px; margin-right: 10px;">はい</button>
            <button id="btn-no" style="padding: 10px 20px;">いいえ</button>
        `;
        document.body.appendChild(div);

        div.querySelector('#btn-yes').onclick = () => this.onConfirmCallback?.();
        div.querySelector('#btn-no').onclick = () => this.onCancelCallback?.();
        
        return div;
    }

    showConfirm(onConfirm, onCancel) {
        this.onConfirmCallback = onConfirm;
        this.onCancelCallback = onCancel;
        this.confirmElement.style.display = 'block';
    }

    hideConfirm() {
        this.confirmElement.style.display = 'none';
    }

    showMessage(text) {
        this.msgElement.innerText = text;
        gsap.fromTo(this.msgElement, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    }

    updateTurnDisplay() {
        const turnText = store.turn === 'player' ? "PLAYER TURN" : "ENEMY TURN";
        document.getElementById('turn-display').innerText = turnText;
    }
}
