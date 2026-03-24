export const VERSION = "8.20.6";
import { gameStore, getStore, VERSION as storeV } from './store.js';
import { Unit, getUnitAt, getAttackableEnemies, VERSION as unitV } from './units.js';
import { CameraControl, VERSION as camV } from './camera.js';
import { UIControl, VERSION as uiV } from './ui.js';
import { BattleSystem, VERSION as batV } from './battle.js';
import { buildMapMeshes, getWalkableNodes, TILE_SIZE, H_STEP, MAP_W, MAP_D, VERSION as mapV } from './map.js';
import { StageData, VERSION as sceV } from './data/stage01.js';

function checkSystems() {
    const list = document.getElementById('ver-list');
    const currentVersions = { "main.js": VERSION, "store.js": storeV, "units.js": unitV, "camera.js": camV, "ui.js": uiV, "battle.js": batV, "map.js": mapV, "data/stage01.js": sceV };
    list.innerHTML = "";
    for (let [file, curVer] of Object.entries(currentVersions)) {
        const isLatest = curVer && curVer.startsWith("8.20");
        list.innerHTML += `<div style="color:${isLatest ? '#0f0' : '#ffcc00'}">${file.padEnd(16)}: ver ${curVer || '---'}</div>`;
    }
    document.getElementById('btn-start-game').style.display = 'block';
}

let scene, camera, renderer, clock, cameraCtrl, uiCtrl, battleSys;
const mapData = StageData.generateLayout();
let highlightMeshes = [];
const moveHighlightMat = new THREE.MeshBasicMaterial({ color: 0x55ff55, transparent: true, opacity: 0.6, depthTest: false });
const attackHighlightMat = new THREE.MeshBasicMaterial({ color: 0xff5555, transparent: true, opacity: 0.6, depthTest: false });
const targetHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8, depthTest: false });
const highlightGeo = new THREE.PlaneGeometry(TILE_SIZE * 0.9, TILE_SIZE * 0.9);

window.addEventListener('load', () => {
    checkSystems();
    document.getElementById('btn-start-game').onclick = () => { document.getElementById('boot-screen').style.display = 'none'; runGame(); };
});

async function runGame() {
    clock = new THREE.Clock();
    const texLoader = new THREE.TextureLoader();
    const loadTex = (url) => new Promise(res => texLoader.load(url, res));
    const sheetImg = new Image(); sheetImg.src = 'img/plate01.png';
    sheetImg.onload = async () => {
        const [bra, rex, comp, tree, rock] = await Promise.all([loadTex('img/bra.png'), loadTex('img/tactyrano01.png'), loadTex('img/comp.png'), loadTex('img/tree01.png'), loadTex('img/rock01.png')]);
        init(sheetImg, bra, rex, comp, tree, rock);
    };
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
    cameraCtrl = new CameraControl(camera, renderer.domElement);
    uiCtrl = new UIControl(cameraCtrl);
    battleSys = new BattleSystem(uiCtrl, cameraCtrl);

    const statusUI = document.getElementById('status-ui');
    if(statusUI) { statusUI.style.top = 'auto'; statusUI.style.bottom = '20px'; statusUI.style.left = '20px'; }

    let createdUnits = [];
    window.units = StageData.units.map(u => {
        let conf = null;
        if(u.id === 'ブラキオサウルス') conf = { tex: braTex.clone(), cols: 1, rows: 5, type: 'bra', w: 352, h: 1250 };
        else if (u.id === 'ティラノ') conf = { tex: rexTex.clone(), cols: 4, rows: 4, type: 'rex', w: 1200, h: 840 };
        else conf = { tex: compTex.clone(), cols: 3, rows: 2, type: 'comp', w: 1080, h: 480 };
        
        const unit = new Unit(u.id, u.emoji, u.x, u.z, u.hp, u.mp, u.str, u.def, u.spd, u.mag, u.move, u.jump, u.isPlayer, conf, u.level);
        unit.h = mapData[unit.z][unit.x].h; 
        if (!unit.isPlayer) { unit.facing = -1; if (unit.sprite) unit.sprite.scale.x = unit.baseScaleX * -1; }
        scene.add(unit.sprite);
        const offX = (MAP_W * TILE_SIZE) / 2, offZ = (MAP_D * TILE_SIZE) / 2;
        unit.sprite.position.set((unit.x * TILE_SIZE) - offX, unit.h * H_STEP, (unit.z * TILE_SIZE) - offZ);
        if(unit.isPlayer) window.player = unit;
        return unit;
    });
    animate();
    startDialogue();
}

function startDialogue() {
    gameStore.setState({ gameState: 'TALKING', talkIndex: 0 });
    document.getElementById('event-ui').style.display = 'flex';
    window.onGlobalTap = () => {
        const idx = getStore().talkIndex + 1;
        if(idx < StageData.preBattleTalk.length) {
            gameStore.setState({ talkIndex: idx });
            uiCtrl.renderTalkLine(StageData.preBattleTalk[idx], window.units, window.player);
        } else {
            document.getElementById('event-ui').style.display = 'none';
            gameStore.setState({ gameState: 'IDLE', phase: 'PLAYER_PHASE' });
        }
    };
    uiCtrl.renderTalkLine(StageData.preBattleTalk[0], window.units, window.player);
}

