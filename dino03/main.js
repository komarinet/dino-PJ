let scene, camera, renderer, controls;
window.gameState = 'INIT'; 
window.walkableTiles = []; window.attackableTiles = [];
window.pendingData = null; window.selectedTileKey = null; window.confirmMode = '';
window.raycastTargets = []; window.talkIndex = 0;
let hasBattleStarted = false;

window.addEventListener('load', () => {
    const sheetImg = new Image();
    sheetImg.src = 'img/plate01.png';
    sheetImg.onload = () => {
        const loader = document.getElementById('loading-screen');
        loader.style.opacity = '0';
        setTimeout(() => { loader.style.display = 'none'; init(sheetImg); }, 500);
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
    const ui = document.getElementById('status-ui');
    ui.style.display = 'block';
    document.getElementById('st-name').innerText = `${unit.emoji} ${unit.id}`;
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
    document.getElementById('cmd-cancel').style.display = 'block'; 
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
    if(hasBattleStarted) return;
    hasBattleStarted = true;
    const overlay = document.getElementById('battle-start-overlay');
    gsap.fromTo(overlay, { opacity:0, scale:0.5 }, { opacity:1, scale:1, duration:0.5, ease:"back.out", onComplete: () => {
        gsap.to(overlay, { opacity:0, delay:1.0, duration:0.5, onComplete: () => {
            window.startPlayerTurn();
        }});
    }});
}

window.startEvent = function(talkData, callback) {
    window.gameState = 'TALKING';
    window.hideAllUI();
    document.getElementById('event-ui').style.display = 'flex';
    window.talkIndex = 0;
    window.onGlobalTap = () => {
        window.talkIndex++;
        if (window.talkIndex < talkData.length) {
            renderTalkLine(talkData[window.talkIndex]);
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
    portrait.innerText = data.face;
    namePlate.innerText = data.name;
    textArea.innerHTML = data.text;
    const speakerUnit = window.units.find(u => u.id === data.name);
    if(speakerUnit) {
        gsap.to(controls.target, { x: speakerUnit.sprite.position.x, z: speakerUnit.sprite.position.z, duration: 0.6 });
    }
}

window.startPlayerTurn = function() {
    if(window.enemy.hp <= 0) return; // 敵が死んでいたらターン開始しない
    window.gameState = 'IDLE'; window.clearHighlights(); window.hideAllUI();
    window.setMsg("あなたの<ruby>番<rt>ばん</rt></ruby>です！<br><ruby>仲間<rt>なかま</rt></ruby>をタップしてね", "#00ff00");
}

window.resetToIdle = function() {
    window.gameState = 'IDLE'; window.clearHighlights(); window.hideAllUI();
    window.setMsg(""); 
    if(window.selectorMesh) window.selectorMesh.visible = false;
}

window.execCommand = function(cmd) {
    if(cmd === 'move') {
        window.gameState = 'SELECTING_MOVE'; 
        window.clearHighlights();
        window.walkableTiles = window.getWalkableNodes(window.player);
        window.walkableTiles.forEach(node => { 
            const tile = window.tilesMeshMap[`${Number(node.x)},${Number(node.z)}`];
            if(tile) tile.material[2].color.setHex(0x55ff55); 
        });
        document.getElementById('command-ui').style.display = 'block'; // キャンセルボタン出すため
        document.getElementById('cmd-move').style.display = 'none';
        document.getElementById('cmd-attack').style.display = 'none';
        document.getElementById('cmd-wait').style.display = 'none';
    } else if (cmd === 'attack') {
        let targets = window.getAttackableEnemies(window.player);
        if(targets.length === 0) {
            window.setMsg("<ruby>攻撃<rt>こうげき</rt></ruby>できる相手がいません！", "#aaaaaa");
            setTimeout(() => { window.setMsg(""); window.showCommandMenu(); }, 1200);
            return;
        }
        window.gameState = 'SELECTING_ATTACK_TARGET';
        const listDiv = document.getElementById('target-list');
        listDiv.innerHTML = ''; 
        targets.forEach(t => {
            const btn = document.createElement('button');
            btn.className = 'cmd-btn'; btn.innerHTML = `${t.emoji} ${t.id} (HP: ${t.hp})`;
            btn.onclick = () => window.selectTarget(t);
            listDiv.appendChild(btn);
            window.tilesMeshMap[`${t.x},${t.z}`].material[2].color.setHex(0xff5555); 
        });
        document.getElementById('command-ui').style.display = 'none';
        document.getElementById('target-ui').style.display = 'block';
    } else if (cmd === 'wait') {
        window.gameState = 'CONFIRMING'; window.confirmMode = 'WAIT';
        document.getElementById('confirm-text').innerHTML = "<ruby>行動<rt>こうどう</rt></ruby>を終了しますか？";
        document.querySelector('#confirm-ui .btn-yes').onclick = () => window.answerConfirm(true); 
        document.getElementById('command-ui').style.display = 'none';
        document.getElementById('confirm-ui').style.display = 'block';
    }
}

window.selectTarget = function(targetUnit) {
    document.getElementById('target-ui').style.display = 'none';
    window.gameState = 'CONFIRMING'; window.confirmMode = 'ATTACK'; window.pendingData = targetUnit;
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
    if (isYes) {
        window.gameState = 'ANIMATING'; window.clearHighlights(); window.setMsg("");
        if(window.confirmMode === 'WAIT') {
            window.endPlayerTurn();
        } else if(window.confirmMode === 'MOVE') {
            window.player.hasMoved = true;
            window.executeMovement(window.player, window.pendingData, () => { 
                window.resetToIdle(); window.showStatus(window.player); window.showCommandMenu(); 
            });
        } else if(window.confirmMode === 'ATTACK') {
            window.player.hasAttacked = true;
            window.executeAttack(window.player, window.pendingData, true, () => { 
                if(window.enemy.hp <= 0) { checkVictory(); } else { window.endPlayerTurn(); }
            });
        }
    } else {
        if(window.confirmMode === 'MOVE') {
            window.gameState = 'SELECTING_MOVE';
            window.tilesMeshMap[window.selectedTileKey].material[2].color.setHex(0x55ff55); 
            if(window.selectorMesh) window.selectorMesh.visible = false;
        } else if(window.confirmMode === 'ATTACK') {
            window.gameState = 'SELECTING_ATTACK_TARGET';
            document.getElementById('target-ui').style.display = 'block';
        } else if(window.confirmMode === 'WAIT') {
            window.showCommandMenu();
        }
    }
    if(!isYes) { window.pendingData = null; window.selectedTileKey = null; }
}

function checkVictory() {
    // ★反撃でも敵ターンでも、ブラキオが倒れたら即時発動
    if(window.enemy.hp <= 0 && window.gameState !== 'TALKING' && window.gameState !== 'FINISHED') {
        window.gameState = 'FINISHED'; // 重複防止
        setTimeout(() => {
            gsap.to(window.enemy.sprite.scale, { x: window.TILE_SIZE * 1.5, y: window.TILE_SIZE * 1.5, duration: 0.1 });
            window.startEvent(window.StageData.postBattleTalk, () => {
                const exitPath = [{x:12, z:16, h:1}, {x:12, z:22, h:0}];
                window.executeMovement(window.player, exitPath, () => {
                    gsap.to(window.player.sprite.scale, {x:0, y:0, duration:0.5});
                    showBigEpisodeClear();
                });
            });
        }, 800);
    }
}

function showBigEpisodeClear() {
    const overlay = document.getElementById('episode-clear-overlay');
    gsap.to(overlay, { opacity: 1, y: -20, duration: 1.0 });
}

window.showFloatingText = function(unit, text, type) {
    const vector = unit.sprite.position.clone();
    vector.y += 60; vector.project(camera); 
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
    const el = document.createElement('div');
    el.className = 'floating-text'; el.innerText = text;
    el.style.color = (type === 'heal') ? '#00ffff' : '#ffffff'; 
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

    const tl = gsap.timeline({ onComplete: () => {
        defender.hp -= damage;
        window.showFloatingText(defender, damage, 'damage');
        if(defender.hp <= 0) {
            gsap.to(defender.sprite.scale, {x:0, y:0, duration:0.5, onComplete: () => {
                checkVictory(); // ★ここで勝利判定
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

window.executeMovement = function(unit, path, onComplete) {
    const offsetX = (window.MAP_W * window.TILE_SIZE) / 2; const offsetZ = (window.MAP_D * window.TILE_SIZE) / 2;
    const tl = gsap.timeline({ onComplete });
    path.forEach(step => {
        const tX = (step.x * window.TILE_SIZE) - offsetX; const tZ = (step.z * window.TILE_SIZE) - offsetZ;
        const tY = (step.h * window.H_STEP) + (window.TILE_SIZE * 0.5);
        tl.to(unit.sprite.position, { x: tX, z: tZ, duration: 0.25, ease: "power1.inOut" });
        tl.to(unit.sprite.position, { y: Math.max(unit.sprite.position.y, tY) + 30, duration: 0.125, ease: "power1.out", yoyo: true, repeat: 1 }, "<");
        tl.set(unit.sprite.position, { y: tY });
    });
    const finalStep = path[path.length - 1];
    unit.x = finalStep.x; unit.z = finalStep.z; unit.h = finalStep.h;
}

window.endPlayerTurn = function() {
    if(window.enemy.hp <= 0) { checkVictory(); return; }
    window.player.hasMoved = false; window.player.hasAttacked = false; window.hideAllUI();
    window.gameState = 'ENEMY_TURN'; window.setMsg("<ruby>敵<rt>てき</rt></ruby>の番です...", "#ff5555");
    setTimeout(() => {
        let routes = window.getWalkableNodes(window.enemy);
        let bestRoute = null; let minD = 999;
        routes.forEach(r => { let d = Math.abs(r.x - window.player.x) + Math.abs(r.z - window.player.z); if(d < minD) { minD = d; bestRoute = r; } });
        if(bestRoute && bestRoute.path.length > 0) {
            window.executeMovement(window.enemy, bestRoute.path, () => {
                if(window.getAttackableEnemies(window.enemy).includes(window.player)) { 
                    window.executeAttack(window.enemy, window.player, true, () => { 
                        if(window.player.hp <= 0) { window.setMsg("GAME OVER", "#ff0000"); } else { window.startPlayerTurn(); }
                    }); 
                } else { window.startPlayerTurn(); }
            });
        } else { window.startPlayerTurn(); }
    }, 1000);
}

function init(sheetImg) {
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
    window.raycastTargets = [...window.interactableTiles]; 
    window.units = window.StageData.units.map(u => {
        const unit = new window.Unit(u.id, u.emoji, Number(u.x), Number(u.z), u.hp, u.mp, u.str, u.def, u.spd, u.mag, u.move, u.jump, u.isPlayer);
        unit.h = window.mapData[unit.z][unit.x].h;
        const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d'); ctx.font = '90px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(unit.emoji, 64, 64);
        unit.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }));
        unit.sprite.scale.set(window.TILE_SIZE * 1.6, window.TILE_SIZE * 1.6, 1); // 判定拡大
        unit.sprite.userData = { isUnit: true, unit: unit }; window.raycastTargets.push(unit.sprite);
        scene.add(unit.sprite); window.updateUnitPosInstantly(unit);
        if(unit.isPlayer) window.player = unit; else window.enemy = unit;
        return unit;
    });
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = Math.PI / 2.2; controls.minPolarAngle = Math.PI / 6;
    window.centerCameraInstantly(window.player); 
    renderer.domElement.addEventListener('pointerup', onPointerClick);
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
    if (window.gameState === 'ANIMATING' || window.gameState === 'ENEMY_TURN') return;
    if (window.gameState === 'TALKING') { window.onGlobalTap(); return; }
    const mouse = new THREE.Vector2((event.clientX/window.innerWidth)*2-1, -(event.clientY/window.innerHeight)*2+1);
    const raycaster = new THREE.Raycaster(); raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(window.raycastTargets);
    if (intersects.length > 0) {
        let data = intersects[0].object.userData;
        if(data.isUnit) data = { x: data.unit.x, z: data.unit.z, h: data.unit.h };
        if(window.gameState === 'IDLE') {
            const u = window.getUnitAt(data.x, data.z);
            if(u) { window.showStatus(u); if(u.isPlayer) window.showCommandMenu(); } else { window.resetToIdle(); }
        } else if (window.gameState === 'SELECTING_MOVE') {
            const route = window.walkableTiles.find(n => n.x === Math.round(data.x) && n.z === Math.round(data.z));
            if (route) {
                window.clearHighlights(); window.gameState = 'CONFIRMING'; window.confirmMode = 'MOVE'; window.pendingData = route.path; window.selectedTileKey = `${route.x},${route.z}`;
                const tile = window.tilesMeshMap[window.selectedTileKey];
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
    u.sprite.position.set((u.x * window.TILE_SIZE) - offsetX, (u.h * window.H_STEP) + (window.TILE_SIZE * 0.5), (u.z * window.TILE_SIZE) - offsetZ);
}
window.centerCameraInstantly = function(u) {
    const rad = 45 * (Math.PI / 180); const r = 800;
    controls.target.copy(u.sprite.position);
    camera.position.set(u.sprite.position.x + Math.sin(rad)*r, u.sprite.position.y + 600, u.sprite.position.z + Math.cos(rad)*r);
    camera.lookAt(controls.target);
}
window.rotateCam = function(deg) {
    if (window.gameState === 'ANIMATING') return;
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
function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); }
