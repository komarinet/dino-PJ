export const VERSION = "8.15.0";
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
    setTalkIndex: (index) => set({ talkIndex: index })
}));

export const getStore = () => gameStore.getState();
