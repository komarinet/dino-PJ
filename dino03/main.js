/* =================================================================
   main.js - v8.20.10
   修正・機能追加内容：
   1. シネマティックカメラ：会話中、発言者(name)の座標を取得し、
      cameraCtrl.centerOn() でカメラが自動追従するロジックを追加。
   2. 会話終了時：カメラのズームを戻すとともに、操作キャラ(プレイヤー)に
      視点を自動で戻す処理を追加。
   3. バグ修正維持：OrbitControlsの生成、UI位置、ハイライト最前面表示などは全て維持。
   ================================================================= */

export const VERSION = "8.20.10";

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
    list.innerHTML = "";
    for (let [file, curVer] of Object.entries(currentVersions)) {
        const isLatest = curVer && curVer.startsWith("8.20");
        const isValid = curVer && curVer.startsWith("8.");
        list.innerHTML += `<div style="color:${isLatest ? '#0f0' : (isValid ? '#ffcc00' : '#f00')}">
            ${file.padEnd(16)}: ver ${curVer || '---'} [${isLatest ? 'OK' : (isValid ? 'OLD' : 'ERR')}]
        </div>`;
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
    document.getElementById('btn-clear-data').onclick = () => { 
        if(confirm("以前のデータを完全に消去してリロードしますか？")) {
            localStorage.clear(); location.reload(); 
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
                loadTex('img/bra.png'), loadTex('img/tactyrano01.png'), loadTex('img/comp.png'),
                loadTex('img/tree01.png'), loadTex('img/rock01.png')
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

    const statusUI = document.getElementById('status-ui');
    if(statusUI) {
        statusUI.style.top = 'auto'; statusUI.style.bottom = '20px'; statusUI.style.left = '20px';
    }

    let createdUnits = [];
    window.units = StageData.units.map(u => {
        let conf = null;
        if(u.id === 'ブラキオサウルス') conf = { tex: braTex?.clone(), cols: 1, rows: 5, type: 'bra', w: 352, h: 1250 };
        else if (u.id === 'ティラノ') conf = { tex: rexTex?.clone(), cols: 4, rows: 4, type: 'rex', w: 1200, h: 840 };
        else conf = { tex: compTex?.clone(), cols: 3, rows: 2, type: 'comp', w: 1080, h: 480 };
        if(conf && conf.tex) conf.tex.needsUpdate = true;
        
        const unit = new Unit(u.id, u.emoji, u.x, u.z, u.hp, u.mp, u.str, u.def, u.spd, u.mag, u.move, u.jump, u.isPlayer, conf, u.level);
        unit.h = mapData[unit.z][unit.x].h; 
        
        if (!unit.isPlayer) {
            unit.facing = -1;
            if (unit.sprite) unit.sprite.scale.x = unit.baseScaleX * unit.facing;
        }

        scene.add(unit.sprite);
        if (unit.shadow) scene.add(unit.shadow);

        const offX = (MAP_W * TILE_SIZE) / 2, offZ = (MAP_D * TILE_SIZE) / 2;
        unit.sprite.position.set((unit.x * TILE_SIZE) - offX, unit.h * H_STEP, (unit.z * TILE_SIZE) - offZ);
        createdUnits.push(unit);
        if(unit.isPlayer) window.player = unit; 
        return unit;
    });

    setupEventListeners();
    animate();

    cameraCtrl.setInitialAngle(window.player.sprite.position);
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
    
    // ★ 修正箇所：指定したインデックスのセリフを再生し、カメラを発言者に向ける関数
    const playLine = (idx) => {
        const lineData = StageData.preBattleTalk[idx];
        uiCtrl.renderTalkLine(lineData, window.units, window.player);
        
        // 発言者を探してカメラをセンタリング
        const speaker = window.units.find(u => u.id === lineData.name);
        if (speaker && speaker.sprite) {
            cameraCtrl.centerOn(speaker.sprite.position);
        }
    };

    window.onGlobalTap = () => {
        const idx = getStore().talkIndex + 1;
        if(idx < StageData.preBattleTalk.length) {
            gameStore.setState({ talkIndex: idx });
            playLine(idx);
        } else {
            document.getElementById('event-ui').style.display = 'none';
            cameraCtrl.setZoom(1.5);
            
            // ★ 修正箇所：会話終了後、カメラをプレイヤー(ティラノ)の座標に戻す
            cameraCtrl.centerOn(window.player.sprite.position);
            
            gameStore.setState({ gameState: 'IDLE', phase: 'PLAYER_PHASE' });
            const overlay = document.getElementById('battle-start-overlay');
            gsap.fromTo(overlay, { opacity:0, scale:0.5 }, { opacity:1, scale:1, duration:0.5, onComplete: () => {
                gsap.to(overlay, { opacity:0, delay:1.0, onComplete: () => { uiCtrl.setMsg("あなたの番です！", "#00ff00"); } });
            }});
        }
    };
    
    // 最初のセリフを再生（カメラも最初の発言者へ向く）
    playLine(0);
}

function setupEventListeners() {
    renderer.domElement.addEventListener('pointerup', onPointerClick);
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
        mesh.position.set((node.x * TILE_SIZE) - offX, (node.h * H_STEP) + 10, (node.z * TILE_SIZE) - offZ);
        mesh.renderOrder = 999;
        scene.add(mesh);
        highlightMeshes.push(mesh);
    });
}

