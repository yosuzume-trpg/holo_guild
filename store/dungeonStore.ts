import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StageType, EnemyInstance, Buff } from '@/types/game'

export interface StoredBattle {
  dungeonLevel: number
  stageTypes: StageType[]
  currentStage: number
  stageType: StageType
  enemies: EnemyInstance[]
  partyIds: string[]
  partyHps: Record<string, number>
  partyBuffs: Record<string, Buff[]>
  loot: { gold: number; materials: Record<string, number>; equipmentMasterIds: string[]; exp: number }
  turnOrder: { id: string; isPlayer: boolean }[]
  currentTurnIndex: number
  battlePhase: 'player-action' | 'result' | null
  log: string[]
}

interface DungeonState {
  clearedLevels: number[]
  maxClearedLevel: number
  recruitPoints: Record<string, number>
  activeBattle: StoredBattle | null

  clearDungeon: (level: number) => void
  setActiveBattle: (battle: StoredBattle | null) => void
  addRecruitPoints: (regionId: string, amount: number) => void
  getRecruitPoints: (regionId: string) => number
}

export const useDungeonStore = create<DungeonState>()(
  persist(
    (set, get) => ({
      clearedLevels: [],
      maxClearedLevel: 0,
      recruitPoints: {},
      activeBattle: null,

      clearDungeon: (level) =>
        set((s) => ({
          clearedLevels: s.clearedLevels.includes(level)
            ? s.clearedLevels
            : [...s.clearedLevels, level].sort((a, b) => a - b),
          maxClearedLevel: Math.max(s.maxClearedLevel, level),
        })),

      setActiveBattle: (battle) => set({ activeBattle: battle }),

      addRecruitPoints: (regionId, amount) =>
        set((s) => ({
          recruitPoints: {
            ...s.recruitPoints,
            [regionId]: (s.recruitPoints[regionId] ?? 0) + amount,
          },
        })),

      getRecruitPoints: (regionId) => get().recruitPoints[regionId] ?? 0,
    }),
    { name: 'holo-guild-dungeon' }
  )
)
