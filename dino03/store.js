import { createStore } from 'https://esm.sh/zustand/vanilla';

export const gameStore = createStore((set) => ({
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

export const getStore = () => gameStore.getState();
