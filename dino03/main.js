// ★ モダンな ES モジュールとして Zustand をインポート ★
import { createStore } from 'https://esm.sh/zustand/vanilla';

window.gameStore = createStore((set) => ({
    gameState: 'INIT',         
    walkableTiles: [],         
    confirmMode: '',           
    pendingData: null,         
    selectedTileKey: null,     
    talkIndex: 0,              
    hasBattleStarted: false,   

    setGameState: (state) => set({ gameState: state }),
    setWalkableTiles: (tiles) => set({ walkableTiles: tiles }),
    setConfirmData: (mode, data, tileKey = null) => set({ confirmMode: mode, pendingData: data, selectedTileKey: tileKey }),
    clearConfirmData: () => set({ confirmMode: '', pendingData: null, selectedTileKey: null }),
    setTalkIndex: (index) => set({ talkIndex: index }),
    setBattleStarted: (isStarted) => set({ hasBattleStarted: isStarted })
}));

window.getStore = () => window.gameStore.getState();

let scene, camera, renderer, controls, clock;
window.raycastTargets = []; 

function loadTex(texLoader, url) {
    return new Promise(resolve => {
        texLoader.load(url, resolve, undefined, () => resolve(null));
    });
}

// 読み込み完了後にゲーム初期化
window.addEventListener('load', () => {
    clock = new THREE.Clock();
    const texLoader = new THREE.TextureLoader();
    const sheetImg = new Image();
    sheetImg.src = 'img/plate01.png';

    sheetImg.onload = () => {
        // 全画像を並行して読み込む
        Promise.all([
            loadTex(texLoader, 'img/bra.png'),
            loadTex(texLoader, 'img/tactyrano01.png'),
            loadTex(texLoader, 'img/comp.png')
        ]).then(([braTex, rexTex, compTex]) => {
            const loader = document.getElementById('loading-screen');
            loader.style.opacity = '0';
            setTimeout(() => { loader.style.display = 'none'; init(sheetImg, braTex, rexTex, compTex); }, 500);
        });
    };
});

window.setMsg = function(txt, color="#ffffff") { 
    const el = document.getElementById('msg-ui');
    if(!txt) { el.style.display = 'none'; } 
    else { el.style.display = 'block'; el.innerHTML = txt; el.style.color = color; }
}

window.hideAllUI = function() {
    const ids = ['status-ui', 'detail-ui', 'command-ui', 'confirm-ui', 'target-ui', 'event-ui'];
    ids.forEach(id => { const el = document.getElementById(id); if(el) el.style.display = 'none'; });
}

window.showStatus = function(unit) {
    window.setMsg("");
    document.getElementById('status-ui').style.display = 'block';
    document.getElementById('st-name').innerText = unit.id;
    document.getElementById('st-lv').innerText = unit.level; // レベル更新
    document.getElementById('st-hp').innerText = `${unit.hp}/${unit.maxHp}`;
    document.getElementById('st-hp-bar').style.width = `${(unit.hp/unit.maxHp)*100}%`;
    document.getElementById('st-mp').innerText = `${unit.mp}/${unit.maxMp}`;
    document.getElementById('st-mp-bar').style.width = `${(unit.mp/unit.maxMp)*100}%`;
    document.getElementById('dt-str').innerText = unit.str;
    document.getElementById('dt-def').innerText = unit.def;
    document.getElementById('dt-spd').innerText = unit.spd;
    document.getElementById('dt-mag').innerText = unit.mag;
}

window.toggleDetail = function() {
    const el = document.getElementById('detail-ui');
    el.style.display = el.style.display === 'block' ? 'none' : 'block';
}

window.showCommandMenu = function() {
    document.getElementById('command-ui').style.display = 'block';
    document.getElementById('cmd-move').style.display = window.player.hasMoved ? 'none' : 'block';
    document.getElementById('cmd-attack').style.display = 'block';
    document.getElementById('cmd-wait').style.display = 'block';
    document.getElementById('cmd-cancel').style.display = 'none';
}

