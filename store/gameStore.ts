import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const CYCLE_DURATION_MS = 20 * 60 * 1000
const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000

interface GameState {
  gold: number
  guildRank: number
  cycleCount: number
  cycleStartTime: number
  lastActiveTime: number
  unlockedRegions: string[]
  isSetupComplete: boolean
  harvestBonuses: Record<string, number>

  addGold: (amount: number) => void
  spendGold: (amount: number) => boolean
  advanceCycle: () => void
  unlockRegion: (regionId: string) => void
  upgradeGuildRank: () => void
  setLastActiveTime: (time: number) => void
  completeSetup: (firstRegionId: string) => void
  getOfflineElapsed: () => number
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      gold: 1000,
      guildRank: 1,
      cycleCount: 1,
      cycleStartTime: Date.now(),
      lastActiveTime: Date.now(),
      unlockedRegions: [],
      isSetupComplete: false,
      harvestBonuses: {},

      addGold: (amount) => set((s) => ({ gold: s.gold + amount })),

      spendGold: (amount) => {
        if (get().gold < amount) return false
        set((s) => ({ gold: s.gold - amount }))
        return true
      },

      advanceCycle: () => {
        const bonuses: Record<string, number> = {}
        // 5% chance to add +1% harvest bonus to a random material
        if (Math.random() < 0.05) {
          const materials = ['wheat', 'potato', 'tomato', 'apple', 'herb',
            'coal', 'iron', 'copper', 'silver', 'crystal',
            'seaweed', 'smallfish', 'mackerel', 'shrimp', 'tuna',
            'goldenwater', 'rainyjuice', 'tbubble', 'magicmilk', 'saltwater']
          const picked = materials[Math.floor(Math.random() * materials.length)]
          bonuses[picked] = (get().harvestBonuses[picked] ?? 0) + 1
        }
        set((s) => ({
          cycleCount: s.cycleCount + 1,
          cycleStartTime: Date.now(),
          harvestBonuses: { ...s.harvestBonuses, ...bonuses },
        }))
      },

      unlockRegion: (regionId) =>
        set((s) => ({
          unlockedRegions: s.unlockedRegions.includes(regionId)
            ? s.unlockedRegions
            : [...s.unlockedRegions, regionId],
        })),

      upgradeGuildRank: () => set((s) => ({ guildRank: s.guildRank + 1 })),

      setLastActiveTime: (time) => set({ lastActiveTime: time }),

      completeSetup: (firstRegionId) =>
        set({
          isSetupComplete: true,
          unlockedRegions: [firstRegionId],
          cycleStartTime: Date.now(),
          lastActiveTime: Date.now(),
        }),

      getOfflineElapsed: () => {
        const elapsed = Date.now() - get().lastActiveTime
        return Math.min(elapsed, OFFLINE_CAP_MS)
      },
    }),
    { name: 'holo-guild-game' }
  )
)

export { CYCLE_DURATION_MS }
