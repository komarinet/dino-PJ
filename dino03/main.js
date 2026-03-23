export const VERSION = "8.15.2";
import { gameStore, getStore, VERSION as storeV } from './store.js';
import { Unit, getUnitAt, getAttackableEnemies, VERSION as unitV } from './units.js';
import { CameraControl, VERSION as camV } from './camera.js';
import { UIControl, VERSION as uiV } from './ui.js';
import { BattleSystem, VERSION as batV } from './battle.js';
import { buildMapMeshes, getWalkableNodes, TILE_SIZE, H_STEP, MAP_W, MAP_D, VERSION as mapV } from './map.js';
import { StageData, VERSION as sceV } from './data/stage01.js';

function checkVersions() {
    const versions = { "store.js": storeV, "units.js": unitV, "camera.js": camV, "ui.js": uiV, "battle.js": batV, "data/stage01.js": sceV, "map.js": mapV };
    let errors = [];
    for (let [file, ver] of Object.entries(versions)) {
        if (!ver || !ver.startsWith("8.15")) errors.push(`${file} (現:${ver || '不明'})`);
    }
    if (errors.length > 0) {
        const log = document.getElementById('error-log');
        log.style.display = 'block';
        log.innerHTML = `【バージョン不一致】\n以下のファイルを更新してください：\n\n${errors.join('\n')}\n\nGitHub Pagesの反映待ちか、キャッシュが原因です。`;
        throw new Error("Version Mismatch");
    }
}

let scene, camera, renderer, clock, cameraCtrl, uiCtrl, battleSys;
const mapData = StageData.generateLayout();

const texLoader = new THREE.TextureLoader();
const loadTex = (url) => new Promise(res => texLoader.load(url, res, undefined, () => res(null)));

window.addEventListener('load', async () => {
    try {
        checkVersions();
        clock = new THREE.Clock();
        const sheetImg = new Image(); sheetImg.src = 'img/plate01.png';
        sheetImg.onload = async () => {
            const [braTex, rexTex, compTex] = await Promise.all([loadTex('img/bra.png'), loadTex('img/tactyrano01.png'), loadTex('img/comp.png')]);
            init(sheetImg, braTex, rexTex, compTex);
            document.getElementById('loading-screen').style.display = 'none';
        };
    } catch (e) { console.error(e); }
});

function init(sheetImg, braTex, rexTex, compTex) {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    const w = container.clientWidth, h = container.clientHeight;
    camera = new THREE.OrthographicCamera(-w, w, h, -h, 1, 4000); camera.zoom = 1.5; camera.updateProjectionMatrix();
    renderer = new THREE.WebGLRenderer({ antialias: false }); renderer.setSize(w, h); renderer.setClearColor(0x1a1a1a);
    container.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    
    buildMapMeshes(scene, sheetImg, mapData);

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
        unit.h = mapData[unit.z][unit.x].h;
        scene.add(unit.sprite);
        const offX = (MAP_W * TILE_SIZE) / 2, offZ = (MAP_D * TILE_SIZE) / 2;
        unit.sprite.position.set((unit.x * TILE_SIZE) - offX, unit.h * H_STEP, (unit.z * TILE_SIZE) - offZ);
        if(unit.isPlayer) window.player = unit;
        return unit;
    });

    setupEventListeners();
    animate();

    const o = document.getElementById('stage-overlay');
    document.getElementById('chapter-num').innerText = StageData.info.chapter;
    document.getElementById('stage-title').innerHTML = StageData.info.name;
    gsap.to(o, { opacity: 1, duration: 1.5, onComplete: () => {
        gsap.to(o, { opacity: 0, delay: 2.0, onComplete: () => {
            const boss = window.units.find(u => u.id === 'ブラキオサウルス');
            cameraCtrl.centerOn(boss.sprite.position, 3.0);
            setTimeout(() => {
                cameraCtrl.centerOn(window.player.sprite.position, 2.0);
                setTimeout(() => startDialogue(), 1500);
            }, 3500);
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
            gameStore.setState({ gameState: 'IDLE' });
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
    document.getElementById('cmd-cancel').onclick = () => { uiCtrl.hideAll(); gameStore.setState({ gameState: 'IDLE' }); };
    document.getElementById('btn-cancel-attack').onclick = () => { document.getElementById('target-ui').style.display = 'none'; document.getElementById('command-ui').style.display = 'block'; };
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

function execCommand(cmd) {
    if(cmd === 'move') {
        const tiles = getWalkableNodes(window.units, window.player, mapData);
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
    if(!isYes) {
        if(store.confirmMode === 'ATTACK') return execCommand('attack');
        uiCtrl.hideAll(); gameStore.setState({ gameState: 'IDLE' }); return;
    }
    gameStore.setState({ gameState: 'ANIMATING' });
    if(store.confirmMode === 'MOVE') {
        battleSys.executeMovement(window.player, store.pendingData, () => { window.player.hasMoved = true; gameStore.setState({ gameState: 'IDLE' }); document.getElementById('command-ui').style.display = 'block'; });
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
        const routes = getWalkableNodes(window.units, enemy, mapData);
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
    gameStore.setState({ gameState: 'IDLE' }); uiCtrl.hideAll(); clearHighlights(); uiCtrl.setMsg("あなたの番です！", "#00ff00");
}

function checkVictory() {
    gameStore.setState({ gameState: 'FINISHED' });
    startDialogue(); // 戦後会話はStageDataを拡張する際にここを調整
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta() * 1000;
    window.units.forEach(u => u.updateAnimation && u.updateAnimation(delta));
    cameraCtrl.controls.update();
    renderer.render(scene, camera);
}

function clearHighlights() {
    window.interactableTiles.forEach(t => t.material[2].color.setHex(0xffffff));
    window.units.forEach(u => { if(u.hp > 0) { const t = window.tilesMeshMap[`${u.x},${u.z}`]; if(t) t.material[2].color.setHex(u.isPlayer ? 0x88ccff : 0xff8888); } });
}