function playStageTitle(callback) {
    const overlay = document.getElementById('stage-overlay');
    document.getElementById('chapter-num').innerText = window.StageData.info.chapter;
    document.getElementById('stage-title').innerHTML = window.StageData.info.name;
    gsap.to(overlay, { opacity: 1, y: -20, duration: 1.5, onComplete: () => {
        gsap.to(overlay, { opacity: 0, delay: 2.0, duration: 1.0, onComplete: callback });
    }});
}

function playBattleStart() {
    if(window.getStore().hasBattleStarted) return;
    window.getStore().setBattleStarted(true);
    const overlay = document.getElementById('battle-start-overlay');
    gsap.fromTo(overlay, { opacity:0, scale:0.5 }, { opacity:1, scale:1, duration:0.5, ease:"back.out", onComplete: () => {
        gsap.to(overlay, { opacity:0, delay:1.0, duration:0.5, onComplete: () => {
            window.startPlayerTurn();
        }});
    }});
}

window.startEvent = function(talkData, callback) {
    window.getStore().setGameState('TALKING');
    window.hideAllUI();
    document.getElementById('event-ui').style.display = 'flex';
    window.getStore().setTalkIndex(0);
    
    // UIタップで会話を進める
    window.onGlobalTap = () => {
        const store = window.getStore();
        store.setTalkIndex(store.talkIndex + 1);
        if (store.talkIndex < talkData.length) {
            renderTalkLine(talkData[store.talkIndex]);
        } else {
            document.getElementById('event-ui').style.display = 'none';
            callback();
        }
    };
    renderTalkLine(talkData[0]);
};

function renderTalkLine(data) {
    const portrait = document.getElementById('ev-portrait');
    const namePlate = document.getElementById('ev-name-plate');
    const textArea = document.getElementById('ev-text');
    
    const speakerUnit = window.units.find(u => u.id === data.name || (data.name.includes("コンプソグナトゥス") && u.id.includes("コンプソグナトゥス")));
    
    // ★ UI顔グラフィックの表示（CSS背景切り抜き） ★
    if (speakerUnit && speakerUnit.spriteConfig) {
        if (speakerUnit.spriteConfig.type === 'bra') {
            portrait.innerHTML = `<div style="width: 85px; height: 60px; background-image: url('img/bra.png'); background-size: 100% 500%; background-position: 0 100%; image-rendering: pixelated;"></div>`;
        } else if (speakerUnit.spriteConfig.type === 'rex') {
            portrait.innerHTML = `<div style="width: 85px; height: 60px; background-image: url('img/tactyrano01.png'); background-size: 400% 400%; background-position: 100% 100%; image-rendering: pixelated;"></div>`;
        } else if (speakerUnit.spriteConfig.type === 'comp') {
            portrait.innerHTML = `<div style="width: 85px; height: 60px; background-image: url('img/comp.png'); background-size: 300% 200%; background-position: 100% 100%; image-rendering: pixelated;"></div>`;
        }
    } else {
        portrait.innerHTML = `<span>${data.face}</span>`;
    }
    
    namePlate.innerText = data.name;
    textArea.innerHTML = data.text;
    
    if(speakerUnit && speakerUnit.hp > 0) {
        gsap.to(controls.target, { x: speakerUnit.sprite.position.x, z: speakerUnit.sprite.position.z, duration: 0.6 });
        // 会話時にお互いを向く
        if (speakerUnit !== window.player) {
            speakerUnit.lookAtNode(window.player.x, window.player.z);
            window.player.lookAtNode(speakerUnit.x, speakerUnit.z);
        }
    }
}

window.startPlayerTurn = function() {
    let boss = window.units.find(u => u.id === 'ブラキオサウルス');
    if(boss && boss.hp <= 0) return; 
    window.getStore().setGameState('IDLE'); 
    window.clearHighlights(); window.hideAllUI();
    window.setMsg("あなたの<ruby>番<rt>ばん</rt></ruby>です！<br><ruby>仲間<rt>なかま</rt></ruby>をタップしてね", "#00ff00");
}

window.resetToIdle = function() {
    window.getStore().setGameState('IDLE'); 
    window.clearHighlights(); window.hideAllUI();
    window.setMsg(""); 
    if(window.selectorMesh) window.selectorMesh.visible = false;
}

window.cancelMove = function() {
    window.getStore().setGameState('IDLE');
    window.clearHighlights();
    window.showCommandMenu();
}

