export const VERSION = "8.15.0";
export class UIControl {
    constructor(cameraControl) { this.cameraControl = cameraControl; }
    setMsg(txt, color = "#ffffff") {
        const el = document.getElementById('msg-ui');
        if(!txt) el.style.display = 'none'; else { el.style.display = 'block'; el.innerHTML = txt; el.style.color = color; }
    }
    hideAll() { ['status-ui', 'detail-ui', 'command-ui', 'confirm-ui', 'target-ui', 'event-ui'].forEach(id => { const el = document.getElementById(id); if(el) el.style.display = 'none'; }); }
    showStatus(unit) {
        this.setMsg(""); document.getElementById('status-ui').style.display = 'block';
        document.getElementById('st-name').innerText = unit.id; document.getElementById('st-lv').innerText = unit.level;
        document.getElementById('st-hp').innerText = `${unit.hp}/${unit.maxHp}`;
        document.getElementById('st-hp-bar').style.width = `${(unit.hp/unit.maxHp)*100}%`;
    }
    renderTalkLine(data, units, player) {
        const portrait = document.getElementById('ev-portrait');
        document.getElementById('ev-name-plate').innerText = data.name; document.getElementById('ev-text').innerHTML = data.text;
        const speaker = units.find(u => u.id === data.name);
        if (speaker && speaker.spriteConfig) {
            const conf = speaker.spriteConfig;
            if (conf.type === 'bra') portrait.innerHTML = `<div style="width:85px;height:60px;background:url('img/bra.png') 0 100% / 100% 500% no-repeat;image-rendering:pixelated;"></div>`;
            else if (conf.type === 'rex') portrait.innerHTML = `<div style="width:85px;height:60px;background:url('img/tactyrano01.png') 100% 100% / 400% 400% no-repeat;image-rendering:pixelated;"></div>`;
            else if (conf.type === 'comp') portrait.innerHTML = `<div style="width:85px;height:60px;background:url('img/comp.png') 100% 100% / 300% 200% no-repeat;image-rendering:pixelated;"></div>`;
        }
        if(speaker && speaker.hp > 0) {
            this.cameraControl.centerOn(speaker.sprite.position, 0.8);
            if (speaker !== player) { speaker.lookAtNode(player.x, player.z); player.lookAtNode(speaker.x, speaker.z); }
        }
    }
    showFloatingText(unit, text, type, camera) {
        const vector = unit.sprite.position.clone(); vector.y += unit.sprite.scale.y + 10; vector.project(camera);
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth, y = (vector.y * -0.5 + 0.5) * window.innerHeight;
        const el = document.createElement('div'); el.className = 'floating-text'; el.innerText = text;
        el.style.color = (type === 'heal') ? '#00ffff' : (type === 'levelup' ? '#ffff00' : '#ffffff');
        el.style.left = `${x}px`; el.style.top = `${y}px`; document.body.appendChild(el);
        gsap.to(el, { y: y - 100, opacity: 0, duration: 1.5, onComplete: () => el.remove() });
    }
}
