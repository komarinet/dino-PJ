/* =================================================================
   main.js - v8.20.76
   【絶対ルール順守】一切の省略なし。
   修正・統合内容：
   1. 浅瀬演出：Stage 01 限定で、水（type:4）に入るとユニットが H_STEP 分沈む。
   2. 影の制御：Stage 01 の水中にいる間のみ、足元の影（shadow）を非表示化。
   3. 既存素材維持：ギガノト (4x4)、母ティラノ (3x5) の素材構成を完全保持。
   4. 演出維持：序章の雨、敗北イベント（ギガノト襲撃）、ターゲットプレビューを完備。
   5. ボス実体化：checkVictory 内での消滅アニメ停止と再実体化を継承。
   ================================================================= */

export const VERSION = "8.20.76";

import { gameStore, getStore, VERSION as storeV } from './store.js';
import { Unit, getUnitAt, getAttackableEnemies, VERSION as unitV } from './units.js';
import { CameraControl, VERSION as camV } from './camera.js';
import { UIControl, VERSION as uiV } from './ui.js';
import { BattleSystem, VERSION as batV } from './battle.js';
import { buildMapMeshes, getWalkableNodes, TILE_SIZE, H_STEP, MAP_W, MAP_D, VERSION as mapV } from './map.js';
import { StageData as Stage00, VERSION as sce00V } from './data/stage00.js';
import { StageData as Stage01, VERSION as sce01V } from './data/stage01.js';

let scene, camera, renderer, clock, cameraCtrl, uiCtrl, battleSys;
let currentStage = 0; // 0: 序章, 1: 第1話
let stageData = Stage00;
let mapData = stageData.generateLayout();

// 雨システム用
let rainSystem = null;

let isEndingProcessed = false;
let highlightMeshes = [];
const moveHighlightMat = new THREE.MeshBasicMaterial({ color: 0x55ff55, transparent: true, opacity: 0.6, depthTest: false });
const attackHighlightMat = new THREE.MeshBasicMaterial({ color: 0xff5555, transparent: true, opacity: 0.6, depthTest: false });
const targetHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8, depthTest: false });
const highlightGeo = new THREE.PlaneGeometry(TILE_SIZE * 0.9, TILE_SIZE * 0.9);

function checkSystems() {
    const list = document.getElementById('ver-list');
    const currentVersions = {
        "main.js": VERSION, "store.js": storeV, "units.js": unitV, 
        "camera.js": camV, "ui.js": uiV, "battle.js": batV, 
        "stage00.js": sce00V, "stage01.js": sce01V
    };
    if(list) {
        list.innerHTML = "";
        for (let [file, curVer] of Object.entries(currentVersions)) {
            const isLatest = curVer && curVer.startsWith("8.20");
            list.innerHTML += `<div style="color:${isLatest ? '#0f0' : '#f00'}">
                ${file.padEnd(16)}: ver ${curVer || '---'}
            </div>`;
        }
    }
}

window.addEventListener('load', () => {
    checkSystems();
    const btnClear = document.getElementById('btn-clear-data');
    if(btnClear) {
        btnClear.onclick = () => { 
            if(confirm("以前のデータを完全に消去してリロードしますか？")) {
                localStorage.clear(); location.reload(); 
            }
        };
    }
    const btnStart = document.getElementById('btn-start-game');
    if(btnStart) {
        btnStart.style.display = 'block';
        btnStart.onclick = () => {
            document.getElementById('boot-screen').style.display = 'none';
            document.getElementById('loading-screen').style.display = 'flex';
            runGame();
        };
    }
});

async function runGame() {
    try {
        clock = new THREE.Clock();
        const texLoader = new THREE.TextureLoader();
        const loadTex = (url) => new Promise(res => texLoader.load(url, res, undefined, () => res(null)));
        const sheetImg = new Image(); sheetImg.src = 'img/plate01.png';
        sheetImg.onload = async () => {
            const [braTex, rexTex, momTex, gigaTex, compTex, treeTex, rockTex] = await Promise.all([
                loadTex('img/bra.png'), 
                loadTex('img/tactyrano01.png'), 
                loadTex('img/momtyrano.png'), 
                loadTex('img/giga.png'), 
                loadTex('img/comp.png'),
                loadTex('img/tree01.png'), 
                loadTex('img/rock01.png')
            ]);
            window.gameTextures = { sheetImg, braTex, rexTex, momTex, gigaTex, compTex, treeTex, rockTex };
            init(0); 
            document.getElementById('loading-screen').style.display = 'none';
        };
    } catch (e) { console.error(e); }
}

