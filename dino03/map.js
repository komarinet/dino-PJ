export const VERSION = "8.16.1";
export const TILE_SIZE = 60;
export const H_STEP = 30;
export const MAP_W = 25;
export const MAP_D = 25;

export function buildMapMeshes(scene, sheetImg, mapData) {
    if(!mapData) return;

    const mapTex = new THREE.CanvasTexture(sheetImg);
    mapTex.magFilter = THREE.NearestFilter;
    mapTex.minFilter = THREE.NearestFilter;

    // ★ プロの最適化：マテリアル（絵の具）をタイプごとにキャッシュ（使い回す）
    // これにより数千個のテクスチャが生成されるのを防ぎ、メモリ爆発を完全に無くします。
    const materialCache = {};

    function getMaterialsForType(type) {
        if (materialCache[type]) return materialCache[type];
        
        const mats = [];
        for (let i = 0; i < 6; i++) {
            const tex = mapTex.clone();
            tex.repeat.set(1/8, 1/8);
            // i===2 は天面(草など), それ以外は側面(土など)
            if (i === 2) {
                tex.offset.set(type/8, 1 - 1/8); 
            } else {
                tex.offset.set(type/8, 1 - 2/8); 
            }
            mats.push(new THREE.MeshLambertMaterial({ map: tex, transparent: true }));
        }
        materialCache[type] = mats;
        return mats;
    }

    const offsetX = (MAP_W * TILE_SIZE) / 2;
    const offsetZ = (MAP_D * TILE_SIZE) / 2;

    window.tilesMeshMap = {};
    window.interactableTiles = [];

    for (let z = 0; z < MAP_D; z++) {
        for (let x = 0; x < MAP_W; x++) {
            const cell = mapData[z][x];
            const h = Math.max(1, cell.h) * H_STEP; // 高さが0でもエラーにならないよう最低1を確保
            const geo = new THREE.BoxGeometry(TILE_SIZE, h, TILE_SIZE);
            
            // ★ キャッシュされたマテリアルを使い回す
            const mats = getMaterialsForType(cell.type);

            const mesh = new THREE.Mesh(geo, mats);
            mesh.position.set(x * TILE_SIZE - offsetX, h / 2, z * TILE_SIZE - offsetZ);
            mesh.userData = { x, z, h: cell.h };
            scene.add(mesh);

            window.tilesMeshMap[`${x},${z}`] = mesh;
            window.interactableTiles.push(mesh);
        }
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