function clearHighlights() {
    highlightMeshes.forEach(mesh => scene.remove(mesh));
    highlightMeshes = [];
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
        
        if(store.gameState === 'IDLE' && store.phase === 'PLAYER_PHASE') {
            const u = getUnitAt(window.units, data.x, data.z);
            if(u) { 
                uiCtrl.showStatus(u); 
                if(u.isPlayer && !u.hasActed) {
                    uiCtrl.updateCommandMenu(u); 
                    document.getElementById('command-ui').style.display = 'block'; 
                }
            } else { uiCtrl.hideAll(); }
        } 
        else if (store.gameState === 'SELECTING_MOVE') {
            const route = store.walkableTiles.find(n => n.x === data.x && n.z === data.z);
            if(route) {
                clearHighlights(); 
                showHighlight([route], targetHighlightMat); 
                gameStore.setState({ gameState: 'CONFIRMING', confirmMode: 'MOVE', pendingData: route.path });
                document.getElementById('confirm-text').innerText = "ここへ移動しますか？";
                document.getElementById('confirm-ui').style.display = 'block';
            }
        }
    }
}

function execCommand(cmd) {
    if(cmd === 'move') {
        const tiles = getWalkableNodes(window.units, window.player, mapData);
        if(tiles.length > 0) {
            gameStore.setState({ gameState: 'SELECTING_MOVE', walkableTiles: tiles });
            showHighlight(tiles, moveHighlightMat); 
            document.getElementById('command-ui').style.display = 'none';
            uiCtrl.setMsg("移動先を選んでください");
        }
    } else if(cmd === 'attack') {
        const targets = getAttackableEnemies(window.units, window.player);
        if(targets.length === 0) return uiCtrl.setMsg("範囲内に敵がいません");
        gameStore.setState({ gameState: 'SELECTING_ATTACK_TARGET' });
        const list = document.getElementById('target-list'); list.innerHTML = '';
        targets.forEach(t => {
            const btn = document.createElement('button'); btn.className = 'cmd-btn'; btn.innerText = t.id;
            btn.onclick = () => selectTarget(t); list.appendChild(btn);
        });
        showHighlight(targets, attackHighlightMat); 
        document.getElementById('command-ui').style.display = 'none'; document.getElementById('target-ui').style.display = 'block';
    } else if(cmd === 'wait') {
        completePlayerAction(window.player);
    }
}

function selectTarget(t) {
    gameStore.setState({ gameState: 'CONFIRMING', confirmMode: 'ATTACK', pendingData: t });
    document.getElementById('target-ui').style.display = 'none';
    clearHighlights();
    showHighlight([{x: t.x, z: t.z, h: t.h}], targetHighlightMat);
    document.getElementById('confirm-text').innerText = `${t.id} を攻撃しますか？`; document.getElementById('confirm-ui').style.display = 'block';
}