/**
 * 雨システムの生成（プランA）
 */
function createRain(targetScene) {
    const particleCount = 3000;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
        pos[i] = (Math.random() - 0.5) * 1500; pos[i+1] = Math.random() * 1000; pos[i+2] = (Math.random() - 0.5) * 1500;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 1.5, transparent: true, opacity: 0.5, depthWrite: false });
    rainSystem = new THREE.Points(geo, mat);
    targetScene.add(rainSystem);
}

function init(stageIndex) {
    currentStage = stageIndex;
    stageData = (currentStage === 0) ? Stage00 : Stage01;
    mapData = stageData.generateLayout();
    isEndingProcessed = false;

    const container = document.getElementById('canvas-container');
    container.innerHTML = ""; 
    scene = new THREE.Scene();
    const w = container.clientWidth, h = container.clientHeight;
    camera = new THREE.OrthographicCamera(-w, w, h, -h, 1, 4000); camera.zoom = 1.5; camera.updateProjectionMatrix();
    renderer = new THREE.WebGLRenderer({ antialias: false }); renderer.setSize(w, h); renderer.setClearColor(0x1a1a1a);
    container.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    
    const tex = window.gameTextures;
    buildMapMeshes(scene, tex.sheetImg, tex.treeTex, tex.rockTex, mapData, stageData.obstacles);

    cameraCtrl = new CameraControl(camera, new THREE.OrbitControls(camera, renderer.domElement));
    uiCtrl = new UIControl(cameraCtrl);
    battleSys = new BattleSystem(uiCtrl, cameraCtrl);
    uiCtrl.hideAll();

    if (rainSystem) {
        if (rainSystem.geometry) rainSystem.geometry.dispose();
        if (rainSystem.material) rainSystem.material.dispose();
        rainSystem = null;
    }
    if (currentStage === 0) { createRain(scene); renderer.setClearColor(0x0a0a0f); } 
    else { renderer.setClearColor(0x1a1a1a); }

    const offX = (MAP_W * TILE_SIZE) / 2, offZ = (MAP_D * TILE_SIZE) / 2;
    window.units = stageData.units.map(u => {
        let conf = null;
        if(u.id === 'ブラキオサウルス') conf = { tex: tex.braTex?.clone(), cols: 1, rows: 5, type: 'bra', w: 352, h: 1250 };
        else if (u.id === '母ティラノ') conf = { tex: tex.momTex?.clone(), cols: 3, rows: 5, type: 'mom', w: 2709, h: 2890 };
        else if (u.id === 'ギガノトサウルス') conf = { tex: tex.gigaTex?.clone(), cols: 4, rows: 4, type: 'giga', w: 3000, h: 1662 };
        else if (u.id === 'ティラノ' || u.id === 'チビティラノ') conf = { tex: tex.rexTex?.clone(), cols: 4, rows: 4, type: 'rex', w: 1200, h: 840 };
        else conf = { tex: tex.compTex?.clone(), cols: 3, rows: 2, type: 'comp', w: 1080, h: 480 };
        
        if (conf && conf.tex) conf.tex.needsUpdate = true;
        const unit = new Unit(u.id, u.emoji, u.x, u.z, u.hp, u.mp, u.str, u.def, u.spd, u.mag, u.move, u.jump, u.isPlayer, conf, u.level);
        unit.h = mapData[unit.z][unit.x].h; 
        
        if (unit.sprite) {
            scene.add(unit.sprite);
            // ステージ1かつ水(type:4)なら初期配置を H_STEP 分沈める
            const isWater = mapData[unit.z][unit.x].type === 4;
            const yOffset = (currentStage === 1 && isWater) ? -H_STEP : 0;
            unit.sprite.position.set((unit.x * TILE_SIZE) - offX, (unit.h * H_STEP) + yOffset, (unit.z * TILE_SIZE) - offZ);
            if (unit.shadow && currentStage === 1 && isWater) unit.shadow.visible = false;
        }
        if (unit.shadow) scene.add(unit.shadow);
        if(unit.isPlayer && u.id !== '母ティラノ') window.player = unit; 
        return unit;
    });

    setupEventListeners();
    animate();

    if (window.player && window.player.sprite) {
        const playerCenter = new THREE.Vector3();
        new THREE.Box3().setFromObject(window.player.sprite).getCenter(playerCenter);
        cameraCtrl.setInitialAngle(playerCenter);
    }

    const o = document.getElementById('stage-overlay');
    if (o) {
        document.getElementById('chapter-num').innerHTML = stageData.info.chapter;
        document.getElementById('stage-title').innerHTML = stageData.info.name;
        gsap.to(o, { opacity: 1, duration: 1.5, onComplete: () => {
            gsap.to(o, { opacity: 0, delay: 2.0, onComplete: () => {
                const target = window.units.find(u => !u.isPlayer) || window.player;
                cameraCtrl.playOpening(target, window.player, () => { startDialogue(); });
            }});
        }});
    }
}

