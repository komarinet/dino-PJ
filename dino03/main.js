export const VERSION = "8.18.0";

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
        const isOk = curVer && (curVer.startsWith("8.16") || curVer.startsWith("8.17") || curVer.startsWith("8.18"));
        if (!isOk) allOk = false;
        list.innerHTML += `<div style="color:${isOk ? '#0f0' : '#f00'}">${file.padEnd(16)}: ver ${curVer || '---'} [${isOk ? 'OK' : 'OLD'}]</div>`;
    }

    if (allOk) {
        document.getElementById('btn-start-game').style.display = 'block';
        list.innerHTML += `<div style="color:#0f0; margin-top:10px; font-weight:bold;">READY TO START!</div>`;
    } else {
        list.innerHTML += `<div style="color:#f00; margin-top:10px; font-weight:bold;">! 一部のファイルが古いです。キャッシュを消去してリロードしてください。</div>`;
    }
}

let scene, camera, renderer, clock, cameraCtrl, uiCtrl, battleSys;
const mapData = StageData.generateLayout();

// ★ 追加：ハイライト用のパネルを管理する配列とマテリアル
let highlightMeshes = [];
const moveHighlightMat = new THREE.MeshBasicMaterial({ color: 0x55ff55, transparent: true, opacity: 0.5, depthWrite: false });
const attackHighlightMat = new THREE.MeshBasicMaterial({ color: 0xff5555, transparent: true, opacity: 0.5, depthWrite: false });
const targetHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.7, depthWrite: false }); // 選択中のターゲット用
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
            const [braTex, rexTex, compTex] = await Promise.all([loadTex('img/bra.png'), loadTex('img/tactyrano01.png'), loadTex('img/comp.png')]);
            init(sheetImg, braTex, rexTex, compTex);
            document.getElementById('loading-screen').style.display = 'none';
        };
    } catch (e) { console.error(e); }
}

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
        if (unit.shadow) scene.add(unit.shadow);

        const offX = (MAP_W * TILE_SIZE) / 2, offZ = (MAP_D * TILE_SIZE) / 2;
        unit.sprite.position.set((unit.x * TILE_SIZE) - offX, unit.h * H_STEP, (unit.z * TILE_SIZE) - offZ);
        
        if(unit.isPlayer) window.player = unit; 
        return unit;
    });

    // ★ 追加：オープニングの睨み合い演出（敵全員をティラノの方へ向かせる）
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
            // ★ 変更：ゲーム開始時、明確に「プレイヤーフェイズ」と設定する
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

// ★ 追加：ハイライトの表示処理（パネルを置く方式）
function showHighlight(nodeList, mat) {
    clearHighlights(); // 古いハイライトを消す
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
                // ★ 変更：自分が行動完了（hasActed）でなければコマンドを出す
                if(u.isPlayer && !u.hasActed) {
                    uiCtrl.updateCommandMenu(u); // 移動済みかどうかでボタンをグレーアウト
                    document.getElementById('command-ui').style.display = 'block'; 
                }
            } else { uiCtrl.hideAll(); }
        } else if (store.gameState === 'SELECTING_MOVE') {
            const route = store.walkableTiles.find(n => n.x === data.x && n.z === data.z);
            if(route) {
                // ★ 追加：選んだマスを黄色く光らせる（他の緑は残す）
                const highlightTarget = [{x: route.x, z: route.z, h: route.h}];
                showHighlight(store.walkableTiles, moveHighlightMat); // 全体を緑で再描画
                
                // 黄色いパネルを重ねて置く
                const offX = (MAP_W * TILE_SIZE) / 2, offZ = (MAP_D * TILE_SIZE) / 2;
                const mesh = new THREE.Mesh(highlightGeo, targetHighlightMat);
                mesh.rotation.x = -Math.PI / 2;
                mesh.position.set((route.x * TILE_SIZE) - offX, (route.h * H_STEP) + 3, (route.z * TILE_SIZE) - offZ);
                scene.add(mesh);
                highlightMeshes.push(mesh); // 消すリストに入れておく

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
        showHighlight(tiles, moveHighlightMat); // ★ 追加：移動可能マスを緑に
        document.getElementById('command-ui').style.display = 'none';
    } else if(cmd === 'attack') {
        const targets = getAttackableEnemies(window.units, window.player);
        if(targets.length === 0) return uiCtrl.setMsg("範囲内に敵がいません");
        gameStore.setState({ gameState: 'SELECTING_ATTACK_TARGET' });
        
        const list = document.getElementById('target-list'); list.innerHTML = '';
        targets.forEach(t => {
            const btn = document.createElement('button'); btn.className = 'cmd-btn'; btn.innerText = t.id;
            btn.onclick = () => selectTarget(t); list.appendChild(btn);
        });
        showHighlight(targets, attackHighlightMat); // ★ 追加：攻撃可能マスを赤に
        document.getElementById('command-ui').style.display = 'none'; document.getElementById('target-ui').style.display = 'block';
    } else if(cmd === 'wait') {
        gameStore.setState({ confirmMode: 'WAIT', pendingData: null });
        document.getElementById('confirm-text').innerText = "行動を終了しますか？";
        document.getElementById('confirm-ui').style.display = 'block'; document.getElementById('command-ui').style.display = 'none';
    }
}

