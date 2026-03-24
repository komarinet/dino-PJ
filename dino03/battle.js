/* =================================================================
   battle.js - v8.17.0
   ターン管理および戦闘・AIロジック
   変更点：2体ずつのチャンク行動、GSAP同期によるフリーズ防止
   ================================================================= */

import { store } from './store.js';
import { gsap } from 'gsap';

export class BattleManager {
    constructor(mapManager, unitManager, uiManager) {
        this.mapManager = mapManager;
        this.unitManager = unitManager;
        this.uiManager = uiManager;
    }

    // ユニットを移動させる（Promiseを返し、完了を保証する）
    async moveUnit(unit, path) {
        if (store.isBusy) return;
        store.isBusy = true;

        for (const point of path) {
            const height = this.mapManager.tiles[point.x][point.z].userData.height;
            
            // GSAPによる移動アニメーション
            await gsap.to(unit.mesh.position, {
                x: point.x,
                y: height + 0.4,
                z: point.z,
                duration: 0.3,
                ease: "power1.inOut"
            });
            
            unit.gridX = point.x;
            unit.gridZ = point.z;
        }

        store.isBusy = false;
    }

    // 敵ターンの実行（コンプソグナトゥス等を2体ずつ動かす）
    async executeEnemyTurn() {
        this.uiManager.showMessage("敵のターン");
        const enemies = store.units.filter(u => u.side === 'enemy' && !u.isDone);

        // 2体ずつのチャンクに分割して処理
        for (let i = 0; i < enemies.length; i += 2) {
            const chunk = enemies.slice(i, i + 2);
            
            // チャンク内の全ユニットが行動を終えるまで待機
            await Promise.all(chunk.map(async (enemy) => {
                await this.processEnemyAI(enemy);
            }));
            
            // チャンク間のわずかなウェイト（挙動を分かりやすくするため）
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        this.endTurn('enemy');
    }

    async processEnemyAI(unit) {
        // 簡易AI: 最も近いプレイヤーユニットを探索
        const target = store.units.find(u => u.side === 'player');
        if (!target) return;

        // 本来はここで経路探索を行うが、デバッグ用に直接移動・完了
        // 移動範囲の計算ロジック...
        unit.isDone = true;
        console.log(`${unit.type} moved.`);
    }

    endTurn(side) {
        store.units.filter(u => u.side === side).forEach(u => u.isDone = false);
        store.turn = side === 'player' ? 'enemy' : 'player';
        this.uiManager.updateTurnDisplay();
        
        if (store.turn === 'enemy') {
            this.executeEnemyTurn();
        } else {
            this.uiManager.showMessage("あなたのターン");
        }
    }
}