window.execCommand = function(cmd) {
    if(cmd === 'move') {
        window.getStore().setGameState('SELECTING_MOVE'); 
        window.clearHighlights();
        const tiles = window.getWalkableNodes(window.player);
        window.getStore().setWalkableTiles(tiles);
        tiles.forEach(node => { 
            const tile = window.tilesMeshMap[`${Number(node.x)},${Number(node.z)}`];
            if(tile) tile.material[2].color.setHex(0x55ff55); 
        });
        document.getElementById('cmd-move').style.display = 'none';
        document.getElementById('cmd-attack').style.display = 'none';
        document.getElementById('cmd-wait').style.display = 'none';
        document.getElementById('cmd-cancel').style.display = 'block';
    } else if (cmd === 'attack') {
        let targets = window.getAttackableEnemies(window.player);
        if(targets.length === 0) {
            window.setMsg("<ruby>攻撃<rt>こうげき</rt></ruby>できる相手がいません！", "#aaaaaa");
            setTimeout(() => { window.setMsg(""); window.showCommandMenu(); }, 1200);
            return;
        }
        window.getStore().setGameState('SELECTING_ATTACK_TARGET');
        const listDiv = document.getElementById('target-list');
        listDiv.innerHTML = ''; 
        targets.forEach(t => {
            const btn = document.createElement('button');
            btn.className = 'cmd-btn'; btn.innerHTML = `${t.id} (HP: ${t.hp})`;
            btn.onclick = () => window.selectTarget(t);
            listDiv.appendChild(btn);
            window.tilesMeshMap[`${t.x},${t.z}`].material[2].color.setHex(0xff5555); 
        });
        document.getElementById('command-ui').style.display = 'none';
        document.getElementById('target-ui').style.display = 'block';
    } else if (cmd === 'wait') {
        window.getStore().setGameState('CONFIRMING');
        window.getStore().setConfirmData('WAIT', null);
        document.getElementById('confirm-text').innerHTML = "<ruby>行動<rt>こうどう</rt></ruby>を終了しますか？";
        document.querySelector('#confirm-ui .btn-yes').onclick = () => window.answerConfirm(true); 
        document.getElementById('command-ui').style.display = 'none';
        document.getElementById('confirm-ui').style.display = 'block';
    }
}

window.selectTarget = function(targetUnit) {
    document.getElementById('target-ui').style.display = 'none';
    window.getStore().setGameState('CONFIRMING');
    window.getStore().setConfirmData('ATTACK', targetUnit);
    document.getElementById('confirm-text').innerHTML = `${targetUnit.id} を<ruby>攻撃<rt>こうげき</rt></ruby>しますか？`;
    document.querySelector('#confirm-ui .btn-yes').onclick = () => window.answerConfirm(true); 
    document.getElementById('confirm-ui').style.display = 'block';
}

window.cancelAttack = function() {
    document.getElementById('target-ui').style.display = 'none';
    window.clearHighlights(); window.showCommandMenu();
}

window.answerConfirm = function(isYes) {
    document.getElementById('confirm-ui').style.display = 'none';
    const store = window.getStore();

    if (isYes) {
        store.setGameState('ANIMATING');
        window.clearHighlights(); window.setMsg("");
        
        if(store.confirmMode === 'WAIT') {
            window.endPlayerTurn();
        } else if(store.confirmMode === 'MOVE') {
            window.player.hasMoved = true;
            window.executeMovement(window.player, store.pendingData, () => { 
                window.resetToIdle(); window.showStatus(window.player); window.showCommandMenu(); 
            });
        } else if(store.confirmMode === 'ATTACK') {
            window.player.hasAttacked = true;
            window.executeAttack(window.player, store.pendingData, true, () => { 
                let boss = window.units.find(u => u.id === 'ブラキオサウルス');
                if(boss && boss.hp <= 0) { checkVictory(); } else { window.endPlayerTurn(); }
            });
        }
    } else {
        if(store.confirmMode === 'MOVE') {
            store.setGameState('SELECTING_MOVE');
            window.tilesMeshMap[store.selectedTileKey].material[2].color.setHex(0x55ff55); 
            if(window.selectorMesh) window.selectorMesh.visible = false;
            document.getElementById('command-ui').style.display = 'block';
        } else if(store.confirmMode === 'ATTACK') {
            store.setGameState('SELECTING_ATTACK_TARGET');
            document.getElementById('target-ui').style.display = 'block';
        } else if(store.confirmMode === 'WAIT') {
            window.showCommandMenu();
        }
    }
}

