let scene, camera, renderer, controls;
window.gameState = 'IDLE'; 
window.walkableTiles = []; window.attackableTiles = [];
window.pendingData = null; window.selectedTileKey = null; window.confirmMode = '';

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
    // 移動済みの場合はボタンを非表示にする（TO仕様）
    document.getElementById('cmd-move').style.display = window.player.hasMoved ? 'none' : 'block';
}
window.resetToIdle = function() {
    window.gameState = 'IDLE'; window.clearHighlights(); window.hideAllUI();
    window.setMsg(""); // 待機中はメッセージも消す
}

// ★TO戦闘フロー完全再現：コマンド実行★
window.execCommand = function(cmd) {
    document.getElementById('command-ui').style.display = 'none';
    
    if(cmd === 'move') {
        // 【移動】ウィンドウが消え、移動可能範囲が色で示される
        window.gameState = 'SELECTING_MOVE'; 
        window.walkableTiles = window.getWalkableNodes(window.player);
        window.walkableTiles.forEach(node => { window.tilesMeshMap[`${node.x},${node.z}`].material[2].color.setHex(0x55ff55); });
    
    } else if (cmd === 'attack') {
        // 【攻撃】対象がいない時はメッセージを出し、ターン消費せずメニューへ戻る
        let targets = window.getAttackableEnemies(window.player);
        if(targets.length === 0) {
            window.setMsg("攻撃できる対象がいません！", "#aaaaaa");
            setTimeout(() => { window.setMsg(""); window.showCommandMenu(); }, 1200);
            return;
        }
        // 対象がいる場合、選択ウィンドウを出す
        window.gameState = 'SELECTING_ATTACK_TARGET';
        const listDiv = document.getElementById('target-list');
        listDiv.innerHTML = ''; // リスト初期化
        targets.forEach(t => {
            const btn = document.createElement('button');
            btn.className = 'cmd-btn';
            btn.innerHTML = `${t.emoji} ${t.id} (HP: ${t.hp})`;
            btn.onclick = () => window.selectTarget(t);
            listDiv.appendChild(btn);
            window.tilesMeshMap[`${t.x},${t.z}`].material[2].color.setHex(0xff5555); // 赤く光らせる
        });
        document.getElementById('target-ui').style.display = 'block';
    
    } else if (cmd === 'wait') {
        // 【待機】「ターンを終了しますか」の確認ダイアログ
        window.gameState = 'CONFIRMING'; window.confirmMode = 'WAIT';
        document.getElementById('confirm-text').innerHTML = "ターンを終了しますか？";
        document.getElementById('confirm-ui').style.display = 'block';
    }
}

// 攻撃目標をリストから選んだ時
window.selectTarget = function(targetUnit) {
    document.getElementById('target-ui').style.display = 'none';
    window.gameState = 'CONFIRMING'; window.confirmMode = 'ATTACK'; window.pendingData = targetUnit;
    document.getElementById('confirm-text').innerHTML = `${targetUnit.id} を攻撃しますか？`;
    document.getElementById('confirm-ui').style.display = 'block';
}

window.cancelAttack = function() {
    document.getElementById('target-ui').style.display = 'none';
    window.clearHighlights();
    window.showCommandMenu();
}

window.answerConfirm = function(isYes) {
    document.getElementById('confirm-ui').style.display = 'none';
    
    if (isYes) {
        window.gameState = 'ANIMATING'; window.clearHighlights(); window.setMsg("");
        
        if(window.confirmMode === 'WAIT') {
            window.endPlayerTurn();
        } 
        else if(window.confirmMode === 'MOVE') {
            window.player.hasMoved = true;
            // 移動後はコマンドメニューを開き直す（移動ボタンは消える）
            window.executeMovement(window.player, window.pendingData, () => { 
                window.resetToIdle(); window.showStatus(window.player); window.showCommandMenu(); 
            });
        } 
        else if(window.confirmMode === 'ATTACK') {
            window.player.hasAttacked = true;
            // 攻撃後はターン終了
            window.executeAttack(window.player, window.pendingData, () => { window.endPlayerTurn(); });
        }
    } else {
        // 「いいえ」を選んだ時の戻り先を厳密に管理
        if(window.confirmMode === 'MOVE') {
            window.gameState = 'SELECTING_MOVE';
            window.tilesMeshMap[window.selectedTileKey].material[2].color.setHex(0x55ff55); // 黄色から緑に戻す
        } else if(window.confirmMode === 'ATTACK') {
            window.gameState = 'SELECTING_ATTACK_TARGET';
            document.getElementById('target-ui').style.display = 'block';
        } else if(window.confirmMode === 'WAIT') {
            window.showCommandMenu();
        }
    }
    if(!isYes) { window.pendingData = null; window.selectedTileKey = null; }
}

