export const TILE_SIZE = 60;
export const H_STEP = 30;
export const MAP_W = 25;
export const MAP_D = 25;

export function buildMapMeshes(scene, sheetImg) {
    const loader = new THREE.TextureLoader();
    const mapTex = new THREE.CanvasTexture(sheetImg);
    mapTex.magFilter = THREE.NearestFilter;
    mapTex.minFilter = THREE.NearestFilter;

    const materials = [];
    for (let i = 0; i < 6; i++) {
        materials.push(new THREE.MeshLambertMaterial({ map: mapTex.clone(), transparent: true }));
    }

    const setUV = (mat, col, row) => {
        mat.map.repeat.set(1/8, 1/8);
        mat.map.offset.set(col/8, 1 - (row+1)/8);
    };

    const mapData = window.gameMapData; // main.jsでセット
    const offsetX = (MAP_W * TILE_SIZE) / 2;
    const offsetZ = (MAP_D * TILE_SIZE) / 2;

    window.tilesMeshMap = {};
    window.interactableTiles = [];

    for (let z = 0; z < MAP_D; z++) {
        for (let x = 0; x < MAP_W; x++) {
            const cell = mapData[z][x];
            const h = cell.h * H_STEP;
            const geo = new THREE.BoxGeometry(TILE_SIZE, h, TILE_SIZE);
            const mats = materials.map(m => m.clone());
            
            // 天面の設定
            setUV(mats[2], cell.type, 0);
            // 側面の設定
            [0, 1, 4, 5].forEach(i => setUV(mats[i], cell.type, 1));

            const mesh = new THREE.Mesh(geo, mats);
            mesh.position.set(x * TILE_SIZE - offsetX, h / 2, z * TILE_SIZE - offsetZ);
            mesh.userData = { x, z, h: cell.h };
            scene.add(mesh);

            window.tilesMeshMap[`${x},${z}`] = mesh;
            window.interactableTiles.push(mesh);
        }
    }
}

// 経路探索アルゴリズム
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
            if (nx < 0 || nx >= MAP_W || nz < 0 || nz >= MAP_D) continue;
            if (visited.has(`${nx},${nz}`)) continue;

            const targetH = mapData[nz][nx].h;
            if (Math.abs(targetH - mapData[current.z][current.x].h) > unit.jump) continue;
            
            const blocker = units.find(u => u.x === nx && u.z === nz && u.hp > 0);
            if (blocker && blocker.isPlayer !== unit.isPlayer) continue;

            visited.add(`${nx},${nz}`);
            openList.push({ x: nx, z: nz, d: current.d + 1, path: [...current.path, { x: nx, z: nz, h: targetH }] });
        }
    }
    return nodes;
}