function checkVictory() {
    let boss = window.units.find(u => u.id === 'ブラキオサウルス');
    if(boss && boss.hp <= 0 && window.getStore().gameState !== 'FINISHED') {
        window.getStore().setGameState('FINISHED'); 
        setTimeout(() => {
            if(boss.texture) { boss.setAction('HURT'); }
            
            const mainTalk = window.StageData.postBattleTalk.slice(0, -1);
            const lastLine = [window.StageData.postBattleTalk[window.StageData.postBattleTalk.length - 1]];

            window.player.lookAtNode(boss.x, boss.z);
            boss.lookAtNode(window.player.x, window.player.z);

            window.startEvent(mainTalk, () => {
                const exitPath = [{x:12, z:16, h:0}, {x:12, z:17, h:0}];
                
                window.executeMovement(window.player, exitPath, () => {
                    gsap.to(window.player.sprite.scale, {x:0, y:0, duration:0.5});
                    gsap.to(controls.target, {
                        x: boss.sprite.position.x,
                        y: boss.sprite.position.y,
                        z: boss.sprite.position.z,
                        duration: 1.5,
                        ease: "power2.inOut",
                        onComplete: () => {
                            window.startEvent(lastLine, () => {
                                showBigEpisodeClear();
                            });
                        }
                    });
                }, true);
            });
        }, 600);
    }
}

function showBigEpisodeClear() {
    const overlay = document.getElementById('episode-clear-overlay');
    gsap.to(overlay, { opacity: 1, y: -20, duration: 1.0 });
}

window.showFloatingText = function(unit, text, type) {
    const vector = unit.sprite.position.clone();
    vector.y += unit.sprite.scale.y + 10; 
    vector.project(camera); 
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
    const el = document.createElement('div');
    el.className = 'floating-text'; el.innerText = text;
    el.style.color = (type === 'heal') ? '#00ffff' : (type === 'levelup' ? '#ffff00' : '#ffffff'); 
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    document.body.appendChild(el);
    gsap.to(el, { y: y - 100, opacity: 0, duration: 1.5, ease: "power2.out", onComplete: () => { el.remove(); } });
}

window.executeAttack = function(attacker, defender, allowCounter, onComplete) {
    const offsetX = (window.MAP_W * window.TILE_SIZE) / 2; const offsetZ = (window.MAP_D * window.TILE_SIZE) / 2;
    const dx = ((defender.x * window.TILE_SIZE) - offsetX) - attacker.sprite.position.x;
    const dz = ((defender.z * window.TILE_SIZE) - offsetZ) - attacker.sprite.position.z;
    const heightBonus = (attacker.h - defender.h) * 2;
    const damage = Math.max(1, (attacker.str - defender.def) + heightBonus);
    const origX = attacker.sprite.position.x; const origZ = attacker.sprite.position.z;

    attacker.lookAtNode(defender.x, defender.z);
    defender.lookAtNode(attacker.x, attacker.z);

    if(attacker.texture) attacker.setAction('ATTACK');
    if(defender.texture) defender.setAction('HURT');

    const tl = gsap.timeline({ onComplete: () => {
        defender.hp -= damage;
        window.showFloatingText(defender, damage, 'damage');
        
        if(attacker.texture) attacker.setIdle();
        if(defender.texture && defender.hp > 0) defender.setIdle();

        if(defender.hp <= 0) {
            if(defender.texture) defender.setAction('DOWN');
            
            // ★ 敵を倒した時のレベルアップ処理 ★
            if(attacker.isPlayer) {
                attacker.exp += 100;
                if(attacker.exp >= 100) { 
                    attacker.levelUp();
                    setTimeout(() => { 
                        window.showFloatingText(attacker, "LEVEL UP!", 'levelup'); 
                        window.showStatus(attacker); 
                    }, 400);
                }
            }

            gsap.to(defender.sprite.scale, {delay: 0.2, x:0, y:0, duration:0.5, onComplete: () => { 
                let boss = window.units.find(u => u.id === 'ブラキオサウルス');
                if(boss && boss.hp <= 0) { checkVictory(); } else { onComplete(); }
            }});
        } else {
            const dist = Math.abs(attacker.x - defender.x) + Math.abs(attacker.z - defender.z);
            if(allowCounter && dist === 1) {
                setTimeout(() => { 
                    window.setMsg("COUNTER!", "#ff0000"); 
                    window.executeAttack(defender, attacker, false, onComplete); 
                }, 800);
            } else { onComplete(); }
        }
    }});
    tl.to(attacker.sprite.position, { x: origX - dx*0.2, z: origZ - dz*0.2, duration: 0.15, ease: "power1.out" }); 
    tl.to(attacker.sprite.position, { x: origX + dx*0.6, z: origZ + dz*0.6, duration: 0.1, ease: "power2.in" });  
    tl.to(attacker.sprite.position, { x: origX, z: origZ, duration: 0.2, ease: "power2.out" }); 
}

