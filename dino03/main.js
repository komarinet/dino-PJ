/* =================================================================
   main.js - v8.17.0
   メインエントリーポイント / ゲームループ
   変更点：3ステップ移動フローの実装、イベントハンドリング
   ================================================================= */

import * as THREE from 'three';
import { store } from './store.js';
import { MapManager } from './map.js';
import { UnitManager } from './units.js';
import { BattleManager } from './battle.js';
import { UIManager } from './ui.js';

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        this.map = new MapManager(this.scene);
        this.ui = new UIManager();
        this.units = new UnitManager(this.scene, this.map);
        this.battle = new BattleManager(this.map, this.units, this.ui);

        this.selectedUnit = null;
        this.pendingDestination = null;
        this.gameState = 'IDLE'; // 'IDLE', 'RANGE_SHOWN', 'CONFIRMING'

        this.init();
    }

    async init() {
        // レンダラー設定
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
        
        // 環境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // マップとユニットの初期化 (stage01データを使用)
        // 前半で実装したisValidSpawnPointにより、水上・重複を回避
        this.map.init(window.stageData);
        this.units.createUnit('tyrano', 2, 2, 'player');
        this.units.createUnit('compsognathus', 8, 12, 'enemy');
        this.units.createUnit('compsognathus', 7, 13, 'enemy');

        this.camera.position.set(5, 10, 15);
        this.camera.lookAt(5, 0, 7);

        window.addEventListener('click', (e) => this.onMouseClick(e));
        this.animate();
    }

    onMouseClick(event) {
        if (store.isBusy || store.turn !== 'player') return;

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );

        raycaster.setFromCamera(mouse, this.camera);
        const intersects = raycaster.intersectObjects(this.scene.children);

        if (intersects.length > 0) {
            const object = intersects[0].object;
            const userData = object.userData;

            if (userData.gridX !== undefined) {
                this.handleMapClick(userData.gridX, userData.gridZ);
            }
        }
    }

    handleMapClick(x, z) {
        const clickedUnit = store.units.find(u => u.gridX === x && u.gridZ === z);

        // ステート：待機中 -> ユニット選択
        if (this.gameState === 'IDLE' && clickedUnit && clickedUnit.side === 'player') {
            this.selectedUnit = clickedUnit;
            this.showMoveRange(clickedUnit);
            this.gameState = 'RANGE_SHOWN';
            return;
        }

        // ステート：範囲表示中 -> 目的地選択
        if (this.gameState === 'RANGE_SHOWN') {
            // 他のユニットがいる場所は選択不可
            if (this.map.isTileOccupied(x, z) && !(this.selectedUnit.gridX === x && this.selectedUnit.gridZ === z)) return;

            this.pendingDestination = { x, z };
            this.map.resetTileColors();
            this.showMoveRange(this.selectedUnit); // 青範囲を再描画
            this.map.highlightTile(x, z, 0xffff00, 0.8); // 選択地点を黄色に

            this.gameState = 'CONFIRMING';
            this.ui.showConfirm(
                () => this.executeMove(), 
                () => this.cancelSelection()
            );
        }
    }

    showMoveRange(unit) {
        const range = unit.stats.move;
        for (let x = 0; x < 10; x++) {
            for (let z = 0; z < 15; z++) {
                const dist = Math.abs(unit.gridX - x) + Math.abs(unit.gridZ - z);
                if (dist <= range && !this.map.isTileOccupied(x, z)) {
                    this.map.highlightTile(x, z, 0x00aaff, 0.4);
                }
            }
        }
    }

    async executeMove() {
        this.ui.hideConfirm();
        this.map.resetTileColors();
        
        const path = [this.pendingDestination]; // 本来はA*等で経路を作る
        await this.battle.moveUnit(this.selectedUnit, path);
        
        this.gameState = 'IDLE';
        this.selectedUnit = null;
    }

    cancelSelection() {
        this.ui.hideConfirm();
        this.map.resetTileColors();
        this.gameState = 'IDLE';
        this.selectedUnit = null;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
}

new Game();
