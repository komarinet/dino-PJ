// --- 1. 部品のインポート ---
// もしここでエラーが出るなら、指定したファイルがGitHubに存在しないか名前が違います
import { gameStore, getStore } from './store.js';
import { Unit, getUnitAt, getAttackableEnemies } from './units.js';
import { CameraControl } from './camera.js';
import { UIControl } from './ui.js';
import { BattleSystem } from './battle.js';
import { StageData } from './data/stage01.js';
import { buildMapMeshes, getWalkableNodes, TILE_SIZE, H_STEP, MAP_W, MAP_D } from './map.js';

// --- 2. グローバル設定 ---
window.gameMapData = StageData.generateLayout();
window.TILE_SIZE = TILE_SIZE;
window.H_STEP = H_STEP;
window.MAP_W = MAP_W;
window.MAP_D = MAP_D;

let scene, camera, renderer, clock;
let cameraCtrl, uiCtrl, battleSys;
window.units = [];

const texLoader = new THREE.TextureLoader();
const loadTex = (url) => new Promise(res => texLoader.load(url, res, undefined, () => {
    console.error("Failed to load texture: " + url);
    res(null);
}));

// --- 3. メイン処理 ---
window.addEventListener('load', async () => {
    try {
        clock = new THREE.Clock();
        const sheetImg = new Image(); 
        sheetImg.src = 'img/plate01.png';
        
        sheetImg.onload = async () => {
            try {
                const [braTex, rexTex, compTex] = await Promise.all([
                    loadTex('img/bra.png'), 
                    loadTex('img/tactyrano01.png'), 
                    loadTex('img/comp.png')
                ]);
                init(sheetImg, braTex, rexTex, compTex);
                document.getElementById('loading-screen').style.display = 'none';
            } catch (e) {
                showError("Init Load Error: " + e.message);
            }
        };
        sheetImg.onerror = () => showError("img/plate01.png が見つかりません");
    } catch (e) {
        showError("Global Load Error: " + e.message);
    }
});

function showError(m) {
    const el = document.getElementById('error-log');
    el.style.display = 'block';
    el.innerHTML += m + "\n";
}

function init(sheetImg, braTex, rexTex, compTex) {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    const w = container.clientWidth, h = container.clientHeight;
    camera = new THREE.OrthographicCamera(-w, w, h, -h, 1, 4000); 
    camera.zoom = 1.5; camera.updateProjectionMatrix();
    
    renderer = new THREE.WebGLRenderer({ antialias: false }); 
    renderer.setSize(w, h); 
    renderer.setClearColor(0x1a1a1a);
    container.appendChild(renderer.domElement);
    
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    
    buildMapMeshes(scene, sheetImg);

    cameraCtrl = new CameraControl(camera, new THREE.OrbitControls(camera, renderer.domElement));
    uiCtrl = new UIControl(cameraCtrl);
    battleSys = new BattleSystem(uiCtrl, cameraCtrl);

    window.units = StageData.units.map(u => {
        let conf = null;
        if(u.id === 'ブラキオサウルス') conf = { tex: braTex?.clone(), cols: 1, rows: 5, type: 'bra', w: 352, h: 1250 };
        else if (u.id === 'ティラノ') conf = { tex: rexTex?.clone(), cols: 4, rows: 4, type: 'rex', w: 1200, h: 840 };
        else if (u.id.includes('コンプ')) conf = { tex: compTex?.clone(), cols: 3, rows: 2, type: 'comp', w: 1080, h: 480 };
        if(conf && conf.tex) conf.tex.needsUpdate = true;
        
        const unit = new Unit(u.id, u.emoji, u.x, u.z, u.hp, u.mp, u.str, u.def, u.spd, u.mag, u.move, u.jump, u.isPlayer, conf, u.level);
        unit.h = window.gameMapData[unit.z][unit.x].h;
        scene.add(unit.sprite);
        updateUnitPos(unit);
        if(unit.isPlayer) window.player = unit;
        return unit;
    });

    setupEventListeners();
    animate();

    playStageTitle(() => {
        const boss = window.units.find(u => u.id === 'ブラキオサウルス');
        cameraCtrl.playOpening(boss, window.player, () => {
            startEvent(StageData.preBattleTalk, playBattleStart);
        });
    });
}

