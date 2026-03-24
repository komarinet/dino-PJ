/* =================================================================
   map.js - v8.20.5
   修正内容：
   1. plate01.png の仕様に基づき、側面UVをブロック単位で分割
   2. 320-384px エリアの鏡面リピート（偶数段反転）を実装
   3. 高い崖でもテクスチャが引き伸ばされないプロ仕様の描画
   ================================================================= */

export const VERSION = "8.20.5";
export const TILE_SIZE = 60;
export const H_STEP = 30;

export const MAP_W = 10;
export const MAP_D = 15;

export function buildMapMeshes(scene, sheetImg, treeTex, rockTex, mapData, obstacles) {
    if (!mapData) return;

    const texture = new THREE.CanvasTexture(sheetImg);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    
    // plate01.png (1280x384) の比率計算
    const wRatio = 256 / 1280; 
    const vFloorEnd = 256 / 384;   // 床面(0-256px)
    const vSide1End = 320 / 384;   // 側面1(256-320px)
    const vSide2End = 384 / 384;   // 側面2(320-384px)

    const offsetX = (MAP_W * TILE_SIZE) / 2;
    const offsetZ = (MAP_D * TILE_SIZE) / 2;

    window.tilesMeshMap = {};
    window.interactableTiles = [];
    window.obstaclesMap = new Set();

    const material = new THREE.MeshLambertMaterial({ map: texture, transparent: true });

    for (let z = 0; z < MAP_D; z++) {
        for (let x = 0; x < MAP_W; x++) {
            const cell = mapData[z][x];
            const col = cell.type;
            const blocksHigh = Math.max(1, cell.h); 
            const totalH = blocksHigh * H_STEP;
            
            // ★負荷対策：高さセグメントを分割してUVを個別に制御
            const geo = new THREE.BoxGeometry(TILE_SIZE, totalH, TILE_SIZE, 1, blocksHigh, 1);
            const uvAttr = geo.attributes.uv;

            if (col === 4) window.obstaclesMap.add(`${x},${z}`);

            // 面ごとの頂点インデックスを解析してUVを割り当て
            // BoxGeometryのUV順序: 0-3:右, 4-7:左, 8-11:上, 12-15:下, 16-19:前, 20-23:後 (セグメントにより増える)
            for (let i = 0; i < uvAttr.count; i++) {
                let u = uvAttr.getX(i);
                let v = uvAttr.getY(i);
                
                // 頂点の高さ位置から、どの「段」のテクスチャを貼るべきか判定
                // BoxGeometryのV座標は底が0, 頂上が1
                const segmentIdx = Math.floor(v * blocksHigh - 0.001); // 下から数えた段数 (0〜)
                const isTopFace = (v > 0.999 && i >= 8 && i <= 11); // 上面判定

                let newU, newV;

                if (isTopFace) {
                    // 床面 (0-256px)
                    newU = (u + col) * wRatio;
                    newV = v * vFloorEnd;
                } else if (v < 0.001) {
                    // 底面は描画不要のため0
                    newU = 0; newV = 0;
                } else {
                    // 側面 (256-384px)
                    newU = (u + col) * wRatio;
                    const distFromTop = (blocksHigh - 1) - segmentIdx; // 上から何段目か

                    if (distFromTop === 0) {
                        // 床面直下の側面 (256-320px)
                        const localV = (v * blocksHigh) % 1.0 || 1.0;
                        newV = vFloorEnd + (localV * (vSide1End - vFloorEnd));
                    } else {
                        // それ以降の側面 (320-384px) - 鏡面ループ実装
                        const localV = (v * blocksHigh) % 1.0 || 1.0;
                        const isMirror = (distFromTop % 2 === 0); // 偶数段を反転
                        
                        const vStart = vSide1End;
                        const vHeight = vSide2End - vSide1End;
                        
                        if (isMirror) {
                            newV = vStart + ((1.0 - localV) * vHeight);
                        } else {
                            newV = vStart + (localV * vHeight);
                        }
                    }
                }
                uvAttr.setXY(i, newU, newV);
            }
            uvAttr.needsUpdate = true;

            const mesh = new THREE.Mesh(geo, material);
            mesh.position.set(x * TILE_SIZE - offsetX, totalH / 2, z * TILE_SIZE - offsetZ);
            mesh.userData = { x, z, h: cell.h };
            scene.add(mesh);

            window.tilesMeshMap[`${x},${z}`] = mesh;
            window.interactableTiles.push(mesh);
        }
    }

    // 障害物の描画 (変更なし)
    if (obstacles) {
        if (treeTex) { treeTex.magFilter = THREE.NearestFilter; treeTex.minFilter = THREE.NearestFilter; }
        if (rockTex) { rockTex.magFilter = THREE.NearestFilter; rockTex.minFilter = THREE.NearestFilter; }
        const treeMat = new THREE.MeshLambertMaterial({ map: treeTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
        const rockMat = new THREE.MeshLambertMaterial({ map: rockTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
        const obsGeo1 = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
        const obsGeo2 = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
        obsGeo2.rotateY(Math.PI / 2);

        obstacles.forEach(obs => {
            window.obstaclesMap.add(`${obs.x},${obs.z}`);
            const cell = mapData[obs.z][obs.x];
            const mat = obs.type === 'tree' ? treeMat : rockMat;
            const mesh1 = new THREE.Mesh(obsGeo1, mat);
            const mesh2 = new THREE.Mesh(obsGeo2, mat);
            const group = new THREE.Group();
            group.add(mesh1); group.add(mesh2);
            group.position.set(obs.x * TILE_SIZE - offsetX, (cell.h * H_STEP) + (TILE_SIZE / 2), obs.z * TILE_SIZE - offsetZ);
            group.rotation.y = Math.random() * Math.PI;
            scene.add(group);
        });
    }
}

export function getWalkableNodes(units, unit, mapData) {
    const nodes = [];
    const openList = [{ x: unit.x, z: unit.z, d: 0, path: [] }];
    const visited = new Set();
    visited.add(`${unit.x},${unit.z}`);

    while (openList.length > 0) {
        const current = openList.shift();
        if (current.d > unit.move) continue;
        nodes.push(current);

        for (const dir of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
            const nx = current.x + dir[0], nz = current.z + dir[1];
            if (nx < 0 || nx >= MAP_W || nz < 0 || nz >= MAP_D || visited.has(`${nx},${nz}`)) continue;
            if (window.obstaclesMap && window.obstaclesMap.has(`${nx},${nz}`)) continue;

            const targetH = mapData[nz][nx].h;
            // Jump力の判定
            if (Math.abs(targetH - mapData[current.z][current.x].h) > unit.jump) continue;
            
            const blocker = units.find(u => u.x === nx && u.z === nz && u.hp > 0);
            if (blocker && blocker.isPlayer !== unit.isPlayer) continue;

            visited.add(`${nx},${nz}`);
            openList.push({ x: nx, z: nz, d: current.d + 1, path: [...current.path, { x: nx, z: nz, h: targetH }] });
        }
    }
    return nodes;
}
