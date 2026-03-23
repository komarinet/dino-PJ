export const VERSION = "8.17.2";
export const TILE_SIZE = 60;
export const H_STEP = 30;
export const MAP_W = 25;
export const MAP_D = 25;

export function buildMapMeshes(scene, sheetImg, mapData) {
    if (!mapData) return;

    const texture = new THREE.CanvasTexture(sheetImg);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    
    // 画像サイズ (1280 x 384) に対する、1ブロックの比率
    // 横: 1列 = 256px -> 256 / 1280 = 0.2
    // 縦: 1行(天面) = 256px -> 256 / 384 = 0.666...
    // 縦: 1行(側面) = 64px -> 64 / 384 = 0.166...
    const wRatio = 256 / 1280; 
    const hRatioTop = 256 / 384;
    const hRatioSide = 64 / 384;

    const offsetX = (MAP_W * TILE_SIZE) / 2;
    const offsetZ = (MAP_D * TILE_SIZE) / 2;

    window.tilesMeshMap = {};
    window.interactableTiles = [];

    // ★ マテリアルキャッシュ（今回は1マスを「1つのMesh」で構成するため、1マテリアルで処理します）
    const material = new THREE.MeshLambertMaterial({ map: texture, transparent: true });

    for (let z = 0; z < MAP_D; z++) {
        for (let x = 0; x < MAP_W; x++) {
            const cell = mapData[z][x];
            // 高さが0の場合は1として扱う（描画のため）
            const blocksHigh = Math.max(1, cell.h); 
            const h = blocksHigh * H_STEP;
            
            const geo = new THREE.BoxGeometry(TILE_SIZE, h, TILE_SIZE);
            const uvAttr = geo.attributes.uv;

            const col = cell.type; // 0〜4 の列番号

            // UV座標を書き換える
            for (let i = 0; i < uvAttr.count; i++) {
                const u = uvAttr.getX(i);
                const v = uvAttr.getY(i);

                // Three.js の BoxGeometry の面インデックス:
                // 0, 1: 右面
                // 2, 3: 左面
                // 4, 5: 上面 (Top)
                // 6, 7: 下面 (Bottom)
                // 8, 9: 前面
                // 10, 11: 後面
                
                // 面の判定
                const isTop = (i >= 8 && i <= 11); // BoxGeometryの仕様上、天面はここになることが多い
                const isBottom = (i >= 12 && i <= 15);
                const isSide = !isTop && !isBottom;

                let newU, newV;

                if (isTop) {
                    // --- 天面 (1行目: 256x256) ---
                    // 画像の上部 (1.0) から 256px分 (0.666...) 下がった所まで
                    newU = (u + col) * wRatio;
                    newV = 1.0 - hRatioTop + (v * hRatioTop);
                } else if (isBottom) {
                    // --- 下面（見えないので適当でOK） ---
                    newU = 0; newV = 0;
                } else {
                    // --- 側面 (2行目: Part1, 3行目: Part2...) ---
                    newU = (u + col) * wRatio;

                    // 高さに応じてテクスチャをどう貼るか計算する
                    // v は 0(下) から 1(上) まで変化する。
                    // 柱全体に対する現在の高さを H_STEP 単位の「段数(段のインデックス)」に変換。
                    
                    // 現在のピクセル位置(0 〜 1)を、下からの段数に変換。
                    // 一番上の段(blocksHigh - 1) が Part1(2行目)、それより下が Part2(3行目)。
                    
                    // y位置(下から上へ0〜1)から、上から何段目かを計算
                    const currentBlockFromTop = Math.floor((1.0 - v) * blocksHigh);
                    
                    // その段の中でのローカルなv座標(下から上へ0〜1)
                    // (v * blocksHigh)の小数部分
                    let localV = (v * blocksHigh) % 1.0;
                    if (localV === 0 && v > 0) localV = 1.0; // 一番上の端点の処理

                    if (currentBlockFromTop === 0) {
                        // 【最上段】 = Part1 (画像の中段: 上から256px〜320px)
                        // UVのY座標: 1.0(上) - 256/384(0.666) - 64/384(0.166) = 0.166... 〜 0.333... の範囲
                        const topOfPart1 = 1.0 - hRatioTop; // 0.333...
                        newV = topOfPart1 - hRatioSide + (localV * hRatioSide);
                    } else {
                        // 【2段目以降】 = Part2 (画像の下段: 上から320px〜384px)
                        // UVのY座標: 0.0 〜 0.166... の範囲
                        
                        // 先生のルール: Part2, 逆さ, 正, 逆さ...
                        // currentBlockFromTop が 1(2段目)=正, 2(3段目)=逆さ, 3(4段目)=正...
                        const isUpsideDown = (currentBlockFromTop % 2 === 0);
                        
                        if (isUpsideDown) {
                            // 逆さ：localV を反転させる (1 - localV)
                            newV = 0.0 + ((1.0 - localV) * hRatioSide);
                        } else {
                            // 正位置
                            newV = 0.0 + (localV * hRatioSide);
                        }
                    }
                }
                uvAttr.setXY(i, newU, newV);
            }
            // UVの更新をThree.jsに通知
            uvAttr.needsUpdate = true;

            const mesh = new THREE.Mesh(geo, material);
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
