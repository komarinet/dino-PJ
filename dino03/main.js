let scene, camera, renderer, controls;
window.gameState = 'INIT'; 
window.walkableTiles = []; window.attackableTiles = [];
window.pendingData = null; window.selectedTileKey = null; window.confirmMode = '';
window.raycastTargets = []; window.talkIndex = 0;

// ★新規：会話データ (ルビ付き、キャラ画像)★
window.eventTalkData = [
    { unit: window.player, text: "<ruby>探<rt>さが</rt></ruby>したぞッ！　お<ruby>前<rt>まえ</rt></ruby>がお<ruby>母<rt>かあ</rt></ruby>さんをさらったのか！" },
    { unit: window.enemy,  text: "グォォォォォォ！" },
    { unit: window.player, text: "お<ruby>母<rt>かあ</rt></ruby>さんを、<ruby>返<rt>かえ</rt></ruby>せぇッ！" }
];

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
    document.getElementById('status-ui').style.display = 'none';
    document.getElementById('detail-ui').style.display = 'none';
    document.getElementById('command-ui').style.display = 'none';
    document.getElementById('confirm-ui').style.display = 'none';
    document.getElementById('target-ui').style.display = 'none';
}

window.showStatus = function(unit) {
    window.setMsg("");
    document.getElementById('status-ui').style.display = 'block';
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
}

window.startPlayerTurn = function() {
    window.gameState = 'IDLE'; window.clearHighlights(); window.hideAllUI();
    window.setMsg("あなたの<ruby>順番<rt>ターン</rt></ruby>！<br><ruby>ユニット<rt>仲間</rt></ruby>をタップしてね", "#00ff00");
}

window.resetToIdle = function() {
    window.gameState = 'IDLE'; window.clearHighlights(); window.hideAllUI();
    window.setMsg(""); 
}

// ★新規：会話イベントモード★
window.startEventMode = function() {
    window.gameState = 'TALKING';
    window.clearHighlights(); window.hideAllUI();
    window.setMsg(""); 
    document.getElementById('event-ui').style.display = 'block';
    window.talkIndex = 0;
    renderTalk();
}

function renderTalk() {
    const data = window.eventTalkData[window.talkIndex];
    document.getElementById('ev-portrait').innerText = data.unit.emoji;
    document.getElementById('ev-name-plate').innerText = `${data.unit.emoji} ${data.unit.id}`;
    document.getElementById('ev-text').innerHTML = data.text;
    
    // TO風：話しているユニットにカメラを寄せる
    const targetPos = data.unit.sprite.position.clone();
    targetPos.y += 100;
    gsap.to(controls.target, { x: targetPos.x, y: targetPos.y, z: targetPos.z, duration: 0.5 });
    gsap.to(camera.position, { x: targetPos.x + 300, y: targetPos.y + 200, z: targetPos.z + 300, duration: 0.5 });
}

function nextTalk() {
    window.talkIndex++;
    if (window.talkIndex < window.eventTalkData.length) {
        renderTalk();
    } else {
        // 会話終了、BATTLE STARTへ
        document.getElementById('event-ui').style.display = 'none';
        playBattleStart();
    }
}

// ★新規：BATTLE START演出★
function playBattleStart() {
    window.setMsg("BATTLE START！", "#ffcc00");
    const container = document.getElementById('canvas-container');
    container.style.boxShadow = "inset 0 0 100px #ff0000";
    gsap.to(container, { boxShadow: "inset 0 0 0px #ff0000", duration: 1.0, onComplete: () => {
        window.startPlayerTurn();
    }});
}

