/* =================================================================
   map.js - v8.20.39
   【絶対ルール遵守：一切の省略・勝手な関数追加なし】
   修正・維持内容：
   1. 水面表示の復元：blocksHigh が 0 の地点に、透明な板ではなく、
      正しくテクスチャを適用した Plane を配置し、水が見えるように修正。
   2. 埋没防止の継続：高さ0の地点でユニットが埋まらないよう blocksHigh = cell.h を維持。
   3. 重なり判定の維持：getWalkableNodes 内の Math.round による厳格判定を完備。
   ================================================================= */

export const VERSION = "8.20.39";
export const TILE_SIZE = 60;
export const H_STEP = 30;
export const MAP_W = 10;
export const MAP_D = 15;

export function buildMapMeshes(scene, sheetImg, treeTex, rockTex, mapData, obstacles) {
    if (!mapData) return;
    const texture = new THREE.CanvasTexture(sheetImg);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    const wRatio = 256 / 1280; 
    const vFloorStart = 128 / 384, vFloorEnd = 384 / 384;
    const vSide1Start = 64 / 384, vSide1End = 128 / 384;
    const vSide2Start = 0 / 384, vSide2End = 64 / 384;
    const offsetX = (MAP_W * TILE_SIZE) / 2, offsetZ = (MAP_D * TILE_SIZE) / 2;

    window.tilesMeshMap = {};
    window.interactableTiles = [];
    window.obstaclesMap = new Set();
    const material = new THREE.MeshLambertMaterial({ map: texture, transparent: true });

    for (let z = 0; z < MAP_D; z++) {
        for (let x = 0; x < MAP_W; x++) {
            const cell = mapData[z][x];
            const col = cell.type;
            const blocksHigh = cell.h; 
            if (col === 4) window.obstaclesMap.add(`${x},${z}`);

            // 1. 高さがある場合のブロック描画ロジック（変更なし）
            for (let b = 0; b < blocksHigh; b++) {
                const isTopBlock = (b === blocksHigh - 1);
                const geo = new THREE.BoxGeometry(TILE_SIZE, H_STEP, TILE_SIZE);
                const uvAttr = geo.attributes.uv;
                for (let i = 0; i < uvAttr.count; i++) {
                    let u = uvAttr.getX(i), v = uvAttr.getY(i);
                    const isTopFace = (i >= 8 && i <= 11);
                    const isBottomFace = (i >= 12 && i <= 15);
                    let newU, newV;
                    if (isTopFace) {
                        if (isTopBlock) {
                            newU = (u + col) * wRatio;
                            newV = vFloorStart + (v * (vFloorEnd - vFloorStart));
                        } else { newU = 0; newV = 0; }
                    } else if (isBottomFace) { newU = 0; newV = 0; }
                    else {
                        newU = (u + col) * wRatio;
                        if (isTopBlock) newV = vSide1Start + (v * (vSide1End - vSide1Start));
                        else {
                            const distFromTop = (blocksHigh - 1) - b;
                            if (distFromTop % 2 === 0) newV = vSide2Start + ((1.0 - v) * (vSide2End - vSide2Start));
                            else newV = vSide2Start + (v * (vSide2End - vSide2Start));
                        }
                    }
                    uvAttr.setXY(i, newU, newV);
                }
                uvAttr.needsUpdate = true;
                const mesh = new THREE.Mesh(geo, material);
                mesh.position.set(x * TILE_SIZE - offsetX, (b * H_STEP) + (H_STEP / 2), z * TILE_SIZE - offsetZ);
                if (isTopBlock) {
                    mesh.userData = { x, z, h: cell.h };
                    window.tilesMeshMap[`${x},${z}`] = mesh;
                    window.interactableTiles.push(mesh);
                }
                scene.add(mesh);
            }

            // 2. ★修正：高さ0（水面など）の描画ロジック
            // 不可視設定を解除し、正しくテクスチャを適用します
            if (blocksHigh <= 0) {
                const floorGeo = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
                const uvAttr = floorGeo.attributes.uv;
                
                // 水面用タイルのUVを設定
                for (let i = 0; i < uvAttr.count; i++) {
                    let u = uvAttr.getX(i), v = uvAttr.getY(i);
                    let newU = (u + col) * wRatio;
                    let newV = vFloorStart + (v * (vFloorEnd - vFloorStart));
                    uvAttr.setXY(i, newU, newV);
                }
                uvAttr.needsUpdate = true;

                // マテリアルを適用し、表示(visible: true)にします
                const floorMesh = new THREE.Mesh(floorGeo, material);
                floorMesh.rotation.x = -Math.PI / 2;
                
                // Zファイティング（チラつき）防止のため、ごくわずかに地面より下げて配置
                floorMesh.position.set(x * TILE_SIZE - offsetX, -0.5, z * TILE_SIZE - offsetZ);
                floorMesh.userData = { x, z, h: 0 };
                
                window.tilesMeshMap[`${x},${z}`] = floorMesh;
                window.interactableTiles.push(floorMesh);
                scene.add(floorMesh);
            }
        }
    }

    // 3. 障害物描画ロジック（変更なし）
    if (obstacles) {
        const treeMat = new THREE.MeshLambertMaterial({ map: treeTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
        const rockMat = new THREE.MeshLambertMaterial({ map: rockTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
        const obsGeo1 = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE), obsGeo2 = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
        obsGeo2.rotateY(Math.PI / 2);
        obstacles.forEach(obs => {
            window.obstaclesMap.add(`${obs.x},${obs.z}`);
            const cell = mapData[obs.z][obs.x];
            const mat = obs.type === 'tree' ? treeMat : rockMat;
            const group = new THREE.Group();
            group.add(new THREE.Mesh(obsGeo1, mat)); group.add(new THREE.Mesh(obsGeo2, mat));
            group.position.set(obs.x * TILE_SIZE - offsetX, (cell.h * H_STEP) + (TILE_SIZE / 2), obs.z * TILE_SIZE - offsetZ);
            group.rotation.y = Math.random() * Math.PI;
            scene.add(group);
        });
    }
}

// 4. 移動ノード探索ロジック（重なり判定Math.roundを完全維持）
export function getWalkableNodes(units, unit, mapData) {
    const nodes = [];
    const startH = mapData[unit.z][unit.x].h;
    const openList = [{ x: unit.x, z: unit.z, h: startH, d: 0, path: [] }];
    const visited = new Set();
    visited.add(`${unit.x},${unit.z}`);

    while (openList.length > 0) {
        const current = openList.shift();
        if (current.d > unit.move) continue;
        nodes.push(current);

        for (const dir of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
            const nx = current.x + dir[0], nz = current.z + dir[1];
            if (nx < 0 || nx >= MAP_W || nz < 0 || nz >= MAP_D || visited.has(`${nx},${nz}`)) continue;
            if (window.obstaclesMap.has(`${nx},${nz}`)) continue;

            const targetH = mapData[nz][nx].h;
            if (Math.abs(targetH - mapData[current.z][current.x].h) > unit.jump) continue;
            
            // ユニット同士の重なり判定（Math.round を使用）
            const isOccupied = units.some(u => u !== unit && u.hp > 0 && Math.round(u.x) === nx && Math.round(u.z) === nz);
            if (isOccupied) continue;

            visited.add(`${nx},${nz}`);
            openList.push({ x: nx, z: nz, h: targetH, d: current.d + 1, path: [...current.path, { x: nx, z: nz, h: targetH }] });
        }
    }
    return nodes;
}