function startDialogue() {
    const store = getStore();
    const isPostBattle = store.gameState === 'FINISHED';
    const talkData = isPostBattle ? stageData.postBattleTalk : stageData.preBattleTalk;
    gameStore.setState({ gameState: 'TALKING', talkIndex: 0 });
    uiCtrl.hideAll(); cameraCtrl.setZoom(2.5);
    const evUi = document.getElementById('event-ui'); if (evUi) evUi.style.display = 'flex';
    const playLine = (idx) => { const lineData = talkData[idx]; uiCtrl.renderTalkLine(lineData, window.units, window.player); };

    window.onGlobalTap = async () => {
        const idx = getStore().talkIndex + 1;
        if (currentStage === 0 && isPostBattle && idx === 4) { 
             if (evUi) evUi.style.display = 'none'; gameStore.setState({ gameState: 'ANIMATING' });
             const giga = window.units.find(u => u.id === 'ギガノトサウルス');
             const mother = window.units.find(u => u.id === '母ティラノ');
             const exitPath = [{x: 4, z: 1, h: 4}, {x: 4, z: 0, h: 4}];
             battleSys.executeMovement(mother, exitPath, null, 3.0);
             await new Promise(res => battleSys.executeMovement(giga, exitPath, res, 2.0));
             const chasePath = [{x: 4, z: 1, h: 4}];
             await new Promise(res => battleSys.executeMovement(window.player, chasePath, res, 1.0));
             giga.lookAtNode(window.player.x, window.player.z); giga.setAction('ATTACK');
             uiCtrl.showFloatingText(window.player, "9999", "damage", camera, 30);
             window.player.setAction('DOWN');
             if (evUi) evUi.style.display = 'flex'; gameStore.setState({ talkIndex: idx }); playLine(idx);
             gameStore.setState({ gameState: 'TALKING' }); return;
        }
        if(currentStage === 1 && isPostBattle && idx === 7) {
            if (evUi) evUi.style.display = 'none'; gameStore.setState({ gameState: 'ANIMATING' });
            const exitPath = []; for(let i=1; i<=4; i++) exitPath.push({ x: window.player.x, z: window.player.z - i, h: window.player.h });
            await new Promise(res => battleSys.executeMovement(window.player, exitPath, res, 2.0));
            window.player.dispose(scene);
            const boss = window.units.find(u => u.id === 'ブラキオサウルス');
            if(boss && boss.sprite) {
                const center = new THREE.Vector3(); new THREE.Box3().setFromObject(boss.sprite).getCenter(center); cameraCtrl.centerOn(center);
            }
            if (evUi) evUi.style.display = 'flex'; gameStore.setState({ talkIndex: idx }); playLine(idx);
            gameStore.setState({ gameState: 'TALKING' }); return;
        }
        if(idx < talkData.length) { gameStore.setState({ talkIndex: idx }); playLine(idx); } 
        else {
            if (evUi) evUi.style.display = 'none'; cameraCtrl.setZoom(1.5);
            if (isPostBattle) {
                if (isEndingProcessed) return; isEndingProcessed = true;
                const clearOverlay = document.getElementById('episode-clear-overlay');
                if(clearOverlay) {
                    const clearText = clearOverlay.querySelector('.clear-text');
                    if (currentStage === 0) {
                        clearText.innerHTML = "……数年の月日が流れた。";
                        gsap.to(clearOverlay, { opacity: 1, duration: 2.0, onStart:()=> clearOverlay.style.display='flex', onComplete: () => {
                            setTimeout(() => { gsap.to(clearOverlay, { opacity: 0, duration: 1.0, onComplete: () => init(1) }); }, 3000);
                        }});
                    } else {
                        clearText.innerHTML = "第1話 クリア！<br><span style='font-size:0.5em; color:#fff;'>続きは現在制作中です！<br>お楽しみに！</span>";
                        clearOverlay.style.display = 'flex'; gsap.fromTo(clearOverlay, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 1.2, ease: "back.out(1.7)" });
                    }
                }
            } else {
                gameStore.setState({ gameState: 'IDLE', phase: 'PLAYER_PHASE' });
                if (window.player && window.player.sprite) {
                    const playerCenter = new THREE.Vector3(); new THREE.Box3().setFromObject(window.player.sprite).getCenter(playerCenter); cameraCtrl.centerOn(playerCenter);
                }
                const overlay = document.getElementById('battle-start-overlay');
                if (overlay) {
                    gsap.fromTo(overlay, { opacity:0, scale:0.5 }, { opacity:1, scale:1, duration:0.5, onComplete: () => {
                        gsap.to(overlay, { opacity:0, delay:1.0, onComplete: () => { uiCtrl.setMsg("あなたの番です！", "#00ff00"); } });
                    }});
                }
            }
        }
    };
    playLine(0);
}