function answerConfirm(isYes) {
    const store = getStore(); document.getElementById('confirm-ui').style.display = 'none';
    if(!isYes) {
        clearHighlights();
        if(store.confirmMode === 'MOVE') return execCommand('move'); 
        if(store.confirmMode === 'ATTACK') return execCommand('attack'); 
        uiCtrl.hideAll(); gameStore.setState({ gameState: 'IDLE' }); return;
    }
    
    clearHighlights(); 
    gameStore.setState({ gameState: 'ANIMATING' });
    
    if(store.confirmMode === 'MOVE') {
        battleSys.executeMovement(window.player, store.pendingData, () => { 
            window.player.hasMoved = true; 
            gameStore.setState({ gameState: 'IDLE' }); 
            uiCtrl.updateCommandMenu(window.player);
            document.getElementById('command-ui').style.display = 'block'; 
        });
    } else if(store.confirmMode === 'ATTACK') {
        battleSys.executeAttack(window.player, store.pendingData, window.units, camera, () => completePlayerAction(window.player), scene);
    } else { 
        completePlayerAction(window.player); 
    }
}

function completePlayerAction(unit) {
    unit.hasMoved = true; unit.hasAttacked = true; unit.hasActed = true; 
    const activePlayers = window.units.filter(u => u.isPlayer && u.hp > 0 && !u.hasActed);
    const boss = window.units.find(u => u.id === 'ブラキオサウルス');
    if(boss && boss.hp <= 0) return checkVictory();

    if (activePlayers.length > 0) {
        gameStore.setState({ gameState: 'IDLE' }); uiCtrl.hideAll();
    } else {
        gameStore.setState({ gameState: 'ENEMY_TURN', phase: 'ENEMY_PHASE' });
        uiCtrl.hideAll(); uiCtrl.setMsg("敵の番です...", "#ff5555");
        setTimeout(processEnemyAI, 1000);
    }
}

async function processEnemyAI() {
    window.units.filter(u => !u.isPlayer).forEach(u => u.hasActed = false);
    const enemies = window.units.filter(u => !u.isPlayer && u.hp > 0);
    
    for(let i = 0; i < enemies.length; i += 2) {
        const chunk = enemies.slice(i, i + 2);
        await Promise.all(chunk.map(async (enemy) => {
            if(enemy.hp <= 0) return;
            enemy.lookAtNode(window.player.x, window.player.z);
            const routes = getWalkableNodes(window.units, enemy, mapData);
            let best = routes.sort((a,b) => (Math.abs(a.x-window.player.x)+Math.abs(a.z-window.player.z)) - (Math.abs(b.x-window.player.x)+Math.abs(b.z-window.player.z)))[0];
            
            if(best && best.path.length > 0) {
                await new Promise(res => battleSys.executeMovement(enemy, best.path, res));
                const targets = getAttackableEnemies(window.units, enemy);
                if(targets.includes(window.player)) {
                    await new Promise(res => battleSys.executeAttack(enemy, window.player, window.units, camera, res, scene));
                    if(window.player.hp <= 0) { uiCtrl.setMsg("GAME OVER", "#ff0000"); return; }
                }
            }
            enemy.hasActed = true;
        }));
        await new Promise(res => setTimeout(res, 600)); 
    }
    
    if (window.player.hp > 0) {
        window.units.filter(u => u.isPlayer).forEach(u => { u.hasMoved = false; u.hasAttacked = false; u.hasActed = false; });
        gameStore.setState({ gameState: 'IDLE', phase: 'PLAYER_PHASE' }); 
        uiCtrl.hideAll(); uiCtrl.setMsg("あなたの番です！", "#00ff00");
    }
}

function checkVictory() {
    gameStore.setState({ gameState: 'FINISHED' });
    startDialogue();
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta() * 1000;
    window.units.forEach(u => {
        if (u.updateAnimation) u.updateAnimation(delta);
        if (u.shadow && u.sprite) {
            u.shadow.position.x = u.sprite.position.x;
            u.shadow.position.z = u.sprite.position.z;
            u.shadow.position.y = u.h * H_STEP + 1; 
        }
    });
    cameraCtrl.controls.update();
    renderer.render(scene, camera);
}