window.execCommand = function(cmd) {
    document.getElementById('command-ui').style.display = 'none';
    if(cmd === 'move') {
        window.gameState = 'SELECTING_MOVE'; 
        window.walkableTiles = window.getWalkableNodes(window.player);
        window.walkableTiles.forEach(node => { window.tilesMeshMap[`${node.x},${node.z}`].material[2].color.setHex(0x55ff55); });
    } else if (cmd === 'attack') {
        let targets = window.getAttackableEnemies(window.player);
        if(targets.length === 0) {
            window.setMsg("<ruby>攻撃<rt>こうげき</rt></ruby>できる<ruby>対象<rt>あいて</rt></ruby>がいません！", "#aaaaaa");
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
        document.getElementById('target-ui').style.display = 'block';
    } else if (cmd === 'wait') {
        window.gameState = 'CONFIRMING'; window.confirmMode = 'WAIT';
        document.getElementById('confirm-text').innerHTML = "<ruby>順番<rt>ターン</rt></ruby>を<ruby>終了<rt>しゅうりょう</rt></ruby>しますか？";
        document.querySelector('#confirm-ui .btn-yes').onclick = () => window.answerConfirm(true); 
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
            window.executeAttack(window.player, window.pendingData, true, () => { window.endPlayerTurn(); });
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

window.executeAttack = function(attacker, defender, allowCounter, onComplete) {
    const offsetX = (window.MAP_W * window.TILE_SIZE) / 2; const offsetZ = (window.MAP_D * window.TILE_SIZE) / 2;
    const dx = ((defender.x * window.TILE_SIZE) - offsetX) - attacker.sprite.position.x;
    const dz = ((defender.z * window.TILE_SIZE) - offsetZ) - attacker.sprite.position.z;
    const damage = Math.max(1, attacker.str - defender.def);
    const origX = attacker.sprite.position.x; const origZ = attacker.sprite.position.z;

    const tl = gsap.timeline({ onComplete: () => {
        defender.hp -= damage;
        window.showFloatingText(defender, damage, 'damage');
        if(defender.hp <= 0) {
            window.setMsg(`${defender.id}を倒した！`, "#ffcc00");
            gsap.to(defender.sprite.scale, {x:0, y:0, duration:0.5, onComplete});
        } else {
            const dist = Math.abs(attacker.x - defender.x) + Math.abs(attacker.z - defender.z);
            if(allowCounter && dist === 1) {
                setTimeout(() => { window.setMsg("COUNTER!", "#ff0000"); window.executeAttack(defender, attacker, false, onComplete); }, 800);
            } else { onComplete(); }
        }
    }});
    tl.to(attacker.sprite.position, { x: origX - dx*0.2, z: origZ - dz*0.2, duration: 0.15, ease: "power1.out" }); 
    tl.to(attacker.sprite.position, { x: origX + dx*0.6, z: origZ + dz*0.6, duration: 0.1, ease: "power2.in" });  
    tl.to(attacker.sprite.position, { x: origX, z: origZ, duration: 0.2, ease: "power2.out" }); 
}

window.endPlayerTurn = function() {
    window.player.hasMoved = false; window.player.hasAttacked = false; window.hideAllUI();
    if(window.enemy.hp <= 0) return;
    window.gameState = 'ENEMY_TURN'; window.setMsg("<ruby>敵<rt>てき</rt></ruby>の<ruby>順番<rt>ターン</rt></ruby>...", "#ff5555");
    setTimeout(() => {
        let routes = window.getWalkableNodes(window.enemy);
        let bestRoute = null; let minD = 999;
        routes.forEach(r => { let d = Math.abs(r.x - window.player.x) + Math.abs(r.z - window.player.z); if(d < minD) { minD = d; bestRoute = r; } });
        if(bestRoute && bestRoute.path.length > 0) {
            window.executeMovement(window.enemy, bestRoute.path, () => {
                if(window.getAttackableEnemies(window.enemy).includes(window.player)) { window.executeAttack(window.enemy, window.player, true, () => { window.startPlayerTurn(); }); } else { window.startPlayerTurn(); }
            });
        } else { window.startPlayerTurn(); }
    }, 1000);
}

function init(sheetImg) {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene(); window.generateMapData();
    const w = container.clientWidth; const h = container.clientHeight;
    camera = new THREE.OrthographicCamera(-w, w, h, -h, 1, 4000);
    camera.zoom = 1.5; camera.updateProjectionMatrix();
    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(w, h); renderer.setClearColor(0x1a1a1a);
    container.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    window.buildMapMeshes(scene, sheetImg);
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(window.TILE_SIZE, window.H_STEP, window.TILE_SIZE));
    const mat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    window.selectorMesh = new THREE.LineSegments(geo, mat); window.selectorMesh.visible = false; scene.add(window.selectorMesh);
    window.raycastTargets = [...window.interactableTiles]; 
    window.units.forEach(u => {
        const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d'); ctx.font = '90px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(u.emoji, 64, 64);
        u.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }));
        u.sprite.scale.set(window.TILE_SIZE * 1.5, window.TILE_SIZE * 1.5, 1);
        u.sprite.userData = { isUnit: true, unit: u }; window.raycastTargets.push(u.sprite);
        scene.add(u.sprite); window.updateUnitPosInstantly(u);
    });
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true; controls.enableZoom = true; controls.enablePan = true;
    controls.maxPolarAngle = Math.PI / 2.2; controls.minPolarAngle = Math.PI / 6;
    controls.addEventListener('end', snapCameraAzimuth);
    window.centerCameraInstantly(window.player); 
    let ptrDownPos = {x:0, y:0};
    renderer.domElement.addEventListener('pointerdown', e => { ptrDownPos = { x: e.clientX, y: e.clientY }; });
    renderer.domElement.addEventListener('pointerup', e => {
        const dist = Math.hypot(e.clientX - ptrDownPos.x, e.clientY - ptrDownPos.y);
        if(dist < 5) onPointerClick(e);
    });
    
    // ★バトル開始前の会話イベントを開始★
    window.startEventMode();
    
    animate();
}