function setupEventListeners() {
    renderer.domElement.addEventListener('pointerup', onPointerClick);
    document.getElementById('btn-toggle-detail').onclick = () => { const d = document.getElementById('detail-ui'); d.style.display = (d.style.display === 'block' ? 'none' : 'block'); };
    document.getElementById('cmd-move').onclick = () => execCommand('move');
    document.getElementById('cmd-attack').onclick = () => execCommand('attack');
    document.getElementById('cmd-wait').onclick = () => execCommand('wait');
    document.getElementById('cmd-cancel').onclick = cancelMove;
    document.getElementById('btn-cancel-attack').onclick = cancelAttack;
    document.querySelector('.btn-yes').onclick = () => answerConfirm(true);
    document.querySelector('.btn-no').onclick = () => answerConfirm(false);
    
    const camUI = document.getElementById('camera-ui');
    document.getElementById('ui-header').onclick = () => camUI.classList.toggle('collapsed');
    camUI.querySelectorAll('.ui-btn').forEach(btn => {
        btn.onclick = () => {
            const type = btn.dataset.cam;
            if(type === 'rotate-left') cameraCtrl.rotate(-90);
            if(type === 'rotate-right') cameraCtrl.rotate(90);
            if(type === 'pan-up') cameraCtrl.pan(0, -1);
            if(type === 'pan-down') cameraCtrl.pan(0, 1);
            if(type === 'pan-left') cameraCtrl.pan(-1, 0);
            if(type === 'pan-right') cameraCtrl.pan(1, 0);
            if(type === 'center') cameraCtrl.centerOn(window.player.sprite.position);
            if(type === 'zoom-in') cameraCtrl.setZoom(camera.zoom + 0.3);
            if(type === 'zoom-out') cameraCtrl.setZoom(camera.zoom - 0.3);
        };
    });
}

function onPointerClick(event) {
    const store = getStore();
    if (store.gameState === 'ANIMATING' || store.gameState === 'ENEMY_TURN') return;
    if (store.gameState === 'TALKING') { if(window.onGlobalTap) window.onGlobalTap(); return; }

    const mouse = new THREE.Vector2((event.clientX/window.innerWidth)*2-1, -(event.clientY/window.innerHeight)*2+1);
    const raycaster = new THREE.Raycaster(); raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects([...window.interactableTiles, ...window.units.map(u => u.sprite)]);

    if (intersects.length > 0) {
        const obj = intersects[0].object;
        const data = obj.userData.isUnit ? { x: obj.userData.unit.x, z: obj.userData.unit.z } : obj.userData;
        
        if(store.gameState === 'IDLE') {
            const u = getUnitAt(window.units, data.x, data.z);
            if(u) { uiCtrl.showStatus(u); if(u.isPlayer) document.getElementById('command-ui').style.display = 'block'; }
            else { uiCtrl.hideAll(); }
        } else if (store.gameState === 'SELECTING_MOVE') {
            const route = store.walkableTiles.find(n => n.x === data.x && n.z === data.z);
            if(route) {
                clearHighlights();
                gameStore.setState({ gameState: 'CONFIRMING', confirmMode: 'MOVE', pendingData: route.path, selectedTileKey: `${route.x},${route.z}` });
                document.getElementById('confirm-text').innerText = "ここへ移動しますか？";
                document.getElementById('confirm-ui').style.display = 'block';
            }
        }
    }
}

function startEvent(talkData, callback) {
    uiCtrl.hideAll();
    gameStore.setState({ gameState: 'TALKING', talkIndex: 0 });
    cameraCtrl.setZoom(2.5);
    document.getElementById('event-ui').style.display = 'flex';
    window.onGlobalTap = () => {
        const idx = getStore().talkIndex + 1;
        if(idx < talkData.length) {
            gameStore.setState({ talkIndex: idx });
            uiCtrl.renderTalkLine(talkData[idx], window.units, window.player);
        } else {
            document.getElementById('event-ui').style.display = 'none';
            callback();
        }
    };
    uiCtrl.renderTalkLine(talkData[0], window.units, window.player);
}

function playBattleStart() {
    cameraCtrl.setZoom(1.5);
    const overlay = document.getElementById('battle-start-overlay');
    gsap.fromTo(overlay, { opacity:0, scale:0.5 }, { opacity:1, scale:1, duration:0.5, onComplete: () => {
        gsap.to(overlay, { opacity:0, delay:1.0, onComplete: startPlayerTurn });
    }});
}

function startPlayerTurn() {
    gameStore.setState({ gameState: 'IDLE' });
    uiCtrl.hideAll(); clearHighlights();
    uiCtrl.setMsg("あなたの番です！", "#00ff00");
}

function execCommand(cmd) {
    if(cmd === 'move') {
        const tiles = getWalkableNodes(window.units, window.player, window.gameMapData);
        gameStore.setState({ gameState: 'SELECTING_MOVE', walkableTiles: tiles });
        tiles.forEach(node => { 
            const tile = window.tilesMeshMap[`${node.x},${node.z}`];
            if(tile) tile.material[2].color.setHex(0x55ff55); 
        });
        document.getElementById('command-ui').style.display = 'none';
    } else if(cmd === 'attack') {
        const targets = getAttackableEnemies(window.units, window.player);
        if(targets.length === 0) return uiCtrl.setMsg("範囲内に敵がいません");
        gameStore.setState({ gameState: 'SELECTING_ATTACK_TARGET' });
        const list = document.getElementById('target-list'); list.innerHTML = '';
        targets.forEach(t => {
            const btn = document.createElement('button'); btn.className = 'cmd-btn'; btn.innerText = t.id;
            btn.onclick = () => selectTarget(t); list.appendChild(btn);
            window.tilesMeshMap[`${t.x},${t.z}`].material[2].color.setHex(0xff5555);
        });
        document.getElementById('command-ui').style.display = 'none';
        document.getElementById('target-ui').style.display = 'block';
    } else if(cmd === 'wait') {
        gameStore.setState({ confirmMode: 'WAIT', pendingData: null });
        document.getElementById('confirm-text').innerText = "行動を終了しますか？";
        document.getElementById('confirm-ui').style.display = 'block';
        document.getElementById('command-ui').style.display = 'none';
    }
}

