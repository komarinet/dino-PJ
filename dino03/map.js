export const VERSION = "8.19.0";
export const TILE_SIZE = 60;
export const H_STEP = 30;

// ★ 変更：マップサイズを 10x15 に縮小
export const MAP_W = 10;
export const MAP_D = 15;

// ★ 変更：木と岩のテクスチャ、および障害物データ(obstacles)を受け取るように変更
export function buildMapMeshes(scene, sheetImg, treeTex, rockTex, mapData, obstacles) {
    if (!mapData) return;

    const texture = new THREE.CanvasTexture(sheetImg);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    
    const wRatio = 256 / 1280; 
    const hRatioTop = 256 / 384;
    const hRatioSide = 64 / 384;

    const offsetX = (MAP_W * TILE_SIZE) / 2;
    const offsetZ = (MAP_D * TILE_SIZE) / 2;

    window.tilesMeshMap = {};
    window.interactableTiles = [];
    window.obstaclesMap = new Set(); // ★ 追加：障害物のある座標を記憶

    const material = new THREE.MeshLambertMaterial({ map: texture, transparent: true });

    for (let z = 0; z < MAP_D; z++) {
        for (let x = 0; x < MAP_W; x++) {
            const cell = mapData[z][x];
            const blocksHigh = Math.max(1, cell.h); 
            const h = blocksHigh * H_STEP;
            
            const geo = new THREE.BoxGeometry(TILE_SIZE, h, TILE_SIZE);
            const uvAttr = geo.attributes.uv;

            const col = cell.type;

            for (let i = 0; i < uvAttr.count; i++) {
                const u = uvAttr.getX(i);
                const v = uvAttr.getY(i);
                
                const isTop = (i >= 8 && i <= 11);
                const isBottom = (i >= 12 && i <= 15);
                const isSide = !isTop && !isBottom;

                let newU, newV;

                if (isTop) {
                    newU = (u + col) * wRatio;
                    newV = 1.0 - hRatioTop + (v * hRatioTop);
                } else if (isBottom) {
                    newU = 0; newV = 0;
                } else {
                    newU = (u + col) * wRatio;
                    const currentBlockFromTop = Math.floor((1.0 - v) * blocksHigh);
                    let localV = (v * blocksHigh) % 1.0;
                    if (localV === 0 && v > 0) localV = 1.0;

                    if (currentBlockFromTop === 0) {
                        const topOfPart1 = 1.0 - hRatioTop;
                        newV = topOfPart1 - hRatioSide + (localV * hRatioSide);
                    } else {
                        const isUpsideDown = (currentBlockFromTop % 2 === 0);
                        if (isUpsideDown) {
                            newV = 0.0 + ((1.0 - localV) * hRatioSide);
                        } else {
                            newV = 0.0 + (localV * hRatioSide);
                        }
                    }
                }
                uvAttr.setXY(i, newU, newV);
            }
            uvAttr.needsUpdate = true;

            const mesh = new THREE.Mesh(geo, material);
            mesh.position.set(x * TILE_SIZE - offsetX, h / 2, z * TILE_SIZE - offsetZ);
            mesh.userData = { x, z, h: cell.h };
            scene.add(mesh);

            window.tilesMeshMap[`${x},${z}`] = mesh;
            window.interactableTiles.push(mesh);
        }
    }

    // ★ 追加：ビルボードクロス（十字交差）方式で障害物を配置
    if (obstacles) {
        if (treeTex) { treeTex.magFilter = THREE.NearestFilter; treeTex.minFilter = THREE.NearestFilter; }
        if (rockTex) { rockTex.magFilter = THREE.NearestFilter; rockTex.minFilter = THREE.NearestFilter; }
        
        // alphaTest: 0.5 を指定することで、背景透明な画像を交差させても描画が破綻しません
        const treeMat = new THREE.MeshLambertMaterial({ map: treeTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
        const rockMat = new THREE.MeshLambertMaterial({ map: rockTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
        
        // 2枚の板を用意して片方を90度回転させる
        const obsGeo1 = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
        const obsGeo2 = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
        obsGeo2.rotateY(Math.PI / 2);

        obstacles.forEach(obs => {
            // 歩けないようにリストに登録
            window.obstaclesMap.add(`${obs.x},${obs.z}`);
            
            const cell = mapData[obs.z][obs.x];
            const mat = obs.type === 'tree' ? treeMat : rockMat;
            
            const mesh1 = new THREE.Mesh(obsGeo1, mat);
            const mesh2 = new THREE.Mesh(obsGeo2, mat);
            
            const group = new THREE.Group();
            group.add(mesh1);
            group.add(mesh2);
            
            // ブロックの上面の高さに合わせ、少しランダムに回転させて自然に見せる
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

            // ★ 追加：障害物があるマスは進入不可
            if (window.obstaclesMap && window.obstaclesMap.has(`${nx},${nz}`)) continue;

            const targetH = mapData[nz][nx].h;
            // 高低差がジャンプ力より大きい場合は進入不可（コンプなら2段までOK）
            if (Math.abs(targetH - mapData[current.z][current.x].h) > unit.jump) continue;
            
            const blocker = units.find(u => u.x === nx && u.z === nz && u.hp > 0);
            if (blocker && blocker.isPlayer !== unit.isPlayer) continue;

            visited.add(`${nx},${nz}`);
            openList.push({ x: nx, z: nz, d: current.d + 1, path: [...current.path, { x: nx, z: nz, h: targetH }] });
        }
    }
    return nodes;
}
