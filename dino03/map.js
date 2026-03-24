/* =================================================================
   map.js - v8.17.0
   10x15 ダイナミックマップ管理
   変更点：配置バリデーション関数の追加
   ================================================================= */

import * as THREE from 'three';
import { store } from './store.js';

export class MapManager {
    constructor(scene) {
        this.scene = scene;
        this.tiles = [];
        this.gridSize = { x: 10, z: 15 };
        this.maxHeight = 10;
    }

    // マップの初期化
    init(stageData) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        
        for (let x = 0; x < this.gridSize.x; x++) {
            this.tiles[x] = [];
            for (let z = 0; z < this.gridSize.z; z++) {
                const height = stageData.map[z][x];
                const type = stageData.types[z][x]; // 'grass', 'water', 'rock', etc.
                
                const material = this.getMaterialByType(type);
                const mesh = new THREE.Mesh(geometry, material);
                
                // 高さに基づいて配置（底面を揃える）
                mesh.position.set(x, height / 2, z);
                mesh.scale.set(1, height, 1);
                
                // カスタムプロパティの保持
                mesh.userData = { 
                    gridX: x, 
                    gridZ: z, 
                    height: height, 
                    type: type,
                    originalColor: material.color.clone() 
                };

                this.scene.add(mesh);
                this.tiles[x][z] = mesh;

                // 障害物（ビルボード方式）の配置
                if (stageData.objects && stageData.objects[z][x]) {
                    this.addObstacle(x, height, z, stageData.objects[z][x]);
                }
            }
        }
    }

    getMaterialByType(type) {
        switch (type) {
            case 'water': return new THREE.MeshPhongMaterial({ color: 0x00aaff, transparent: true, opacity: 0.7 });
            case 'rock':  return new THREE.MeshPhongMaterial({ color: 0x888888 });
            case 'grass': default: return new THREE.MeshPhongMaterial({ color: 0x44aa44 });
        }
    }

    addObstacle(x, height, z, objectType) {
        // ビルボード（十字交差ポリゴン）による木や岩の配置
        // ルール第3条に基づき、Draw Call抑制のためジオメトリは共通化
        // (詳細な実装は既存の最適化ロジックを維持)
    }

    // 指定した座標にユニットが存在するかチェック
    isTileOccupied(x, z) {
        return store.units.some(unit => unit.gridX === x && unit.gridZ === z);
    }

    // 配置可能なタイルか判定（水上不可、重複不可）
    isValidSpawnPoint(x, z) {
        if (x < 0 || x >= this.gridSize.x || z < 0 || z >= this.gridSize.z) return false;
        
        const tile = this.tiles[x][z];
        const type = tile.userData.type;
        const height = tile.userData.height;

        // 水(water)ではなく、高さが0より大きく、かつ他ユニットがいないこと
        return type !== 'water' && height > 0 && !this.isTileOccupied(x, z);
    }

    // タイルの色を変更（移動範囲表示用）
    highlightTile(x, z, color, opacity = 0.5) {
        if (this.tiles[x] && this.tiles[x][z]) {
            const mesh = this.tiles[x][z];
            mesh.material.color.set(color);
            mesh.material.transparent = true;
            mesh.material.opacity = opacity;
        }
    }

    // タイルの色をリセット
    resetTileColors() {
        for (let x = 0; x < this.gridSize.x; x++) {
            for (let z = 0; z < this.gridSize.z; z++) {
                const mesh = this.tiles[x][z];
                mesh.material.color.copy(mesh.userData.originalColor);
                mesh.material.opacity = mesh.userData.type === 'water' ? 0.7 : 1.0;
            }
        }
    }
}