function selectTarget(t) {
    gameStore.setState({ confirmMode: 'ATTACK', pendingData: t });
    document.getElementById('target-ui').style.display = 'none';
    document.getElementById('confirm-text').innerText = `${t.id} を攻撃しますか？`;
    document.getElementById('confirm-ui').style.display = 'block';
}

function answerConfirm(isYes) {
    const store = getStore();
    document.getElementById('confirm-ui').style.display = 'none';
    if(!isYes) return (store.confirmMode === 'ATTACK' ? execCommand('attack') : startPlayerTurn());

    gameStore.setState({ gameState: 'ANIMATING' });
    if(store.confirmMode === 'MOVE') {
        battleSys.executeMovement(window.player, store.pendingData, () => { window.player.hasMoved = true; startPlayerTurn(); });
    } else if(store.confirmMode === 'ATTACK') {
        battleSys.executeAttack(window.player, store.pendingData, window.units, camera, endPlayerTurn);
    } else { endPlayerTurn(); }
}

function endPlayerTurn() {
    const boss = window.units.find(u => u.id === 'ブラキオサウルス');
    if(boss.hp <= 0) return checkVictory();
    window.player.hasMoved = false; window.player.hasAttacked = false;
    gameStore.setState({ gameState: 'ENEMY_TURN' });
    uiCtrl.setMsg("敵の番です...", "#ff5555");
    setTimeout(processEnemyAI, 1000);
}

async function processEnemyAI() {
    const enemies = battleSys.decideEnemyAI(window.units, window.player);
    for(const enemy of enemies) {
        const routes = getWalkableNodes(window.units, enemy, window.gameMapData);
        let best = null, minD = 999;
        routes.forEach(r => { const d = Math.abs(r.x - window.player.x) + Math.abs(r.z - window.player.z); if(d < minD){ minD=d; best=r; } });
        if(best && best.path.length > 0) {
            await new Promise(res => battleSys.executeMovement(enemy, best.path, res));
            if(getAttackableEnemies(window.units, enemy).includes(window.player)) {
                await new Promise(res => battleSys.executeAttack(enemy, window.player, window.units, camera, res));
                if(window.player.hp <= 0) return uiCtrl.setMsg("GAME OVER", "#ff0000");
            }
        }
    }
    startPlayerTurn();
}

function checkVictory() {
    gameStore.setState({ gameState: 'FINISHED' });
    startEvent(StageData.postBattleTalk, () => {
        const exitPath = [{x:12, z:16, h:0}, {x:12, z:17, h:0}];
        battleSys.executeMovement(window.player, exitPath, () => {
            gsap.to(window.player.sprite.scale, {x:0, y:0, duration:0.5});
            document.getElementById('episode-clear-overlay').style.opacity = 1;
        }, true);
    });
}

function updateUnitPos(u) {
    const offX = (MAP_W * TILE_SIZE) / 2, offZ = (MAP_D * TILE_SIZE) / 2;
    u.sprite.position.set((u.x * TILE_SIZE) - offX, u.h * H_STEP, (u.z * TILE_SIZE) - offZ);
}

function clearHighlights() {
    window.interactableTiles.forEach(t => t.material[2].color.setHex(0xffffff));
    window.units.forEach(u => { if(u.hp > 0) { const t = window.tilesMeshMap[`${u.x},${u.z}`]; if(t) t.material[2].color.setHex(u.isPlayer ? 0x88ccff : 0xff8888); } });
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta() * 1000;
    window.units.forEach(u => u.updateAnimation && u.updateAnimation(delta));
    cameraCtrl.controls.update();
    renderer.render(scene, camera);
}

function playStageTitle(cb) {
    const o = document.getElementById('stage-overlay');
    document.getElementById('chapter-num').innerText = StageData.info.chapter;
    document.getElementById('stage-title').innerHTML = StageData.info.name;
    gsap.to(o, { opacity: 1, duration: 1.5, onComplete: () => gsap.to(o, { opacity: 0, delay: 2.0, onComplete: cb }) });
}

function cancelMove() { uiCtrl.hideAll(); startPlayerTurn(); }
function cancelAttack() { document.getElementById('target-ui').style.display = 'none'; document.getElementById('command-ui').style.display = 'block'; }
