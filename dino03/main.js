let scene, camera, renderer, controls;
let walkableTiles = []; let attackableTiles = [];
let gameState = 'IDLE'; 
let currentUnit = null; 
let pendingData = null; let selectedTileKey = null;

const sheetImg = new Image();
sheetImg.src = 'img/plate01.png';
sheetImg.onload = init;

// --- UI制御 ---
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
}
window.showStatus = function(unit) {
    setMsg(""); currentUnit = unit;
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
    document.getElementById('cmd-move').disabled = player.hasMoved;
    document.getElementById('cmd-attack').disabled = player.hasAttacked;
}
window.resetToIdle = function() {
    gameState = 'IDLE'; clearHighlights(); hideAllUI();
    setMsg("ユニットをタップ", "#ffffff");
    if(player.hasMoved && player.hasAttacked) endPlayerTurn();
}

window.execCommand = function(cmd) {
    document.getElementById('command-ui').style.display = 'none';
    if(cmd === 'move') {
        gameState = 'SELECTING_MOVE'; setMsg("移動先を選んでね", "#00ff00");
        walkableTiles = getWalkableNodes(player);
        walkableTiles.forEach(node => { tilesMeshMap[`${node.x},${node.z}`].material[2].color.setHex(0x55ff55); });
    } else if (cmd === 'attack') {
        gameState = 'SELECTING_ATTACK'; setMsg("攻撃する敵を選んでね", "#ff5555");
        attackableTiles = getAttackableEnemies(player);
        if(attackableTiles.length === 0) {
            setMsg("届く範囲に敵がいない！", "#aaaaaa"); setTimeout(() => { resetToIdle(); }, 1000); return;
        }
        attackableTiles.forEach(u => { tilesMeshMap[`${u.x},${u.z}`].material[2].color.setHex(0xff5555); });
    } else if (cmd === 'wait') {
        player.hasMoved = true; player.hasAttacked = true; endPlayerTurn();
    }
}

// --- 初期化・Three.js ---
function init() {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene(); generateMapData();

    const w = container.clientWidth; const h = container.clientHeight;
    camera = new THREE.OrthographicCamera(-w, w, h, -h, 1, 4000);
    camera.zoom = 1.5; camera.updateProjectionMatrix();
    
    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(w, h); renderer.setClearColor(0x1a1a1a);
    container.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    buildMapMeshes(scene, sheetImg);

    units.forEach(u => {
        const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d'); ctx.font = '90px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(u.emoji, 64, 64);
        u.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }));
        u.sprite.scale.set(TILE_SIZE * 1.5, TILE_SIZE * 1.5, 1);
        scene.add(u.sprite);
        updateUnitPosInstantly(u);
    });

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true; controls.enableZoom = true; controls.enablePan = true;
    controls.maxPolarAngle = Math.PI / 2.2; controls.minPolarAngle = Math.PI / 6;

    centerCameraInstantly(player); 
    
    let ptrDownPos = {x:0, y:0};
    renderer.domElement.addEventListener('pointerdown', e => { ptrDownPos = { x: e.clientX, y: e.clientY }; });
    renderer.domElement.addEventListener('pointerup', e => {
        const dist = Math.hypot(e.clientX - ptrDownPos.x, e.clientY - ptrDownPos.y);
        if(dist < 5) onPointerClick(e);
    });

    resetToIdle();
    animate();
}

function clearHighlights() { interactableTiles.forEach(t => t.material[2].color.setHex(0xffffff)); }

const raycaster = new THREE.Raycaster(); const mouse = new THREE.Vector2();

function onPointerClick(event) {
    if (gameState === 'ANIMATING' || gameState === 'ENEMY_TURN') return;
    
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1; mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(interactableTiles);
    if (intersects.length > 0) {
        const target = intersects[0].object.userData;
        
        if(gameState === 'IDLE') {
            const u = getUnitAt(target.x, target.z);
            if(u) { showStatus(u); if(u.isPlayer) showCommandMenu(); } 
            else { resetToIdle(); }
        } 
        else if (gameState === 'SELECTING_MOVE') {
            const route = walkableTiles.find(n => n.x === target.x && n.z === target.z);
            if (route) {
                gameState = 'CONFIRMING'; window.confirmMode = 'MOVE'; pendingData = route.path; selectedTileKey = `${target.x},${target.z}`;
                tilesMeshMap[selectedTileKey].material[2].color.setHex(0xffff00);
                document.getElementById('confirm-text').innerHTML = "ここへ移動しますか？";
                document.getElementById('confirm-ui').style.display = 'block';
            } else { resetToIdle(); } 
        } 
        else if (gameState === 'SELECTING_ATTACK') {
            const enemyUnit = attackableTiles.find(u => u.x === target.x && u.z === target.z);
            if(enemyUnit) {
                gameState = 'CONFIRMING'; window.confirmMode = 'ATTACK'; pendingData = enemyUnit; selectedTileKey = `${target.x},${target.z}`;
                tilesMeshMap[selectedTileKey].material[2].color.setHex(0xffff00);
                document.getElementById('confirm-text').innerHTML = "攻撃しますか？";
                document.getElementById('confirm-ui').style.display = 'block';
            } else { resetToIdle(); }
        }
    }
}