function showHighlight(nodeList, mat) {
    const offX = (MAP_W * TILE_SIZE) / 2, offZ = (MAP_D * TILE_SIZE) / 2;
    nodeList.forEach(node => {
        const mesh = new THREE.Mesh(highlightGeo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set((node.x * TILE_SIZE) - offX, (node.h * H_STEP) + 10, (node.z * TILE_SIZE) - offZ);
        mesh.renderOrder = 999;
        scene.add(mesh);
        highlightMeshes.push(mesh);
    });
}

function clearHighlights() { highlightMeshes.forEach(m => scene.remove(m)); highlightMeshes = []; }

function onPointerClick(event) {
    const store = getStore();
    if (store.gameState === 'ANIMATING' || store.gameState === 'ENEMY_TURN') return;
    if (store.gameState === 'TALKING') { if(window.onGlobalTap) window.onGlobalTap(); return; }
    const mouse = new THREE.Vector2((event.clientX/window.innerWidth)*2-1, -(event.clientY/window.innerHeight)*2+1);
    const raycaster = new THREE.Raycaster(); raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects([...window.interactableTiles, ...window.units.map(u => u.sprite)]);
    if (intersects.length > 0) {
        const obj = intersects[0].object, data = obj.userData.isUnit ? { x: obj.userData.unit.x, z: obj.userData.unit.z } : obj.userData;
        if(store.gameState === 'IDLE') {
            const u = getUnitAt(window.units, data.x, data.z);
            if(u && u.isPlayer && !u.hasActed) { uiCtrl.updateCommandMenu(u); document.getElementById('command-ui').style.display = 'block'; }
        } else if (store.gameState === 'SELECTING_MOVE') {
            const route = store.walkableTiles.find(n => n.x === data.x && n.z === data.z);
            if(route) {
                clearHighlights(); showHighlight([route], targetHighlightMat);
                gameStore.setState({ gameState: 'CONFIRMING', confirmMode: 'MOVE', pendingData: route.path });
                document.getElementById('confirm-ui').style.display = 'block';
            }
        }
    }
}

function execCommand(cmd) {
    if(cmd === 'move') {
        const tiles = getWalkableNodes(window.units, window.player, mapData);
        gameStore.setState({ gameState: 'SELECTING_MOVE', walkableTiles: tiles });
        showHighlight(tiles, moveHighlightMat);
        document.getElementById('command-ui').style.display = 'none';
    } else if(cmd === 'wait') {
        completePlayerAction(window.player);
    }
}

function answerConfirm(isYes) {
    const store = getStore(); document.getElementById('confirm-ui').style.display = 'none';
    if(!isYes) { clearHighlights(); if(store.confirmMode === 'MOVE') return execCommand('move'); return; }
    clearHighlights(); gameStore.setState({ gameState: 'ANIMATING' });
    if(store.confirmMode === 'MOVE') {
        battleSys.executeMovement(window.player, store.pendingData, () => { 
            window.player.hasMoved = true; gameStore.setState({ gameState: 'IDLE' }); 
            document.getElementById('command-ui').style.display = 'block'; 
        });
    }
}

function completePlayerAction(unit) {
    unit.hasActed = true; 
    const active = window.units.filter(u => u.isPlayer && u.hp > 0 && !u.hasActed);
    if (active.length > 0) { gameStore.setState({ gameState: 'IDLE' }); } 
    else { processEnemyAI(); }
}

async function processEnemyAI() {
    const enemies = window.units.filter(u => !u.isPlayer && u.hp > 0);
    for(let i=0; i<enemies.length; i+=2) {
        const chunk = enemies.slice(i, i+2);
        await Promise.all(chunk.map(async (e) => {
            e.lookAtNode(window.player.x, window.player.z);
            const routes = getWalkableNodes(window.units, e, mapData);
            let best = routes.sort((a,b) => (Math.abs(a.x-window.player.x)+Math.abs(a.z-window.player.z)) - (Math.abs(b.x-window.player.x)+Math.abs(b.z-window.player.z)))[0];
            if(best) await new Promise(res => battleSys.executeMovement(e, best.path, res));
        }));
    }
    window.units.forEach(u => u.hasActed = false);
    gameStore.setState({ gameState: 'IDLE', phase: 'PLAYER_PHASE' });
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta() * 1000;
    window.units.forEach(u => u.updateAnimation && u.updateAnimation(delta));
    renderer.render(scene, camera);
}

function setupEventListeners() {
    renderer.domElement.addEventListener('pointerup', onPointerClick);
    document.getElementById('cmd-move').onclick = () => execCommand('move');
    document.getElementById('cmd-wait').onclick = () => execCommand('wait');
    document.querySelector('.btn-yes').onclick = () => answerConfirm(true);
    document.querySelector('.btn-no').onclick = () => answerConfirm(false);
}