// --- アニメーション ---
window.executeMovement = function(unit, path, onComplete) {
    const offsetX = (window.MAP_W * window.TILE_SIZE) / 2; const offsetZ = (window.MAP_D * window.TILE_SIZE) / 2;
    const tl = gsap.timeline({ onComplete });
    path.forEach(step => {
        const tX = (step.x * window.TILE_SIZE) - offsetX; const tZ = (step.z * window.TILE_SIZE) - offsetZ;
        const tY = (step.h * window.H_STEP) + (window.TILE_SIZE * 0.5);
        tl.to(unit.sprite.position, { x: tX, z: tZ, duration: 0.25, ease: "power1.inOut" }, "+=0");
        tl.to(unit.sprite.position, { y: Math.max(unit.sprite.position.y, tY) + 30, duration: 0.125, ease: "power1.out", yoyo: true, repeat: 1 }, "<");
        tl.set(unit.sprite.position, { y: tY });
    });
    const finalStep = path[path.length - 1];
    unit.x = finalStep.x; unit.z = finalStep.z; unit.h = finalStep.h;
}

window.executeAttack = function(attacker, defender, onComplete) {
    const offsetX = (window.MAP_W * window.TILE_SIZE) / 2; const offsetZ = (window.MAP_D * window.TILE_SIZE) / 2;
    const dx = ((defender.x * window.TILE_SIZE) - offsetX) - attacker.sprite.position.x;
    const dz = ((defender.z * window.TILE_SIZE) - offsetZ) - attacker.sprite.position.z;
    const damage = Math.max(1, attacker.str - defender.def);
    
    const tl = gsap.timeline({ onComplete: () => {
        defender.hp -= damage;
        if(defender.hp <= 0) {
            window.setMsg(`${defender.id}を倒した！`, "#ffcc00");
            gsap.to(defender.sprite.scale, {x:0, y:0, duration:0.5, onComplete});
        } else { onComplete(); }
    }});
    tl.to(attacker.sprite.position, { x: attacker.sprite.position.x + dx*0.5, z: attacker.sprite.position.z + dz*0.5, duration: 0.1, ease: "power2.in" });
    tl.to(attacker.sprite.position, { x: attacker.sprite.position.x - dx*0.5, z: attacker.sprite.position.z - dz*0.5, duration: 0.2, ease: "power2.out" });
}

window.endPlayerTurn = function() {
    window.player.hasMoved = false; window.player.hasAttacked = false; window.hideAllUI();
    if(window.enemy.hp <= 0) { window.setMsg("STAGE CLEAR!", "#ffff00"); return; }

    window.gameState = 'ENEMY_TURN'; window.setMsg("敵のターン...", "#ff5555");
    setTimeout(() => {
        let routes = window.getWalkableNodes(window.enemy);
        let bestRoute = null; let minD = 999;
        routes.forEach(r => {
            let d = Math.abs(r.x - window.player.x) + Math.abs(r.z - window.player.z);
            if(d < minD) { minD = d; bestRoute = r; }
        });
        if(bestRoute && bestRoute.path.length > 0) {
            window.executeMovement(window.enemy, bestRoute.path, () => {
                if(window.getAttackableEnemies(window.enemy).includes(window.player)) { 
                    window.executeAttack(window.enemy, window.player, () => { window.resetToIdle(); }); 
                } else { window.resetToIdle(); }
            });
        } else { window.resetToIdle(); }
    }, 1000);
}

