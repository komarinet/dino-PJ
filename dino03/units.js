/* =================================================================
   units.js - v8.17.0
   ユニット管理および初期配置ロジック
   変更点：水上・重複配置の回避バリデーション実装
   ================================================================= */

import * as THREE from 'three';
import { store } from './store.js';

export class UnitManager {
    constructor(scene, mapManager) {
        this.scene = scene;
        this.mapManager = mapManager;
    }

    createUnit(type, x, z, side) {
        // 安全な配置場所を探す（指定位置がNGなら近隣を検索）
        const pos = this.findSafeSpawnPoint(x, z);
        
        const geometry = new THREE.SphereGeometry(0.4, 32, 32);
        const material = new THREE.MeshPhongMaterial({ 
            color: side === 'player' ? 0x3333ff : 0xff3333 
        });
        const mesh = new THREE.Mesh(geometry, material);

        const height = this.mapManager.tiles[pos.x][pos.z].userData.height;
        mesh.position.set(pos.x, height + 0.4, pos.z);
        
        const unit = {
            id: THREE.MathUtils.generateUUID(),
            type: type, // 'tyrano', 'compsognathus', etc.
            side: side,
            gridX: pos.x,
            gridZ: pos.z,
            mesh: mesh,
            stats: this.getStatsByType(type),
            isDone: false
        };

        this.scene.add(mesh);
        store.units.push(unit);
        return unit;
    }

    // 配置バリデーションを通過するまで再帰的または近隣を探索
    findSafeSpawnPoint(targetX, targetZ) {
        if (this.mapManager.isValidSpawnPoint(targetX, targetZ)) {
            return { x: targetX, z: targetZ };
        }

        console.warn(`Position (${targetX}, ${targetZ}) is invalid. Searching for nearest tile...`);

        // 単純な渦巻き探索アルゴリズム（配置可能タイルが見つかるまで周囲を広げる）
        for (let radius = 1; radius < 5; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dz = -radius; dz <= radius; dz++) {
                    const nx = targetX + dx;
                    const nz = targetZ + dz;
                    if (this.mapManager.isValidSpawnPoint(nx, nz)) {
                        return { x: nx, z: nz };
                    }
                }
            }
        }
        
        // 万が一見つからない場合のフォールバック（0,0が安全と仮定してはいけないが、エラー回避用）
        return { x: targetX, z: targetZ };
    }

    getStatsByType(type) {
        const baseStats = {
            'tyrano': { hp: 100, move: 3, attack: 30, range: 1 },
            'compsognathus': { hp: 30, move: 4, attack: 10, range: 1 }
        };
        return baseStats[type] || baseStats['tyrano'];
    }

    updateUnitPosition(unit, newX, newZ) {
        const height = this.mapManager.tiles[newX][newZ].userData.height;
        unit.gridX = newX;
        unit.gridZ = newZ;
        unit.mesh.position.set(newX, height + 0.4, newZ);
    }
}
