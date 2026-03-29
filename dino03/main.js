// CYBER-SWEEP v5.6 | main.js
const MainController = {
    themes: {
        1: { blue: '#00f3ff', pink: '#ff00ff', name: "ALPHA SECTOR" },
        2: { blue: '#00ff41', pink: '#00ccff', name: "NEO-SHIBUYA" },
        3: { blue: '#ffff00', pink: '#ff0000', name: "VOID ZONE" },
        4: { blue: '#ff00ff', pink: '#ffffff', name: "GHOST NETWORK" },
        5: { blue: '#ff3300', pink: '#ff00ff', name: "CORE SERVER" }
    },

    init() {
        document.getElementById('start-btn').onclick = () => this.handleStart();
        document.getElementById('skip-prologue-btn').onclick = () => this.showScene('scene-select');
        document.getElementById('scan-btn').onclick = () => this.toggleScan();
        document.getElementById('flag-mode-btn').onclick = () => this.toggleFlag();
        document.getElementById('back-to-menu-btn').onclick = () => this.showScene('scene-select');
        document.getElementById('audio-toggle-btn').onclick = () => this.toggleAudio();
        this.createStageSelect();
    },

    async handleStart() {
        const btn = document.getElementById('start-btn');
        btn.disabled = true; btn.innerText = "LOADING ASSETS...";
        try {
            await this.preload(['img/ship.png', 'img/space02.png', 'img/bomb.png']);
            this.startPrologue();
        } catch(e) { 
            this.showScene('scene-select'); 
        } finally { 
            btn.disabled = false; btn.innerText = "INITIALIZE CONNECTION"; 
        }
    },

    async preload(urls) {
        const ps = urls.map(u => new Promise((res, rej) => {
            const i = new Image(); i.src = u;
            i.onload = () => i.decode ? i.decode().then(res) : res();
            i.onerror = rej;
        }));
        return Promise.all(ps);
    },

    showScene(id) {
        document.querySelectorAll('.scene').forEach(s => s.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
    },

    startPrologue() {
        SoundEngine.init();
        this.showScene('scene-prologue');
        const ship = document.getElementById('prologue-ship');
        const exp = document.getElementById('explosion-layer');
        const texts = document.querySelectorAll('#prologue-text > *');

        setTimeout(() => { ship.classList.add('shake-prologue'); SoundEngine.playSFX('damage'); }, 800);
        setTimeout(() => {
            exp.style.display = 'block';
            exp.style.left = "calc(50% - 150px)"; exp.style.bottom = "calc(30% - 20px)";
            exp.classList.add('bomb-play');
            texts.forEach(t => t.style.opacity = '1');
            SoundEngine.playSFX('damage');
        }, 1300);
        setTimeout(() => { if(!document.getElementById('scene-prologue').classList.contains('hidden')) this.showScene('scene-select'); }, 5000);
    },

    createStageSelect() {
        const container = document.getElementById('stage-buttons');
        Object.entries(this.themes).forEach(([lvl, data]) => {
            const btn = document.createElement('button');
            btn.className = 'cyber-panel p-4 rounded-lg font-bold text-left';
            btn.innerHTML = `<span class="text-[10px]" style="color:${data.blue}">LEVEL ${lvl}</span><br>${data.name}`;
            btn.onclick = () => { 
                document.documentElement.style.setProperty('--neon-blue', data.blue);
                document.documentElement.style.setProperty('--neon-pink', data.pink);
                document.getElementById('game-title-text').innerText = data.name;
                this.showScene('scene-game'); 
                GameLogic.init(parseInt(lvl)); 
            };
            container.appendChild(btn);
        });
    },

    toggleScan() {
        if(GameLogic.state.energy >= GameLogic.config.scanCost) {
            GameLogic.state.isScanning = !GameLogic.state.isScanning;
            document.getElementById('scan-btn').classList.toggle('active-mode', GameLogic.state.isScanning);
        }
    },

    toggleFlag() {
        GameLogic.state.flagMode = !GameLogic.state.flagMode;
        document.getElementById('flag-mode-btn').classList.toggle('active-mode', GameLogic.state.flagMode);
    },

    toggleAudio() {
        const m = SoundEngine.toggleMute();
        document.getElementById('audio-toggle-btn').innerText = `SOUND: ${m ? 'OFF' : 'ON'}`;
    },

    showModal(isWin) {
        const modal = document.getElementById('modal');
        document.getElementById('modal-title').innerText = isWin ? "SECTOR CLEARED" : "SYSTEM HALT";
        document.getElementById('modal-desc').innerText = isWin ? "次のセクターへ移動可能です。" : "リブートが必要です。";
        document.getElementById('modal-btn-main').onclick = () => { modal.classList.add('hidden'); this.showScene('scene-select'); };
        modal.classList.remove('hidden');
    }
};
window.onload = () => MainController.init();
