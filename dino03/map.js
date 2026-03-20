window.MAP_W = 25; 
window.MAP_D = 25;
window.TILE_SIZE = 60; 
window.H_STEP = 30;

window.mapData = []; 
window.tilesMeshMap = {}; 
window.interactableTiles = [];

// ★v7.3.0 「難攻不落の城塞：堀と水中テクスチャ実装」★
window.generateMapData = function() {
    for (let z = 0; z < window.MAP_D; z++) {
        window.mapData[z] = [];
        for (let x = 0; x < window.MAP_W; x++) {
            
            // 1. 基本の地形（城の外周）
            let h = 2; 
            let type = 0; // 草
            
            // 自然な起伏
            if (Math.random() > 0.8) { h = 3; }
            if (Math.random() > 0.95) { h = 4; type = 1; }

            // ★堀（お城の周りを囲む堀）をリアル化★
            // 堀の底の高さを h=0 にし、新しい水場テクスチャ（Type 4）を敷く
            if ( (x >= 2 && x <= 22 && z >= 16 && z <= 17) || 
                 (x >= 2 && x <= 3 && z >= 2 && z <= 17) || 
                 (x >= 21 && x <= 22 && z >= 2 && z <= 17) ) {
                h = 0; // 堀の底の高さを 0 に（水面のみ表示）
                type = 4; // 先生が描き足してくれた「水場」テクスチャ
            }

            // 3. 城塞のベース（中庭）
            if (x >= 4 && x <= 20 && z >= 2 && z <= 15) {
                h = 4; 
                type = 5; // 天面が草、側面が岩（特殊 Type 5 合成ブロック）
            }

            // 4. 正面の高い防壁 (h=6) と、その裏の通路 (h=5)
            if (x >= 4 && x <= 20 && z === 15) { h = 6; type = 3; } // 外壁 (全部岩)
            if (x >= 4 && x <= 20 && z === 14) { h = 5; type = 3; } // 石の通路 (全部岩)

            // 5. 左右の防壁
            if ((x === 4 || x === 20) && z >= 2 && z <= 15) { h = 6; type = 3; }

            // 6. 前衛の見張り塔（左右に出っ張ったバルコニー）
            if (x >= 4 && x <= 6 && z >= 13 && z <= 15) { h = 7; type = 3; }
            if (x >= 18 && x <= 20 && z >= 13 && z <= 15) { h = 7; type = 3; }

            // 7. 正面城門（城壁の一部が欠けている）
            if (x >= 11 && x <= 13 && z === 15) { h = 5; type = 3; }

            // 8. 堀を渡る大階段
            if (x >= 11 && x <= 13) {
                if (z === 16) { h = 4; type = 3; }
                if (z === 17) { h = 3; type = 3; }
                if (z === 18) { h = 2; type = 3; } // 堀の外と繋がる
            }

            // 9. 本丸（奥にあるボスの居城）
            if (x >= 8 && x <= 16 && z >= 2 && z <= 8) {
                h = 7; type = 3;
                // 王座の最上部
                if (x >= 9 && x <= 15 && z >= 2 && z <= 5) { h = 9; type = 3; } 
            }

            // 10. 本丸へ登る「L字型の階段」（アシンメトリーな構造）
            if (x === 15 && z >= 9 && z <= 11) {
                if (z === 11) { h = 5; type = 3; }
                if (z === 10) { h = 6; type = 3; }
                if (z === 9)  { h = 7; type = 3; }
            }

            // 本丸左側の防壁の装飾
            if (x >= 8 && x <= 10 && z >= 9 && z <= 11) {
                h = 5; type = 3;
            }

            window.mapData[z][x] = { h, type };
        }
    }
    window.units.forEach(u => { u.h = window.mapData[u.z][u.x].h; });
};

window.createMaterial = function(sheetImg, tx, ty, tw, th) {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d'); ctx.drawImage(sheetImg, tx, ty, tw, th, 0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas); tex.magFilter = THREE.NearestFilter;
    return new THREE.MeshLambertMaterial({ map: tex });
};

