/* main.js - v8.20.25 */
export const VERSION = "8.20.25";

import { gameStore, getStore } from './store.js';
import { Unit, getUnitAt, getAttackableEnemies } from './units.js';
import { CameraControl } from './camera.js';
import { UIControl } from './ui.js';
import { BattleSystem } from './battle.js';
import { buildMapMeshes, getWalkableNodes, TILE_SIZE, H_STEP, MAP_W, MAP_D } from './map.js';
import { StageData } from './data/stage01.js';

let scene, camera, renderer, clock, cameraCtrl, uiCtrl, battleSys;
const mapData = StageData.generateLayout();
let highlightMeshes = [];
const moveHighlightMat = new THREE.MeshBasicMaterial({ color: 0x55ff55, transparent: true, opacity: 0.6, depthTest: false });
const targetHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8, depthTest: false });
const highlightGeo = new THREE.PlaneGeometry(TILE_SIZE * 0.9, TILE_SIZE * 0.9);

window.addEventListener('load', () => {
    document.getElementById('btn-start-game').onclick = () => {
        document.getElementById('boot-screen').style.display = 'none';
        runGame();
    };
    // 初期チェックなどの表示用（省略可）
    const list = document.getElementById('ver-list');
    list.innerHTML = `main.js: ${VERSION}<br>Ready to start.`;
    document.getElementById('btn-start-game').style.display = 'block';
});

async function runGame() {
    clock = new THREE.Clock();
    const texLoader = new THREE.TextureLoader();
    const loadTex = (url) => new Promise(res => texLoader.load(url, res, undefined, () => res(null)));
    const sheetImg = new Image(); sheetImg.src = 'img/plate01.png';
    sheetImg.onload = async () => {
        const [braTex, rexTex, compTex, treeTex, rockTex] = await Promise.all([
            loadTex('img/bra.png'), loadTex('img/tactyrano01.png'), loadTex('img/comp.png'),
            loadTex('img/tree01.png'), loadTex('img/rock01.png')
        ]);
        init(sheetImg, braTex, rexTex, compTex, treeTex, rockTex);
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
    cameraCtrl = new CameraControl(camera, new THREE.OrbitControls(camera, renderer.domElement));
    uiCtrl = new UIControl(cameraCtrl);
    battleSys = new BattleSystem(uiCtrl, cameraCtrl);

    // ★ 徹底：起動時に全UIを隠す
    uiCtrl.hideAll();

    window.units = StageData.units.map(u => {
        let conf = (u.id === 'ブラキオサウルス') ? { tex: braTex?.clone(), cols: 1, rows: 5, type: 'bra', w: 352, h: 1250 } :
                   (u.id === 'ティラノ') ? { tex: rexTex?.clone(), cols: 4, rows: 4, type: 'rex', w: 1200, h: 840 } :
                   { tex: compTex?.clone(), cols: 3, rows: 2, type: 'comp', w: 1080, h: 480 };
        const unit = new Unit(u.id, u.emoji, u.x, u.z, u.hp, u.mp, u.str, u.def, u.spd, u.mag, u.move, u.jump, u.isPlayer, conf, u.level);
        unit.h = mapData[unit.z][unit.x].h;
        scene.add(unit.sprite);
        const offX = (MAP_W * TILE_SIZE) / 2, offZ = (MAP_D * TILE_SIZE) / 2;
        unit.sprite.position.set((unit.x * TILE_SIZE) - offX, unit.h * H_STEP, (unit.z * TILE_SIZE) - offZ);
        if(unit.isPlayer) window.player = unit;
        return unit;
    });

    animate();
    const playerCenter = new THREE.Vector3();
    new THREE.Box3().setFromObject(window.player.sprite).getCenter(playerCenter);
    cameraCtrl.setInitialAngle(playerCenter);

    const o = document.getElementById('stage-overlay');
    document.getElementById('chapter-num').innerHTML = StageData.info.chapter;
    document.getElementById('stage-title').innerHTML = StageData.info.name;
    gsap.to(o, { opacity: 1, duration: 1.5, onComplete: () => {
        gsap.to(o, { opacity: 0, delay: 2.0, onComplete: () => {
            const boss = window.units.find(u => u.id === 'ブラキオサウルス');
            cameraCtrl.playOpening(boss, window.player, () => { startDialogue(); });
        }});
    }});
}

function startDialogue() {
    gameStore.setState({ gameState: 'TALKING', talkIndex: 0 });
    uiCtrl.hideAll(); cameraCtrl.setZoom(2.5);
    document.getElementById('event-ui').style.display = 'flex';
    
    const playLine = (idx) => {
        const lineData = StageData.preBattleTalk[idx];
        // ★ 修正：renderTalkLineを呼び出す
        uiCtrl.renderTalkLine(lineData, window.units, window.player);
    };

    window.onGlobalTap = () => {
        const idx = getStore().talkIndex + 1;
        if(idx < StageData.preBattleTalk.length) {
            gameStore.setState({ talkIndex: idx });
            playLine(idx);
        } else {
            document.getElementById('event-ui').style.display = 'none';
            cameraCtrl.setZoom(1.5);
            gameStore.setState({ gameState: 'IDLE', phase: 'PLAYER_PHASE' });
            uiCtrl.setMsg("あなたの番です！", "#00ff00");
        }
    };
    playLine(0);
}

// 既存の animate, onPointerClick, showHighlight 等は v8.20.22 を維持
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta() * 1000;
    window.units.forEach(u => { if (u.updateAnimation) u.updateAnimation(delta); });
    cameraCtrl.controls.update();
    renderer.render(scene, camera);
}

function showHighlight(nodeList, mat) {
    const offX = (MAP_W * TILE_SIZE) / 2, offZ = (MAP_D * TILE_SIZE) / 2;
    nodeList.forEach(node => {
        const mesh = new THREE.Mesh(highlightGeo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set((node.x * TILE_SIZE) - offX, (node.h * H_STEP) + 10, (node.z * TILE_SIZE) - offZ);
        scene.add(mesh);
        highlightMeshes.push(mesh);
    });
}

function onPointerClick(event) {
    const store = getStore();
    if (store.gameState === 'ANIMATING' || store.gameState === 'ENEMY_TURN') return;
    if (store.gameState === 'TALKING') { if(window.onGlobalTap) window.onGlobalTap(); return; }
    // ... 以降のロジックは v8.20.22 と同様
}
