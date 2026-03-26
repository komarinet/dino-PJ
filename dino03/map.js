/* =================================================================
   map.js - v8.20.68
   【絶対ルール順守：一切の省略・勝手な改変なし】
   修正内容：
   1. 土壌・岩場対応：plate01.png の規格（256/64/64）を厳守したUVマッピング。
   2. 階層描画：陸地のブロック積層（BoxGeometry）と上面・側面の描き分けを維持。
   3. 互換性：stage01の水面（type:4）および障害物配置ロジックを完全継承。
   4. バージョン管理：序章（Stage 00）の制作に伴い v8.20.68 へ。
   ================================================================= */

export const VERSION = "8.20.68";
export const TILE_SIZE = 60;
export const H_STEP = 30;
export const MAP_W = 10;
export const MAP_D = 15;

/**
 * マップメッシュの構築
 */
export function buildMapMeshes(scene, sheetImg, treeTex, rockTex, mapData, obstacles) {
    if (!mapData) return;
    
    const texture = new THREE.CanvasTexture(sheetImg);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    // UV計算用の定数（1280x384想定）
    const wRatio = 256 / 1280; 
    const vFloorStart = 128 / 384, vFloorEnd = 384 / 384; // 床面：256px
    const vSide1Start = 64 / 384,  vSide1End = 128 / 384; // 側面1：64px
    const vSide2Start = 0 / 384,   vSide2End = 64 / 384;  // 側面2：64px

    const offsetX = (MAP_W * TILE_SIZE) / 2, offsetZ = (MAP_D * TILE_SIZE) / 2;

    window.tilesMeshMap = {};
    window.interactableTiles = [];
    window.obstaclesMap = new Set();
    
    const material = new THREE.MeshLambertMaterial({ map: texture, transparent: true });

    for (let z = 0; z < MAP_D; z++) {
        for (let x = 0; x < MAP_W; x++) {
            const cell = mapData[z][x];
            const col = cell.type; // 0:砂地/土壌, 3:岩場, 4:水 など
            const blocksHigh = cell.h; 

            if (col === 4) {
                // --- 水面（type: 4）の描画 ---
                window.obstaclesMap.add(`${x},${z}`);
                const floorGeo = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
                const uvAttr = floorGeo.attributes.uv;
                
                for (let i = 0; i < uvAttr.count; i++) {
                    let u = uvAttr.getX(i), v = uvAttr.getY(i);
                    let newU = (u + col) * wRatio;
                    let newV = vFloorStart + (v * (vFloorEnd - vFloorStart));
                    uvAttr.setXY(i, newU, newV);
                }
                uvAttr.needsUpdate = true;

                const floorMesh = new THREE.Mesh(floorGeo, material);
                floorMesh.rotation.x = -Math.PI / 2;
                floorMesh.position.set(x * TILE_SIZE - offsetX, (blocksHigh * H_STEP) - 0.5, z * TILE_SIZE - offsetZ);
                floorMesh.userData = { x, z, h: blocksHigh };
                
                window.tilesMeshMap[`${x},${z}`] = floorMesh;
                window.interactableTiles.push(floorMesh);
                scene.add(floorMesh);
            } 
            else {
                // --- 陸地（土壌・岩場など）の積層描画 ---
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
                                // 最上段の床面
                                newU = (u + col) * wRatio;
                                newV = vFloorStart + (v * (vFloorEnd - vFloorStart));
                            } else { 
                                // 積層内部の上面は描画しない（透明領域へ飛ばす）
                                newU = 0; newV = 0; 
                            }
                        } else if (isBottomFace) {
                            // 底面は常に非表示
                            newU = 0; newV = 0; 
                        }
                        else {
                            // 側面
                            newU = (u + col) * wRatio;
                            if (isTopBlock) {
                                // 最上段の側面（側面1）
                                newV = vSide1Start + (v * (vSide1End - vSide1Start));
                            } else {
                                // 2段目以降の側面（側面2）
                                const distFromTop = (blocksHigh - 1) - b;
                                if (distFromTop % 2 === 0) {
                                    newV = vSide2Start + ((1.0 - v) * (vSide2End - vSide2Start));
                                } else {
                                    newV = vSide2Start + (v * (vSide2End - vSide2Start));
                                }
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

                // 高さが0の場合のクリック判定用透明パネル
                if (blocksHigh <= 0) {
                    const floorGeo = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
                    const floorMesh = new THREE.Mesh(floorGeo, new THREE.MeshBasicMaterial({ visible: false }));
                    floorMesh.rotation.x = -Math.PI / 2;
                    floorMesh.position.set(x * TILE_SIZE - offsetX, 0, z * TILE_SIZE - offsetZ);
                    floorMesh.userData = { x, z, h: 0 };
                    window.interactableTiles.push(floorMesh);
                    scene.add(floorMesh);
                }
            }
        }
    }

    // --- 障害物（木・岩）の配置 ---
    if (obstacles) {
        const treeMat = new THREE.MeshLambertMaterial({ map: treeTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
        const rockMat = new THREE.MeshLambertMaterial({ map: rockTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
        const obsGeo1 = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
        const obsGeo2 = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
        obsGeo2.rotateY(Math.PI / 2);

        obstacles.forEach(obs => {
            window.obstaclesMap.add(`${obs.x},${obs.z}`);
            const cell = mapData[obs.z][obs.x];
            const mat = obs.type === 'tree' ? treeMat : rockMat;
            const group = new THREE.Group();
            group.add(new THREE.Mesh(obsGeo1, mat)); 
            group.add(new THREE.Mesh(obsGeo2, mat));
            group.position.set(obs.x * TILE_SIZE - offsetX, (cell.h * H_STEP) + (TILE_SIZE / 2), obs.z * TILE_SIZE - offsetZ);
            group.rotation.y = Math.random() * Math.PI;
            scene.add(group);
        });
    }
}

/**
 * 移動可能な範囲を探索（ダイクストラ法ベース）
 */
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
            // 高低差チェック（ジャンプ力以内か）
            if (Math.abs(targetH - mapData[current.z][current.x].h) > unit.jump) continue;
            
            // 他ユニットの存在チェック
            const isOccupied = units.some(u => u !== unit && u.hp > 0 && Math.round(u.x) === nx && Math.round(u.z) === nz);
            if (isOccupied) continue;

            visited.add(`${nx},${nz}`);
            openList.push({ x: nx, z: nz, h: targetH, d: current.d + 1, path: [...current.path, { x: nx, z: nz, h: targetH }] });
        }
    }
    return nodes;
}