window.executeMovement = function(unit, path, onComplete, followCamera = false) {
    const offsetX = (window.MAP_W * window.TILE_SIZE) / 2; const offsetZ = (window.MAP_D * window.TILE_SIZE) / 2;
    const tl = gsap.timeline({ onComplete: () => {
        unit.x = path[path.length - 1].x; 
        unit.z = path[path.length - 1].z; 
        unit.h = path[path.length - 1].h;
        if (onComplete) onComplete();
    }});
    
    path.forEach(step => {
        const tX = (step.x * window.TILE_SIZE) - offsetX; 
        const tZ = (step.z * window.TILE_SIZE) - offsetZ;
        const tY = step.h * window.H_STEP;
        
        tl.call(() => { unit.lookAtNode(step.x, step.z); });

        tl.to(unit.sprite.position, { 
            x: tX, z: tZ, 
            duration: 0.25, 
            ease: "power1.inOut",
            onUpdate: () => { if(followCamera) controls.target.copy(unit.sprite.position); }
        });
        tl.to(unit.sprite.position, { y: Math.max(unit.sprite.position.y, tY) + 20, duration: 0.125, ease: "power1.out", yoyo: true, repeat: 1 }, "<");
        tl.set(unit.sprite.position, { y: tY });
    });
}

// ★ 敵のAI（順番に行動する）の実装 ★
window.endPlayerTurn = function() {
    let boss = window.units.find(u => u.id === 'ブラキオサウルス');
    if(boss && boss.hp <= 0) { checkVictory(); return; }
    
    window.player.hasMoved = false; window.player.hasAttacked = false; window.hideAllUI();
    window.getStore().setGameState('ENEMY_TURN');
    window.setMsg("<ruby>敵<rt>てき</rt></ruby>の番です...", "#ff5555");
    
    setTimeout(() => {
        let enemies = window.units.filter(u => !u.isPlayer && u.hp > 0);
        let actingEnemies = [];
        
        let compAB_alive = enemies.some(u => u.id === 'コンプソグナトゥスA' || u.id === 'コンプソグナトゥスB');
        let anyComp_alive = enemies.some(u => u.id.includes('コンプソグナトゥス'));

        enemies.forEach(e => {
            let distToPlayer = Math.abs(e.x - window.player.x) + Math.abs(e.z - window.player.z);
            if (e.id === 'コンプソグナトゥスA' || e.id === 'コンプソグナトゥスB') {
                actingEnemies.push(e); 
            } else if (e.id === 'コンプソグナトゥスC' || e.id === 'コンプソグナトゥスD') {
                // A・B全滅、またはプレイヤーが近い場合のみ動く
                if (!compAB_alive || distToPlayer <= 5) actingEnemies.push(e); 
            } else if (e.id === 'ブラキオサウルス') {
                // 部下が全滅するまで動かない
                if (!anyComp_alive) actingEnemies.push(e); 
            }
        });

        processEnemyQueue(actingEnemies);
    }, 1000);
}