function selectTarget(t) {
    gameStore.setState({ confirmMode: 'ATTACK', pendingData: t });
    document.getElementById('target-ui').style.display = 'none';
    
    // ★ 追加：選んだ敵の足元だけ濃い赤（黄色）にする
    clearHighlights();
    showHighlight([{x: t.x, z: t.z, h: t.h}], targetHighlightMat);

    document.getElementById('confirm-text').innerText = `${t.id} を攻撃しますか？`; document.getElementById('confirm-ui').style.display = 'block';
}

function answerConfirm(isYes) {
    const store = getStore(); document.getElementById('confirm-ui').style.display = 'none';
    if(!isYes) {
        clearHighlights();
        if(store.confirmMode === 'ATTACK') return execCommand('attack');
        uiCtrl.hideAll(); gameStore.setState({ gameState: 'IDLE' }); return;
    }
    
    clearHighlights(); // 確定したらハイライトは消す
    gameStore.setState({ gameState: 'ANIMATING' });
    
    if(store.confirmMode === 'MOVE') {
        battleSys.executeMovement(window.player, store.pendingData, () => { 
            window.player.hasMoved = true; 
            gameStore.setState({ gameState: 'IDLE' }); 
            uiCtrl.updateCommandMenu(window.player);
            document.getElementById('command-ui').style.display = 'block'; 
        });
    } else if(store.confirmMode === 'ATTACK') {
        // 攻撃後、行動完了にする処理を渡す
        battleSys.executeAttack(window.player, store.pendingData, window.units, camera, () => completePlayerAction(window.player), scene);
    } else { 
        completePlayerAction(window.player); 
    }
}

// ★ 追加：キャラクターの行動完了処理（全員終わったら敵ターンへ）
function completePlayerAction(unit) {
    unit.hasMoved = true; 
    unit.hasAttacked = true;
    unit.hasActed = true; // 行動完了フラグ
    
    // プレイヤー軍でまだ動けるキャラがいるかチェック
    const activePlayers = window.units.filter(u => u.isPlayer && u.hp > 0 && !u.hasActed);
    
    const boss = window.units.find(u => u.id === 'ブラキオサウルス');
    if(boss && boss.hp <= 0) return checkVictory();

    if (activePlayers.length > 0) {
        // まだ動ける味方がいるならフェイズ継続
        gameStore.setState({ gameState: 'IDLE' });
        uiCtrl.hideAll();
    } else {
        // 全員動いたので敵のフェイズへ移行
        gameStore.setState({ gameState: 'ENEMY_TURN', phase: 'ENEMY_PHASE' });
        uiCtrl.hideAll();
        uiCtrl.setMsg("敵の番です...", "#ff5555");
        setTimeout(processEnemyAI, 1000);
    }
}

async function processEnemyAI() {
    // 敵全員の行動完了フラグをリセット
    window.units.filter(u => !u.isPlayer).forEach(u => u.hasActed = false);

    const enemies = battleSys.decideEnemyAI(window.units, window.player);
    for(const enemy of enemies) {
        if(enemy.hp <= 0) continue;

        const routes = getWalkableNodes(window.units, enemy, mapData);
        let best = null, minD = 999;
        routes.forEach(r => { const d = Math.abs(r.x - window.player.x) + Math.abs(r.z - window.player.z); if(d < minD){ minD=d; best=r; } });
        if(best && best.path.length > 0) {
            await new Promise(res => battleSys.executeMovement(enemy, best.path, res));
            if(getAttackableEnemies(window.units, enemy).includes(window.player)) {
                await new Promise(res => battleSys.executeAttack(enemy, window.player, window.units, camera, res, scene));
                if(window.player.hp <= 0) return uiCtrl.setMsg("GAME OVER", "#ff0000");
            }
        }
        enemy.hasActed = true;
    }
    
    // 敵フェイズ終了 → プレイヤーフェイズ開始
    window.units.filter(u => u.isPlayer).forEach(u => {
        u.hasMoved = false; u.hasAttacked = false; u.hasActed = false;
    });
    
    gameStore.setState({ gameState: 'IDLE', phase: 'PLAYER_PHASE' }); 
    uiCtrl.hideAll(); 
    uiCtrl.setMsg("あなたの番です！", "#00ff00");
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
