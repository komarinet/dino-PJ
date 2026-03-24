/* =================================================================
   main.js - v8.20.0 【前半】
   変更点：初期配置のバリデーション、UIイベントの紐付け
   ================================================================= */

export const VERSION = "8.20.0";

import { gameStore, getStore, VERSION as storeV } from './store.js';
import { Unit, getUnitAt, getAttackableEnemies, VERSION as unitV } from './units.js';
import { CameraControl, VERSION as camV } from './camera.js';
import { UIControl, VERSION as uiV } from './ui.js';
import { BattleSystem, VERSION as batV } from './battle.js';
import { buildMapMeshes, getWalkableNodes, TILE_SIZE, H_STEP, MAP_W, MAP_D, VERSION as mapV } from './map.js';
import { StageData, VERSION as sceV } from './data/stage01.js';

function checkSystems() {
    const list = document.getElementById('ver-list');
    const currentVersions = {
        "main.js": VERSION, "store.js": storeV, "units.js": unitV, 
        "camera.js": camV, "ui.js": uiV, "battle.js": batV, 
        "map.js": mapV, "data/stage01.js": sceV
    };
    
    let allOk = true;
    list.innerHTML = "";
    
    for (let [file, curVer] of Object.entries(currentVersions)) {
        const isOk = curVer && curVer.startsWith("8.20");
        if (!isOk) allOk = false;
        list.innerHTML += `<div style="color:${isOk ? '#0f0' : '#f00'}">${file.padEnd(16)}: ver ${curVer || '---'} [${isOk ? 'OK' : 'OLD'}]</div>`;
    }

    if (allOk) {
        document.getElementById('btn-start-game').style.display = 'block';
        list.innerHTML += `<div style="color:#0f0; margin-top:10px; font-weight:bold;">READY TO START!</div>`;
    } else {
        list.innerHTML += `<div style="color:#f00; margin-top:10px; font-weight:bold;">! アップデートが必要です。</div>`;
    }
}

let scene, camera, renderer, clock, cameraCtrl, uiCtrl, battleSys;
const mapData = StageData.generateLayout();

let highlightMeshes = [];
const moveHighlightMat = new THREE.MeshBasicMaterial({ color: 0x55ff55, transparent: true, opacity: 0.5, depthWrite: false });
const attackHighlightMat = new THREE.MeshBasicMaterial({ color: 0xff5555, transparent: true, opacity: 0.5, depthWrite: false });
const targetHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.7, depthWrite: false });
const highlightGeo = new THREE.PlaneGeometry(TILE_SIZE * 0.9, TILE_SIZE * 0.9);

window.addEventListener('load', () => {
    checkSystems();
    document.getElementById('btn-clear-data').onclick = () => { 
        if(confirm("以前のデータを完全に消去してリロードしますか？")) {
            localStorage.clear(); 
            location.reload(); 
        }
    };
    document.getElementById('btn-start-game').onclick = () => {
        document.getElementById('boot-screen').style.display = 'none';
        document.getElementById('loading-screen').style.display = 'flex';
        runGame();
    };
});

async function runGame() {
    try {
        clock = new THREE.Clock();
        const texLoader = new THREE.TextureLoader();
        const loadTex = (url) => new Promise(res => texLoader.load(url, res, undefined, () => res(null)));
        const sheetImg = new Image(); sheetImg.src = 'img/plate01.png';
        sheetImg.onload = async () => {
            const [braTex, rexTex, compTex, treeTex, rockTex] = await Promise.all([
                loadTex('img/bra.png'), 
                loadTex('img/tactyrano01.png'), 
                loadTex('img/comp.png'),
                loadTex('img/tree01.png'),
                loadTex('img/rock01.png')
            ]);
            init(sheetImg, braTex, rexTex, compTex, treeTex, rockTex);
            document.getElementById('loading-screen').style.display = 'none';
        };
    } catch (e) { console.error(e); }
}