function processEnemyQueue(queue) {
    if (queue.length === 0) {
        window.startPlayerTurn();
        return;
    }
    let enemy = queue.shift();
    if (enemy.hp <= 0) { processEnemyQueue(queue); return; } 

    let routes = window.getWalkableNodes(enemy);
    let bestRoute = null; let minD = 999;
    routes.forEach(r => { 
        let d = Math.abs(r.x - window.player.x) + Math.abs(r.z - window.player.z); 
        if(d < minD) { minD = d; bestRoute = r; } 
    });

    if(bestRoute && bestRoute.path.length > 0) {
        window.executeMovement(enemy, bestRoute.path, () => {
            if(window.getAttackableEnemies(enemy).includes(window.player)) { 
                window.executeAttack(enemy, window.player, true, () => { 
                    if(window.player.hp <= 0) { 
                        if(window.player.texture) window.player.setAction('DOWN');
                        window.setMsg("GAME OVER", "#ff0000"); 
                    } else { processEnemyQueue(queue); } 
                }); 
            } else { processEnemyQueue(queue); }
        });
    } else { processEnemyQueue(queue); }
}

function init(sheetImg, braTex, rexTex, compTex) {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene(); 
    window.mapData = window.StageData.generateLayout();
    const w = container.clientWidth; const h = container.clientHeight;
    camera = new THREE.OrthographicCamera(-w, w, h, -h, 1, 4000);
    camera.zoom = 1.5; camera.updateProjectionMatrix();
    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(w, h); renderer.setClearColor(0x1a1a1a);
    container.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    window.buildMapMeshes(scene, sheetImg);
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(window.TILE_SIZE, window.H_STEP, window.TILE_SIZE));
    const mat = new THREE.LineBasicMaterial({ color: 0xffffff });
    window.selectorMesh = new THREE.LineSegments(geo, mat); window.selectorMesh.visible = false; scene.add(window.selectorMesh);
    
    window.units = window.StageData.units.map(u => {
        let conf = null;
        if(u.id === 'ブラキオサウルス' && braTex) {
            conf = { tex: braTex.clone(), cols: 1, rows: 5, type: 'bra', w: 352, h: 1250 };
        } else if (u.id === 'ティラノ' && rexTex) {
            conf = { tex: rexTex.clone(), cols: 4, rows: 4, type: 'rex', w: 1200, h: 840 };
        } else if (u.id.includes('コンプソグナトゥス') && compTex) {
            conf = { tex: compTex.clone(), cols: 3, rows: 2, type: 'comp', w: 1080, h: 480 };
        }

        if(conf) conf.tex.needsUpdate = true;

        const unit = new window.Unit(u.id, u.emoji, Number(u.x), Number(u.z), u.hp, u.mp, u.str, u.def, u.spd, u.mag, u.move, u.jump, u.isPlayer, conf, u.level);
        
        if(!conf) {
            const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
            const ctx = canvas.getContext('2d'); ctx.font = '90px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(unit.emoji, 64, 64);
            unit.material = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) });
            unit.sprite = new THREE.Sprite(unit.material);
            unit.setBaseScale(window.TILE_SIZE * 1.6);
            unit.sprite.userData = { isUnit: true, unit: unit };
        }
        
        unit.h = window.mapData[unit.z][unit.x].h;
        window.raycastTargets.push(unit.sprite);
        scene.add(unit.sprite); window.updateUnitPosInstantly(unit);
        if(unit.isPlayer) window.player = unit; 
        return unit;
    });
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = Math.PI / 2.2; controls.minPolarAngle = Math.PI / 6;
    window.centerCameraInstantly(window.player); 
    renderer.domElement.addEventListener('pointerup', onPointerClick);
    
    let boss = window.units.find(u => u.id === 'ブラキオサウルス');
    if(boss) {
        window.player.lookAtNode(boss.x, boss.z);
        boss.lookAtNode(window.player.x, window.player.z);
    }
    
    playStageTitle(() => {
        window.startEvent(window.StageData.preBattleTalk, () => { playBattleStart(); });
    });
    animate();
}

window.clearHighlights = function() { 
    window.interactableTiles.forEach(t => t.material[2].color.setHex(0xffffff)); 
    if(window.selectorMesh) window.selectorMesh.visible = false;
    window.units.forEach(u => {
        if(u.hp > 0) {
            const tile = window.tilesMeshMap[`${u.x},${u.z}`];
            if(tile) tile.material[2].color.setHex(u.isPlayer ? 0x88ccff : 0xff8888);
        }
    });
}