window.buildMapMeshes = function(scene, sheetImg) {
    const geometry = new THREE.BoxGeometry(window.TILE_SIZE, window.H_STEP, window.TILE_SIZE);
    const matSets = [];
    
    // 基本の4種類 (0:草, 1:土, 2:苔, 3:岩)
    for(let type=0; type<4; type++) {
        const tx = type * 256;
        matSets.push({ 
            top: window.createMaterial(sheetImg, tx, 0, 256, 256), 
            sideTop: window.createMaterial(sheetImg, tx, 256, 256, 64), 
            sideBottom: window.createMaterial(sheetImg, tx, 320, 256, 64) 
        });
    }

    // ★先生が追加した新しい水場テクスチャ (Type 4)★
    // 右に256px追加された位置 (tx = 4 * 256 = 1024) から切り出す
    // ここがユーザー様が追加した水場テクスチャ（1024px目）の開始位置です。完璧に合っています。
    const tx4 = 4 * 256;
    matSets.push({
        top: window.createMaterial(sheetImg, tx4, 0, 256, 256), // 水面
        sideTop: window.createMaterial(sheetImg, tx4, 256, 256, 64), // 水中断面
        sideBottom: window.createMaterial(sheetImg, tx4, 320, 256, 64) // 砂地側面
    });

    // 特殊Type5の合成 (Top草、Side岩)
    matSets.push({
        top: matSets[0].top,
        sideTop: matSets[3].sideTop,
        sideBottom: matSets[3].sideBottom
    });

    const offsetX = (window.MAP_W * window.TILE_SIZE) / 2; 
    const offsetZ = (window.MAP_D * window.TILE_SIZE) / 2;

    for (let z = 0; z < window.MAP_D; z++) {
        for (let x = 0; x < window.MAP_W; x++) {
            const tileData = window.mapData[z][x];
            const heightVal = tileData.h;
            const mats = matSets[tileData.type];

            // 堀の底（h=0）の処理：水面タイルのみを生成
            if (heightVal === 0 && tileData.type === 4) {
                const waterGeometry = new THREE.PlaneGeometry(window.TILE_SIZE, window.TILE_SIZE);
                waterGeometry.rotateX(-Math.PI / 2); // 上に向ける
                const waterMesh = new THREE.Mesh(waterGeometry, mats.top);
                waterMesh.position.set((x * window.TILE_SIZE) - offsetX, 0, (z * window.TILE_SIZE) - offsetZ); 
                scene.add(waterMesh);
                continue;
            }

            for (let i = Math.max(0, heightVal - 2); i < heightVal; i++) {
                let blockMats;
                if (i === heightVal - 1) {
                    blockMats = [mats.sideTop, mats.sideTop, mats.top.clone(), mats.sideBottom, mats.sideTop, mats.sideTop];
                } else {
                    blockMats = [mats.sideBottom, mats.sideBottom, mats.sideBottom, mats.sideBottom, mats.sideBottom, mats.sideBottom];
                }

                const cube = new THREE.Mesh(geometry, blockMats);
                cube.position.set((x * window.TILE_SIZE) - offsetX, (i * window.H_STEP) + (H_STEP / 2), (z * window.TILE_SIZE) - offsetZ);
                scene.add(cube);
                if (i === heightVal - 1) { 
                    cube.userData = { x, z, h: heightVal }; 
                    window.interactableTiles.push(cube); 
                    window.tilesMeshMap[`${x},${z}`] = cube; 
                }
            }
        }
    }
};

window.getWalkableNodes = function(unit) {
    let bestCost = {}; let queue = [{ x: unit.x, z: unit.z, cost: 0, path: [] }];
    let resultMap = {}; bestCost[`${unit.x},${unit.z}`] = 0;
    while(queue.length > 0) {
        queue.sort((a, b) => a.cost - b.cost); let curr = queue.shift();
        if (curr.cost > 0) resultMap[`${curr.x},${curr.z}`] = curr;
        let currH = window.mapData[curr.z][curr.x].h;
        for(let d of [[0,1],[1,0],[0,-1],[-1,0]]) {
            let nx = curr.x + d[0]; let nz = curr.z + d[1];
            if(nx >= 0 && nx < window.MAP_W && nz >= 0 && nz < window.MAP_D) {
                if(window.getUnitAt(nx, nz)) continue; 
                let nextH = window.mapData[nz][nx].h; let hDiff = nextH - currH;
                if(Math.abs(hDiff) <= unit.jump) { 
                    let stepCost = 1 + (hDiff > 0 ? hDiff : 0);
                    let newCost = curr.cost + stepCost;
                    if(newCost <= unit.move) {
                        let key = `${nx},${nz}`;
                        if(bestCost[key] === undefined || newCost < bestCost[key]) {
                            bestCost[key] = newCost;
                            queue.push({ x: nx, z: nz, cost: newCost, path: [...curr.path, {x: nx, z: nz, h: nextH}] });
                        }
                    }
                }
            }
        }
    }
    return Object.values(resultMap);
};