function init(sheetImg, braTex, rexTex, compTex, treeTex, rockTex) {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    const w = container.clientWidth, h = container.clientHeight;
    camera = new THREE.OrthographicCamera(-w, w, h, -h, 1, 4000); camera.zoom = 1.5; camera.updateProjectionMatrix();
    renderer = new THREE.WebGLRenderer({ antialias: false }); renderer.setSize(w, h); renderer.setClearColor(0x1a1a1a);
    container.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    
    buildMapMeshes(scene, sheetImg, treeTex, rockTex, mapData, StageData.obstacles);

    cameraCtrl = new CameraControl(camera, new THREE.OrbitControls(camera, renderer.domElement));
    uiCtrl = new UIControl(cameraCtrl);
    battleSys = new BattleSystem(uiCtrl, cameraCtrl);

    // ★ ユニット配置のデバッグ：水場や重複を回避して配置
    window.units = StageData.units.map(u => {
        let conf = null;
        if(u.id === 'ブラキオサウルス') conf = { tex: braTex?.clone(), cols: 1, rows: 5, type: 'bra', w: 352, h: 1250 };
        else if (u.id === 'ティラノ') conf = { tex: rexTex?.clone(), cols: 4, rows: 4, type: 'rex', w: 1200, h: 840 };
        else if (u.id.includes('コンプ')) conf = { tex: compTex?.clone(), cols: 3, rows: 2, type: 'comp', w: 1080, h: 480 };
        if(conf && conf.tex) conf.tex.needsUpdate = true;
        
        // 安全な配置場所の検索ロジック
        let spawnX = u.x, spawnZ = u.z;
        if (window.obstaclesMap.has(`${spawnX},${spawnZ}`)) {
            findLoop: for (let r = 1; r < 5; r++) {
                for (let dx = -r; dx <= r; dx++) {
                    for (let dz = -r; dz <= r; dz++) {
                        let nx = u.x + dx, nz = u.z + dz;
                        if (nx >= 0 && nx < MAP_W && nz >= 0 && nz < MAP_D && !window.obstaclesMap.has(`${nx},${nz}`)) {
                            spawnX = nx; spawnZ = nz; break findLoop;
                        }
                    }
                }
            }
        }
        
        const unit = new Unit(u.id, u.emoji, spawnX, spawnZ, u.hp, u.mp, u.str, u.def, u.spd, u.mag, u.move, u.jump, u.isPlayer, conf, u.level);
        unit.h = mapData[unit.z][unit.x].h; 
        scene.add(unit.sprite);
        if (unit.shadow) scene.add(unit.shadow);

        const offX = (MAP_W * TILE_SIZE) / 2, offZ = (MAP_D * TILE_SIZE) / 2;
        unit.sprite.position.set((unit.x * TILE_SIZE) - offX, unit.h * H_STEP, (unit.z * TILE_SIZE) - offZ);
        
        if(unit.isPlayer) window.player = unit; 
        return unit;
    });

    window.units.forEach(u => {
        if (!u.isPlayer) u.lookAtNode(window.player.x, window.player.z);
    });

    setupEventListeners();
    animate();

    cameraCtrl.setInitialAngle(window.player.sprite.position);

    const o = document.getElementById('stage-overlay');
    document.getElementById('chapter-num').innerText = StageData.info.chapter;
    document.getElementById('stage-title').innerHTML = StageData.info.name;
    gsap.to(o, { opacity: 1, duration: 1.5, onComplete: () => {
        gsap.to(o, { opacity: 0, delay: 2.0, onComplete: () => {
            const boss = window.units.find(u => u.id === 'ブラキオサウルス');
            cameraCtrl.playOpening(boss, window.player, () => {
                startDialogue();
            });
        }});
    }});
}

function startDialogue() {
    gameStore.setState({ gameState: 'TALKING', talkIndex: 0 });
    uiCtrl.hideAll(); cameraCtrl.setZoom(2.5);
    document.getElementById('event-ui').style.display = 'flex';
    window.onGlobalTap = () => {
        const idx = getStore().talkIndex + 1;
        if(idx < StageData.preBattleTalk.length) {
            gameStore.setState({ talkIndex: idx });
            uiCtrl.renderTalkLine(StageData.preBattleTalk[idx], window.units, window.player);
        } else {
            document.getElementById('event-ui').style.display = 'none';
            cameraCtrl.setZoom(1.5); 
            gameStore.setState({ gameState: 'IDLE', phase: 'PLAYER_PHASE' });
            
            const overlay = document.getElementById('battle-start-overlay');
            gsap.fromTo(overlay, { opacity:0, scale:0.5 }, { opacity:1, scale:1, duration:0.5, onComplete: () => {
                gsap.to(overlay, { opacity:0, delay:1.0, onComplete: () => { uiCtrl.setMsg("あなたの番です！", "#00ff00"); } });
            }});
        }
    };
    uiCtrl.renderTalkLine(StageData.preBattleTalk[0], window.units, window.player);
}

function setupEventListeners() {
    renderer.domElement.addEventListener('pointerup', onPointerClick);
    document.getElementById('btn-toggle-detail').onclick = () => { const d = document.getElementById('detail-ui'); d.style.display = (d.style.display === 'block' ? 'none' : 'block'); };
    document.getElementById('cmd-move').onclick = () => execCommand('move');
    document.getElementById('cmd-attack').onclick = () => execCommand('attack');
    document.getElementById('cmd-wait').onclick = () => execCommand('wait');
    document.getElementById('cmd-cancel').onclick = () => { uiCtrl.hideAll(); clearHighlights(); gameStore.setState({ gameState: 'IDLE' }); };
    document.getElementById('btn-cancel-attack').onclick = () => { document.getElementById('target-ui').style.display = 'none'; clearHighlights(); document.getElementById('command-ui').style.display = 'block'; };
    document.querySelector('.btn-yes').onclick = () => answerConfirm(true);
    document.querySelector('.btn-no').onclick = () => answerConfirm(false);
    
    const camUI = document.getElementById('camera-ui');
    document.getElementById('ui-header').onclick = () => camUI.classList.toggle('collapsed');
    camUI.querySelectorAll('.ui-btn').forEach(btn => {
        btn.onclick = () => {
            const t = btn.dataset.cam;
            if(t === 'rotate-left') cameraCtrl.rotate(-90); if(t === 'rotate-right') cameraCtrl.rotate(90);
            if(t === 'pan-up') cameraCtrl.pan(0, -1); if(t === 'pan-down') cameraCtrl.pan(0, 1);
            if(t === 'pan-left') cameraCtrl.pan(-1, 0); if(t === 'pan-right') cameraCtrl.pan(1, 0);
            if(t === 'center') cameraCtrl.centerOn(window.player.sprite.position);
            if(t === 'zoom-in') cameraCtrl.setZoom(camera.zoom + 0.3); if(t === 'zoom-out') cameraCtrl.setZoom(camera.zoom - 0.3);
        };
    });
}

function showHighlight(nodeList, mat) {
    const offX = (MAP_W * TILE_SIZE) / 2, offZ = (MAP_D * TILE_SIZE) / 2;
    nodeList.forEach(node => {
        const mesh = new THREE.Mesh(highlightGeo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set((node.x * TILE_SIZE) - offX, (node.h * H_STEP) + 2, (node.z * TILE_SIZE) - offZ);
        scene.add(mesh);
        highlightMeshes.push(mesh);
    });
}

function clearHighlights() {
    highlightMeshes.forEach(mesh => scene.remove(mesh));
    highlightMeshes = [];
}
