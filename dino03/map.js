window.MAP_W = 24; 
window.MAP_D = 18;
window.TILE_SIZE = 60; 
window.H_STEP = 30;

window.mapData = []; 
window.tilesMeshMap = {}; 
window.interactableTiles = [];

window.generateMapData = function() {
    for (let z = 0; z < window.MAP_D; z++) {
        window.mapData[z] = [];
        for (let x = 0; x < window.MAP_W; x++) {
            
            let h = 2; // 地面の基本高さ
            let type = 0; // 草

            // 1. 手前の水場 (z=16~17)
            if (z >= 16) { h = 0; type = 4; }

            // 2. 緩やかな起伏
            if (z < 16) { h = 2; type = 0; }
            if (z < 14) { h = 3; }

            // 3. 城壁の第一層 (h=5)
            if (z <= 10) { h = 5; type = 5; }

            // 4. 城壁の第二層 (h=7)
            if (z <= 6) { h = 7; type = 5; }

            // 5. 本丸（奥の塔 h=9）
            if (z <= 3 && x >= 8 && x <= 16) { h = 9; type = 3; }

            // 6. 城壁の階段（中央をジグザグに登る）
            if (x >= 11 && x <= 13) {
                if (z === 11) { h = 4; type = 3; }
                if (z === 10) { h = 5; type = 3; }
                if (z === 7)  { h = 6; type = 3; }
                if (z === 6)  { h = 7; type = 3; }
            }

            // 堀の表現
            if (z === 15) { h = 1; type = 2; }

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
    for(let type=0; type<4; type++) {
        const tx = type * 256;
        matSets.push({ 
            top: window.createMaterial(sheetImg, tx, 0, 256, 256), 
            sideTop: window.createMaterial(sheetImg, tx, 256, 256, 64), 
            sideBottom: window.createMaterial(sheetImg, tx, 320, 256, 64) 
        });
    }
    const tx4 = 4 * 256;
    matSets.push({
        top: window.createMaterial(sheetImg, tx4, 0, 256, 256),
        sideTop: window.createMaterial(sheetImg, tx4, 256, 256, 64),
        sideBottom: window.createMaterial(sheetImg, tx4, 320, 256, 64)
    });
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
            const h = tileData.h; const mats = matSets[tileData.type];
            if (h === 0 && tileData.type === 4) {
                const waterGeo = new THREE.PlaneGeometry(window.TILE_SIZE, window.TILE_SIZE);
                waterGeo.rotateX(-Math.PI / 2);
                const water = new THREE.Mesh(waterGeo, mats.top);
                water.position.set((x * window.TILE_SIZE) - offsetX, 0, (z * window.TILE_SIZE) - offsetZ); 
                scene.add(water);
                continue;
            }
            for (let i = Math.max(0, h - 2); i < h; i++) {
                let blockMats = (i === h - 1) ? [mats.sideTop, mats.sideTop, mats.top.clone(), mats.sideBottom, mats.sideTop, mats.sideTop] : [mats.sideBottom, mats.sideBottom, mats.sideBottom, mats.sideBottom, mats.sideBottom, mats.sideBottom];
                const cube = new THREE.Mesh(geometry, blockMats);
                cube.position.set((x * window.TILE_SIZE) - offsetX, (i * window.H_STEP) + (window.H_STEP / 2), (z * window.TILE_SIZE) - offsetZ);
                scene.add(cube);
                if (i === h - 1) { 
                    cube.userData = { x, z, h }; 
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