function onPointerClick(event) {
    const store = window.getStore();
    if (store.gameState === 'ANIMATING' || store.gameState === 'ENEMY_TURN') return;
    if (store.gameState === 'TALKING') { window.onGlobalTap(); return; }
    const mouse = new THREE.Vector2((event.clientX/window.innerWidth)*2-1, -(event.clientY/window.innerHeight)*2+1);
    const raycaster = new THREE.Raycaster(); raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(window.raycastTargets);
    if (intersects.length > 0) {
        let data = intersects[0].object.userData;
        if(data.isUnit) data = { x: data.unit.x, z: data.unit.z, h: data.unit.h };
        if(store.gameState === 'IDLE') {
            const u = window.getUnitAt(data.x, data.z);
            if(u) { window.showStatus(u); if(u.isPlayer) window.showCommandMenu(); } else { window.resetToIdle(); }
        } else if (store.gameState === 'SELECTING_MOVE') {
            const route = store.walkableTiles.find(n => Math.abs(n.x - data.x) < 0.5 && Math.abs(n.z - data.z) < 0.5);
            if (route) {
                window.clearHighlights(); 
                store.setGameState('CONFIRMING');
                store.setConfirmData('MOVE', route.path, `${route.x},${route.z}`);
                const tile = window.tilesMeshMap[store.selectedTileKey];
                tile.material[2].color.setHex(0xffff00); window.selectorMesh.position.copy(tile.position); window.selectorMesh.visible = true;
                document.getElementById('confirm-text').innerHTML = "ここへ移動しますか？";
                document.querySelector('#confirm-ui .btn-yes').onclick = () => window.answerConfirm(true); 
                document.getElementById('command-ui').style.display = 'none'; 
                document.getElementById('confirm-ui').style.display = 'block';
            }
        } 
    }
}

window.updateUnitPosInstantly = function(u) {
    const offsetX = (window.MAP_W * window.TILE_SIZE) / 2; const offsetZ = (window.MAP_D * window.TILE_SIZE) / 2;
    u.sprite.position.set((u.x * window.TILE_SIZE) - offsetX, u.h * window.H_STEP, (u.z * window.TILE_SIZE) - offsetZ);
}
window.centerCameraInstantly = function(u) {
    const rad = 45 * (Math.PI / 180); const r = 800;
    controls.target.copy(u.sprite.position);
    camera.position.set(u.sprite.position.x + Math.sin(rad)*r, u.sprite.position.y + 600, u.sprite.position.z + Math.cos(rad)*r);
    camera.lookAt(controls.target);
}
window.rotateCam = function(deg) {
    if (window.getStore().gameState === 'ANIMATING') return;
    const r = controls.getDistance(); const polar = controls.getPolarAngle(); const startAz = controls.getAzimuthalAngle();
    const targetAz = startAz + (Number(deg) * Math.PI / 180);
    const proxy = { angle: startAz };
    gsap.to(proxy, { angle: targetAz, duration: 0.4, onUpdate: () => {
        camera.position.x = controls.target.x + r * Math.sin(proxy.angle) * Math.sin(polar);
        camera.position.z = controls.target.z + r * Math.cos(proxy.angle) * Math.sin(polar);
        camera.lookAt(controls.target); controls.update();
    }});
}
window.panCamera = function(dx, dy) {
    const pan = 150; const ang = controls.getAzimuthalAngle();
    const moveX = (dx * Math.cos(ang) + dy * Math.sin(ang)) * pan; const moveZ = (-dx * Math.sin(ang) + dy * Math.cos(ang)) * pan;
    gsap.to(camera.position, { x: camera.position.x + moveX, z: camera.position.z + moveZ, duration: 0.3 });
    gsap.to(controls.target, { x: controls.target.x + moveX, z: controls.target.z + moveZ, duration: 0.3 });
}
window.zoomCamera = function(amount) { camera.zoom = Math.max(0.5, camera.zoom + (amount > 0 ? -0.2 : 0.2)); camera.updateProjectionMatrix(); }

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta() * 1000;
    if(window.units) { window.units.forEach(u => u.updateAnimation && u.updateAnimation(delta)); }
    controls.update();
    renderer.render(scene, camera);
}