function setupEventListeners() {
    renderer.domElement.addEventListener('pointerup', onPointerClick);
    document.getElementById('cmd-move').onclick = () => execCommand('move');
    document.getElementById('cmd-attack').onclick = () => execCommand('attack');
    document.getElementById('cmd-wait').onclick = () => execCommand('wait');
    document.getElementById('cmd-cancel').onclick = () => { uiCtrl.hideAll(); clearHighlights(); gameStore.setState({ gameState: 'IDLE' }); };
    document.getElementById('btn-cancel-attack').onclick = () => { uiCtrl.hideAll(); clearHighlights(); document.getElementById('command-ui').style.display = 'block'; };
    const btnNext = document.getElementById('btn-next-unit'); if (btnNext) btnNext.onclick = selectNextUnit;
    const btnYes = document.querySelector('.btn-yes'); const btnNo = document.querySelector('.btn-no');
    if(btnYes) btnYes.onclick = () => answerConfirm(true); if(btnNo) btnNo.onclick = () => answerConfirm(false);
    const camUI = document.getElementById('camera-ui'); const header = document.getElementById('ui-header');
    if(header) header.onclick = () => camUI.classList.toggle('collapsed');
    camUI.querySelectorAll('.ui-btn').forEach(btn => {
        btn.onclick = () => {
            const t = btn.dataset.cam;
            if(t === 'rotate-left') cameraCtrl.rotate(-90); if(t === 'rotate-right') cameraCtrl.rotate(90);
            if(t === 'pan-up') cameraCtrl.pan(0, -1); if(t === 'pan-down') cameraCtrl.pan(0, 1);
            if(t === 'pan-left') cameraCtrl.pan(-1, 0); if(t === 'pan-right') cameraCtrl.pan(1, 0);
            if(t === 'center' && window.player && window.player.sprite) {
                const playerCenter = new THREE.Vector3(); new THREE.Box3().setFromObject(window.player.sprite).getCenter(playerCenter); cameraCtrl.centerOn(playerCenter);
            }
            if(t === 'zoom-in') cameraCtrl.setZoom(camera.zoom + 0.3); if(t === 'zoom-out') cameraCtrl.setZoom(camera.zoom - 0.3);
        };
    });
}

