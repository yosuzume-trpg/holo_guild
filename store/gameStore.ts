import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useInventoryStore } from './inventoryStore'
import {
  CYCLE_DURATION_MS, OFFLINE_CAP_MS, HARVEST_BONUS_CHANCE,
  GR_UPGRADE_MAT_COST, INITIAL_GOLD,
} from '@/data/constants'

interface GameState {
  gold: number
  guildRank: number
  cycleCount: number
  cycleStartTime: number
  lastActiveTime: number
  unlockedRegions: string[]
  isSetupComplete: boolean
  harvestBonuses: Record<string, number>
  socializedThisCycle: boolean

  addGold: (amount: number) => void
  spendGold: (amount: number) => boolean
  advanceCycle: () => void
  markSocialized: () => void
  unlockRegion: (regionId: string) => void
  upgradeGuildRank: () => boolean
  setLastActiveTime: (time: number) => void
  completeSetup: (firstRegionId: string) => void
  getOfflineElapsed: () => number
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      gold: INITIAL_GOLD,
      guildRank: 1,
      cycleCount: 1,
      cycleStartTime: Date.now(),
      lastActiveTime: Date.now(),
      unlockedRegions: [],
      isSetupComplete: false,
      harvestBonuses: {},
      socializedThisCycle: false,

      addGold: (amount) => set((s) => ({ gold: s.gold + amount })),

      spendGold: (amount) => {
        if (get().gold < amount) return false
        set((s) => ({ gold: s.gold - amount }))
        return true
      },

      advanceCycle: () => {
        const bonuses: Record<string, number> = {}
        if (Math.random() < HARVEST_BONUS_CHANCE) {
          const materials = ['wheat', 'potato', 'tomato', 'apple', 'herb',
            'coal', 'iron', 'copper', 'silver', 'crystal',
            'seaweed', 'smallfish', 'mackerel', 'shrimp', 'tuna',
            'goldenwater', 'rainyjuice', 'tbubble', 'magicmilk', 'saltwater']
          const picked = materials[Math.floor(Math.random() * materials.length)]
          // 仕様: 豊作はそのサイクルのみ +1% 固定（累積しない）
          bonuses[picked] = 1
        }
        set((s) => ({
          cycleCount: s.cycleCount + 1,
          cycleStartTime: Date.now(),
          // 豊作ボーナスはそのサイクルのみ有効（毎サイクル置き換え）
          harvestBonuses: bonuses,
          socializedThisCycle: false,
        }))
      },

      markSocialized: () => set({ socializedThisCycle: true }),

      unlockRegion: (regionId) =>
        set((s) => ({
          unlockedRegions: s.unlockedRegions.includes(regionId)
            ? s.unlockedRegions
            : [...s.unlockedRegions, regionId],
        })),

      upgradeGuildRank: () => {
        const { guildRank } = get()
        const cost = guildRank * GR_UPGRADE_MAT_COST
        const inv = useInventoryStore.getState()
        if ((inv.materials['magiccrystal'] ?? 0) < cost) return false
        if ((inv.materials['ancientgear'] ?? 0) < cost) return false
        inv.removeMaterial('magiccrystal', cost)
        inv.removeMaterial('ancientgear', cost)
        set((s) => ({ guildRank: s.guildRank + 1 }))
        return true
      },

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