function snapCameraAzimuth() {
    if (window.gameState === 'MOVING' || window.gameState === 'ANIMATING' || window.gameState === 'TALKING') return;
    const az = controls.getAzimuthalAngle(); const snap = Math.PI / 2; const offset = Math.PI / 4;
    const snappedAz = Math.round((az - offset) / snap) * snap + offset;
    const polar = Math.PI / 3; const r = controls.getDistance();
    gsap.to(camera.position, { x: controls.target.x + r * Math.sin(snappedAz) * Math.sin(polar), y: controls.target.y + r * Math.cos(polar), z: controls.target.z + r * Math.cos(snappedAz) * Math.sin(polar), duration: 0.3, ease: "power2.out", onUpdate: () => controls.update() });
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
    
    // ★会話モード中は画面のどこをタップしても進む★
    if (window.gameState === 'TALKING') {
        nextTalk();
        return;
    }

    const mouse = new THREE.Vector2((event.clientX/window.innerWidth)*2-1, -(event.clientY/window.innerHeight)*2+1);
    const raycaster = new THREE.Raycaster(); raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(window.raycastTargets);
    if (intersects.length > 0) {
        let data = intersects[0].object.userData;
        if(data.isUnit) data = { x: data.unit.x, z: data.unit.z, h: data.unit.h };
        if(window.gameState === 'IDLE') {
            const u = window.getUnitAt(data.x, data.z);
            if(u) { window.showStatus(u); if(u.isPlayer) window.showCommandMenu(); } else { window.resetToIdle(); }
        } 
        else if (window.gameState === 'SELECTING_MOVE') {
            const route = window.walkableTiles.find(n => n.x === data.x && n.z === data.z);
            if (route) {
                window.clearHighlights(); window.gameState = 'CONFIRMING'; window.confirmMode = 'MOVE'; window.pendingData = route.path; window.selectedTileKey = `${data.x},${data.z}`;
                const tile = window.tilesMeshMap[window.selectedTileKey];
                tile.material[2].color.setHex(0xffff00); window.selectorMesh.position.copy(tile.position); window.selectorMesh.visible = true;
                document.getElementById('confirm-text').innerHTML = "ここへ<ruby>移動<rt>いどう</rt></ruby>しますか？";
                document.querySelector('#confirm-ui .btn-yes').onclick = () => window.answerConfirm(true); 
                document.getElementById('confirm-ui').style.display = 'block';
            } else { window.resetToIdle(); } 
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
window.centerCamera = function() { gsap.to(controls.target, { x: window.player.sprite.position.x, z: window.player.sprite.position.z, duration: 0.8 }); }
window.rotateCam = function(deg) {
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