window.answerConfirm = function(isYes) {
    document.getElementById('confirm-ui').style.display = 'none';
    if (isYes) {
        gameState = 'ANIMATING'; clearHighlights(); setMsg("");
        if(window.confirmMode === 'MOVE') {
            player.hasMoved = true;
            executeMovement(player, pendingData, () => { resetToIdle(); showStatus(player); showCommandMenu(); });
        } else if(window.confirmMode === 'ATTACK') {
            player.hasAttacked = true;
            executeAttack(player, pendingData, () => { resetToIdle(); });
        }
    } else { resetToIdle(); }
    pendingData = null; selectedTileKey = null;
}

// --- アニメーション・ロジック ---
function executeMovement(unit, path, onComplete) {
    const offsetX = (MAP_W * TILE_SIZE) / 2; const offsetZ = (MAP_D * TILE_SIZE) / 2;
    const tl = gsap.timeline({ onComplete });
    path.forEach(step => {
        const tX = (step.x * TILE_SIZE) - offsetX; const tZ = (step.z * TILE_SIZE) - offsetZ;
        const tY = (step.h * H_STEP) + (TILE_SIZE * 0.5);
        tl.to(unit.sprite.position, { x: tX, z: tZ, duration: 0.25, ease: "power1.inOut" }, "+=0");
        tl.to(unit.sprite.position, { y: Math.max(unit.sprite.position.y, tY) + 30, duration: 0.125, ease: "power1.out", yoyo: true, repeat: 1 }, "<");
        tl.set(unit.sprite.position, { y: tY });
    });
    const finalStep = path[path.length - 1];
    unit.x = finalStep.x; unit.z = finalStep.z; unit.h = finalStep.h;
}

function executeAttack(attacker, defender, onComplete) {
    const offsetX = (MAP_W * TILE_SIZE) / 2; const offsetZ = (MAP_D * TILE_SIZE) / 2;
    const dx = ((defender.x * TILE_SIZE) - offsetX) - attacker.sprite.position.x;
    const dz = ((defender.z * TILE_SIZE) - offsetZ) - attacker.sprite.position.z;
    const damage = Math.max(1, attacker.str - defender.def);
    
    const tl = gsap.timeline({ onComplete: () => {
        defender.hp -= damage;
        if(defender.hp <= 0) {
            setMsg(`${defender.id}を倒した！`, "#ffcc00");
            gsap.to(defender.sprite.scale, {x:0, y:0, duration:0.5, onComplete});
        } else { onComplete(); }
    }});
    tl.to(attacker.sprite.position, { x: attacker.sprite.position.x + dx*0.5, z: attacker.sprite.position.z + dz*0.5, duration: 0.1, ease: "power2.in" });
    tl.to(attacker.sprite.position, { x: attacker.sprite.position.x - dx*0.5, z: attacker.sprite.position.z - dz*0.5, duration: 0.2, ease: "power2.out" });
}

function endPlayerTurn() {
    player.hasMoved = false; player.hasAttacked = false; hideAllUI();
    if(enemy.hp <= 0) { setMsg("STAGE CLEAR!", "#ffff00"); return; }

    gameState = 'ENEMY_TURN'; setMsg("敵のターン...", "#ff5555");
    setTimeout(() => {
        let routes = getWalkableNodes(enemy);
        let bestRoute = null; let minD = 999;
        routes.forEach(r => {
            let d = Math.abs(r.x - player.x) + Math.abs(r.z - player.z);
            if(d < minD) { minD = d; bestRoute = r; }
        });
        if(bestRoute && bestRoute.path.length > 0) {
            executeMovement(enemy, bestRoute.path, () => {
                if(getAttackableEnemies(enemy).includes(player)) { executeAttack(enemy, player, () => { resetToIdle(); }); } else { resetToIdle(); }
            });
        } else { resetToIdle(); }
    }, 1000);
}

function updateUnitPosInstantly(u) {
    const offsetX = (MAP_W * TILE_SIZE) / 2; const offsetZ = (MAP_D * TILE_SIZE) / 2;
    u.sprite.position.set((u.x * TILE_SIZE) - offsetX, (u.h * H_STEP) + (TILE_SIZE * 0.5), (u.z * TILE_SIZE) - offsetZ);
}
function centerCameraInstantly(u) {
    const rad = 45 * (Math.PI / 180); const r = 800;
    controls.target.copy(u.sprite.position);
    camera.position.set(u.sprite.position.x + Math.sin(rad)*r, u.sprite.position.y + 600, u.sprite.position.z + Math.cos(rad)*r);
    camera.lookAt(controls.target);
}

// UIボタンからの呼び出し用
window.centerCamera = function() { gsap.to(controls.target, { x: player.sprite.position.x, z: player.sprite.position.z, duration: 0.8, ease: "power2.inOut" }); }
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