function selectNextUnit() {
    const selectable = window.units.filter(u => u.isPlayer && u.hp > 0 && !u.hasActed); if (selectable.length === 0) return;
    let nextUnit = selectable[0];
    const currentName = document.getElementById('st-name')?.innerText;
    const currentIndex = selectable.findIndex(u => u.id === currentName);
    if (currentIndex !== -1 && selectable.length > 1) nextUnit = selectable[(currentIndex + 1) % selectable.length];
    const center = new THREE.Vector3(); new THREE.Box3().setFromObject(nextUnit.sprite).getCenter(center);
    cameraCtrl.centerOn(center); uiCtrl.showStatus(nextUnit); uiCtrl.updateCommandMenu(nextUnit);
    document.getElementById('command-ui').style.display = 'block';
}

function onPointerClick(event) {
    const store = getStore();
    if (store.gameState === 'ANIMATING' || store.gameState === 'ENEMY_TURN') return;
    if (store.gameState === 'TALKING') { if(window.onGlobalTap) window.onGlobalTap(); return; }
    const mouse = new THREE.Vector2((event.clientX/window.innerWidth)*2-1, -(event.clientY/window.innerHeight)*2+1);
    const raycaster = new THREE.Raycaster(); raycaster.setFromCamera(mouse, camera);
    const activeUnits = window.units.filter(u => u.hp > 0);
    const activeSprites = activeUnits.filter(u => u.sprite).map(u => u.sprite);
    const unitIntersects = raycaster.intersectObjects(activeSprites);
    if (unitIntersects.length > 0) {
        const u = unitIntersects[0].object.userData.unit;
        if(store.gameState === 'IDLE' && store.phase === 'PLAYER_PHASE') {
             uiCtrl.showStatus(u); if(u.isPlayer && !u.hasActed) { uiCtrl.updateCommandMenu(u); document.getElementById('command-ui').style.display = 'block'; }
        }
        return;
    }
    const tileIntersects = raycaster.intersectObjects(window.interactableTiles);
    if (tileIntersects.length > 0) {
        const obj = tileIntersects[0].object; const data = obj.userData;
        if(store.gameState === 'IDLE' && store.phase === 'PLAYER_PHASE') { uiCtrl.hideAll(); } 
        else if (store.gameState === 'SELECTING_MOVE') {
            const route = store.walkableTiles.find(n => n.x === data.x && n.z === data.z);
            if(route) {
                clearHighlights(); showHighlight([route], targetHighlightMat); 
                gameStore.setState({ gameState: 'CONFIRMING', confirmMode: 'MOVE', pendingData: route.path });
                document.getElementById('confirm-text').innerText = "ここへ移動しますか？"; document.getElementById('confirm-ui').style.display = 'block';
            }
        }
    }
}

function execCommand(cmd) {
    const currentName = document.getElementById('st-name')?.innerText;
    const unit = window.units.find(u => u.id === currentName) || window.player;
    if(cmd === 'move') {
        const tiles = getWalkableNodes(window.units, unit, mapData);
        if(tiles.length > 0) {
            gameStore.setState({ gameState: 'SELECTING_MOVE', walkableTiles: tiles });
            showHighlight(tiles, moveHighlightMat); document.getElementById('command-ui').style.display = 'none'; uiCtrl.setMsg("移動先を選んでください");
        }
    } else if(cmd === 'attack') {
        const targets = getAttackableEnemies(window.units, unit);
        if(targets.length === 0) return uiCtrl.setMsg("範囲内に敵がいません");
        gameStore.setState({ gameState: 'SELECTING_ATTACK_TARGET' });
        const list = document.getElementById('target-list'); list.innerHTML = '';
        targets.forEach(t => {
            const btn = document.createElement('button'); btn.className = 'cmd-btn'; btn.innerText = t.id;
            btn.onmouseenter = () => uiCtrl.showTargetPreview(t);
            btn.onclick = () => selectTarget(t, unit); list.appendChild(btn);
        });
        showHighlight(targets, attackHighlightMat); document.getElementById('command-ui').style.display = 'none'; document.getElementById('target-ui').style.display = 'block';
    } else if(cmd === 'wait') { completePlayerAction(unit); }
}

