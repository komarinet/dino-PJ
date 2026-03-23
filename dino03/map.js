export const VERSION = "8.16.0";
export const TILE_SIZE = 60;
export const MAP_W = 25;
export const MAP_D = 25;

export function buildMapMeshes(scene, sheetImg, mapData) {
    const texture = new THREE.CanvasTexture(sheetImg);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    // 天面(草原)用マテリアル
    const topMat = new THREE.MeshLambertMaterial({ map: texture.clone(), transparent: true });
    topMat.map.repeat.set(0.125, 0.125);
    // 側面(土)用マテリアル
    const sideMat = new THREE.MeshLambertMaterial({ map: texture.clone(), transparent: true });
    sideMat.map.repeat.set(0.125, 0.125);

    const offsetX = (MAP_W * TILE_SIZE) / 2;
    const offsetZ = (MAP_D * TILE_SIZE) / 2;

    window.tilesMeshMap = {};
    window.interactableTiles = [];

    for (let z = 0; z < MAP_D; z++) {
        for (let x = 0; x < MAP_W; x++) {
            const cell = mapData[z][x];
            const h = Math.max(1, cell.h) * 30;
            const geo = new THREE.BoxGeometry(TILE_SIZE, h, TILE_SIZE);
            
            // UV座標を直接書き換えて「アトラス」から切り出す（メモリ消費ゼロのプロ技）
            const uvAttr = geo.attributes.uv;
            const type = cell.type;
            for(let i=0; i<uvAttr.count; i++) {
                let u = uvAttr.getX(i), v = uvAttr.getY(i);
                // 面のインデックスに応じて切り出し位置を変更
                const isTop = (i >= 8 && i <= 11);
                const col = type, row = isTop ? 0 : 1;
                uvAttr.setXY(i, (u + col) * 0.125, 1 - (v + row + 1) * 0.125);
            }

            const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: texture, transparent: true }));
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
            if (Math.abs(mapData[nz][nx].h - mapData[current.z][current.x].h) > unit.jump) continue;
            if (units.find(u => u.x === nx && u.z === nz && u.hp > 0 && u.isPlayer !== unit.isPlayer)) continue;
            visited.add(`${nx},${nz}`);
            openList.push({ x: nx, z: nz, d: current.d + 1, path: [...current.path, { x: nx, z: nz, h: mapData[nz][nx].h }] });
        }
    }
    return nodes;
}
