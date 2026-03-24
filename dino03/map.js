/* =================================================================
   map.js - v8.20.22
   修正内容：
   1. 重なり判定の厳格化：getWalkableNodes 内で、ユニットの位置を
      Math.round で整数化して比較。浮動小数点によるズレを防ぎ、
      ユニット同士が重なるのを確実に阻止します。
   ================================================================= */

export const VERSION = "8.20.22";
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
            const blocksHigh = Math.max(1, cell.h); 
            if (col === 4) window.obstaclesMap.add(`${x},${z}`);

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
        }
    }

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
            
            // ★ 修正箇所：より厳密にユニットの存在をチェック（重なり防止）
            const isOccupied = units.some(u => u !== unit && u.hp > 0 && Math.round(u.x) === nx && Math.round(u.z) === nz);
            if (isOccupied) continue;

            visited.add(`${nx},${nz}`);
            openList.push({ x: nx, z: nz, h: targetH, d: current.d + 1, path: [...current.path, { x: nx, z: nz, h: targetH }] });
        }
    }
    return nodes;
}