function selectTarget(t, attacker) {
    gameStore.setState({ gameState: 'CONFIRMING', confirmMode: 'ATTACK', pendingData: { target: t, attacker: attacker } });
    document.getElementById('target-ui').style.display = 'none';
    if(uiCtrl.dom.targetPreviewUi) uiCtrl.dom.targetPreviewUi.style.display = 'none';
    clearHighlights(); showHighlight([{x: t.x, z: t.z, h: t.h}], targetHighlightMat);
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
    clearHighlights(); gameStore.setState({ gameState: 'ANIMATING' });
    if(store.confirmMode === 'MOVE') {
        const unit = window.units.find(u => u.id === document.getElementById('st-name')?.innerText) || window.player;
        battleSys.executeMovement(unit, store.pendingData, () => { 
            unit.hasMoved = true; gameStore.setState({ gameState: 'IDLE' }); uiCtrl.updateCommandMenu(unit); document.getElementById('command-ui').style.display = 'block'; 
        });
    } else if(store.confirmMode === 'ATTACK') {
        const { attacker, target } = store.pendingData;
        battleSys.executeAttack(attacker, target, window.units, camera, () => {
            if (currentStage === 0) { const mother = window.units.find(u => u.id === '母ティラノ'); if (mother && mother.hp <= 0) return checkVictory(); }
            const boss = window.units.find(u => u.id === 'ブラキオサウルス' || u.id === 'ギガノトサウルス');
            if (boss && boss.hp <= 0) checkVictory(); else completePlayerAction(attacker);
        }, scene);
    }
}

function completePlayerAction(unit) {
    unit.hasMoved = true; unit.hasAttacked = true; unit.hasActed = true; 
    const activePlayers = window.units.filter(u => u.isPlayer && u.hp > 0 && !u.hasActed);
    if (activePlayers.length > 0) { gameStore.setState({ gameState: 'IDLE' }); uiCtrl.hideAll(); } 
    else { gameStore.setState({ gameState: 'ENEMY_TURN', phase: 'ENEMY_PHASE' }); uiCtrl.hideAll(); uiCtrl.setMsg("敵の番です...", "#ff5555"); setTimeout(processEnemyAI, 1000); }
}

async function processEnemyAI() {
    window.units.filter(u => !u.isPlayer).forEach(u => u.hasActed = false);
    const enemies = window.units.filter(u => !u.isPlayer && u.hp > 0);
    for (const enemy of enemies) {
        if (enemy.hp <= 0) continue;
        const enemyCenter = new THREE.Vector3(); if (enemy.sprite) { new THREE.Box3().setFromObject(enemy.sprite).getCenter(enemyCenter); cameraCtrl.centerOn(enemyCenter); }
        const routes = getWalkableNodes(window.units, enemy, mapData);
        if (routes.length > 0) { showHighlight(routes, moveHighlightMat); await new Promise(res => setTimeout(res, 600)); }
        let best = routes.sort((a,b) => (Math.abs(a.x-window.player.x)+Math.abs(a.z-window.player.z)) - (Math.abs(b.x-window.player.x)+Math.abs(b.z-window.player.z)))[0];
        if (best && best.path.length > 0) {
            clearHighlights(); showHighlight([best], targetHighlightMat); await new Promise(res => setTimeout(res, 400)); clearHighlights();
            enemy.lookAtNode(window.player.x, window.player.z); await new Promise(res => battleSys.executeMovement(enemy, best.path, res));
        } else { clearHighlights(); }
        const targets = getAttackableEnemies(window.units, enemy); const target = targets.find(u => u.isPlayer) || targets[0];
        if (target) {
            await new Promise(res => battleSys.executeAttack(enemy, target, window.units, camera, res, scene));
            if (currentStage === 0) { const mother = window.units.find(u => u.id === '母ティラノ'); if (mother && mother.hp <= 0) return checkVictory(); }
            if (window.player.hp <= 0 && currentStage !== 0) { uiCtrl.setMsg("GAME OVER", "#ff0000"); return; }
        }
        enemy.hasActed = true; await new Promise(res => setTimeout(res, 400)); 
    }
    if (window.player.hp > 0 || currentStage === 0) {
        window.units.filter(u => u.isPlayer).forEach(u => { u.hasMoved = false; u.hasAttacked = false; u.hasActed = false; });
        gameStore.setState({ gameState: 'IDLE', phase: 'PLAYER_PHASE' }); uiCtrl.hideAll(); uiCtrl.setMsg("あなたの番です！", "#00ff00");
    }
}