// --- 初期化 ---
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

    window.units.forEach(u => {
        const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d'); ctx.font = '90px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(u.emoji, 64, 64);
        u.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }));
        u.sprite.scale.set(window.TILE_SIZE * 1.5, window.TILE_SIZE * 1.5, 1);
        scene.add(u.sprite);
        window.updateUnitPosInstantly(u);
    });

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true; controls.enableZoom = true; controls.enablePan = true;
    controls.maxPolarAngle = Math.PI / 2.2; controls.minPolarAngle = Math.PI / 6;

    controls.addEventListener('end', () => {
        if (window.gameState === 'MOVING' || window.gameState === 'ANIMATING') return;
        const az = controls.getAzimuthalAngle();
        const snap = Math.PI / 2; const offset = Math.PI / 4;
        const snappedAz = Math.round((az - offset) / snap) * snap + offset;
        const polar = Math.PI / 3; const r = controls.getDistance();
        gsap.to(camera.position, {
            x: controls.target.x + r * Math.sin(snappedAz) * Math.sin(polar),
            y: controls.target.y + r * Math.cos(polar),
            z: controls.target.z + r * Math.cos(snappedAz) * Math.sin(polar),
            duration: 0.3, ease: "power2.out", onUpdate: () => controls.update()
        });
    });

    window.centerCameraInstantly(window.player); 
    
    let ptrDownPos = {x:0, y:0};
    renderer.domElement.addEventListener('pointerdown', e => { ptrDownPos = { x: e.clientX, y: e.clientY }; });
    renderer.domElement.addEventListener('pointerup', e => {
        const dist = Math.hypot(e.clientX - ptrDownPos.x, e.clientY - ptrDownPos.y);
        if(dist < 5) onPointerClick(e);
    });

    window.resetToIdle();
    animate();
}

window.clearHighlights = function() { window.interactableTiles.forEach(t => t.material[2].color.setHex(0xffffff)); }
const raycaster = new THREE.Raycaster(); const mouse = new THREE.Vector2();

function onPointerClick(event) {
    if (window.gameState === 'ANIMATING' || window.gameState === 'ENEMY_TURN') return;
    
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1; mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(window.interactableTiles);
    if (intersects.length > 0) {
        const target = intersects[0].object.userData;
        
        if(window.gameState === 'IDLE') {
            const u = window.getUnitAt(target.x, target.z);
            if(u) { window.showStatus(u); if(u.isPlayer) window.showCommandMenu(); } 
            else { window.resetToIdle(); }
        } 
        else if (window.gameState === 'SELECTING_MOVE') {
            const route = window.walkableTiles.find(n => n.x === target.x && n.z === target.z);
            if (route) {
                // タップするとその一コマだけ光る（他の緑は消す）
                window.clearHighlights();
                window.gameState = 'CONFIRMING'; window.confirmMode = 'MOVE'; window.pendingData = route.path; window.selectedTileKey = `${target.x},${target.z}`;
                window.tilesMeshMap[window.selectedTileKey].material[2].color.setHex(0xffff00);
                document.getElementById('confirm-text').innerHTML = "ここへ移動しますか？";
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
window.centerCamera = function() { gsap.to(controls.target, { x: window.player.sprite.position.x, z: window.player.sprite.position.z, duration: 0.8, ease: "power2.inOut" }); }
window.rotateCam = function(deg) {
    const az = controls.getAzimuthalAngle(); const newAz = az + (deg * Math.PI / 180);
    const r = controls.getDistance(); const polar = controls.getPolarAngle();
    gsap.to(camera.position, { x: controls.target.x + r * Math.sin(newAz) * Math.sin(polar), z: controls.target.z + r * Math.cos(newAz) * Math.sin(polar), duration: 0.4, onUpdate: () => controls.update() });
}
window.panCamera = function(dx, dy) {
    const panAmount = 150; const angle = controls.getAzimuthalAngle();
    const s = Math.sin(angle); const c = Math.cos(angle);
    const moveX = (dx * c + dy * s) * panAmount; const moveZ = (-dx * s + dy * c) * panAmount;
    gsap.to(camera.position, { x: camera.position.x + moveX, z: camera.position.z + moveZ, duration: 0.3 });
    gsap.to(controls.target, { x: controls.target.x + moveX, z: controls.target.z + moveZ, duration: 0.3 });
}
window.zoomCamera = function(amount) { camera.zoom = Math.max(0.5, camera.zoom + (amount > 0 ? -0.2 : 0.2)); camera.updateProjectionMatrix(); }

function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); }