function checkVictory() {
    const boss = window.units.find(u => u.id === 'ブラキオサウルス' || u.id === 'ギガノトサウルス' || u.id === '母ティラノ');
    if (boss && boss.sprite) {
        gsap.killTweensOf(boss.sprite.scale); boss.sprite.visible = true;
        const h = (boss.spriteConfig && boss.spriteConfig.type === 'bra') ? 90 : 60;
        boss.sprite.scale.set(boss.baseScaleX * boss.facing, h, 1); if (boss.shadow) boss.shadow.visible = true; if (boss.setAction) boss.setAction('HURT');
    }
    gameStore.setState({ gameState: 'FINISHED' }); startDialogue();
}

function showHighlight(nodeList, mat) {
    const offX = (MAP_W * TILE_SIZE) / 2, offZ = (MAP_D * TILE_SIZE) / 2;
    nodeList.forEach(node => {
        const mesh = new THREE.Mesh(highlightGeo, mat); mesh.rotation.x = -Math.PI / 2;
        mesh.position.set((node.x * TILE_SIZE) - offX, (node.h * H_STEP) + 10, (node.z * TILE_SIZE) - offZ);
        scene.add(mesh); highlightMeshes.push(mesh);
    });
}
function clearHighlights() { highlightMeshes.forEach(mesh => scene.remove(mesh)); highlightMeshes = []; }

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta() * 1000;
    const store = getStore();
    if (currentStage === 0 && rainSystem) {
        const positions = rainSystem.geometry.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) { positions[i] -= 12; if (positions[i] < -100) positions[i] = 1000; }
        rainSystem.geometry.attributes.position.needsUpdate = true;
    }
    const selectorUi = document.getElementById('unit-selector-ui');
    const countEl = document.getElementById('remaining-count');
    if (selectorUi && countEl) {
        const unacted = window.units.filter(u => u.isPlayer && u.hp > 0 && !u.hasActed);
        if (store.gameState === 'IDLE' && store.phase === 'PLAYER_PHASE') { selectorUi.style.display = 'block'; countEl.innerText = unacted.length; } 
        else { selectorUi.style.display = 'none'; }
    }
    window.units.forEach(u => {
        if (u.updateAnimation) u.updateAnimation(delta);
        if (u.shadow && u.sprite) {
            // ステージ1限定の水中処理（沈み込み・影消去）
            const tx = Math.round(u.x), tz = Math.round(u.z);
            const cell = (mapData && mapData[tz]) ? mapData[tz][tx] : null;
            let yOffset = 0;
            let showShadow = (u.hp > 0);
            
            if (currentStage === 1 && cell && cell.type === 4) {
                yOffset = -H_STEP; // 指定通り「1マス分(H_STEP)」沈める
                showShadow = false; // 水中は影を消す
            }

            // 移動中以外は沈み込みを適用
            if (store.gameState !== 'ANIMATING') {
                u.sprite.position.y = (u.h * H_STEP) + yOffset;
            }

            u.shadow.visible = showShadow;
            u.shadow.position.x = u.sprite.position.x;
            u.shadow.position.z = u.sprite.position.z;
            u.shadow.position.y = (u.h * H_STEP) + yOffset + 1; 
        }
    });
    if (cameraCtrl && cameraCtrl.controls) cameraCtrl.controls.update();
    renderer.render(scene, camera);
}
