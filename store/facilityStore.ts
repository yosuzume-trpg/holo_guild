import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GuildFacility, GuildFacilityId, ProductionFacility, ProductionFacilityId } from '@/types/game'
import { useGameStore } from './gameStore'
import {
  FACILITY_INITIAL_SLOTS, FACILITY_RESEARCH_BONUS_PER_LEVEL,
  FACILITY_UPGRADE_COST_FACTOR, FACILITY_UPGRADE_TIER_SIZE, GR_FACILITY_LEVEL_CAP,
} from '@/data/constants'

const INITIAL_FACILITY: ProductionFacility = { expansionLevel: 0, researchLevel: 0 }
const INITIAL_GUILD: GuildFacility = { expansionLevel: 0, researchLevel: 0 }

interface FacilityState {
  farm: ProductionFacility
  mining: ProductionFacility
  fishing: ProductionFacility
  alchemy: ProductionFacility
  merchant: GuildFacility
  craft: GuildFacility
  // ダンジョン自動周回の配置枠（研究は無し。拡張のみ）
  dungeon: ProductionFacility

  expandProduction: (facility: ProductionFacilityId) => void
  researchProduction: (facility: ProductionFacilityId) => void
  expandGuild: (facility: GuildFacilityId) => void
  researchGuild: (facility: GuildFacilityId) => void
  expandDungeon: () => void

  getSlotCount: (facility: ProductionFacilityId | GuildFacilityId | 'dungeon') => number
  getResearchBonus: (facility: ProductionFacilityId | GuildFacilityId) => number
  getUpgradeCost: (level: number) => number
}

export const useFacilityStore = create<FacilityState>()(
  persist(
    (set, get) => ({
      farm: { ...INITIAL_FACILITY },
      mining: { ...INITIAL_FACILITY },
      fishing: { ...INITIAL_FACILITY },
      alchemy: { ...INITIAL_FACILITY },
      merchant: { ...INITIAL_GUILD },
      craft: { ...INITIAL_GUILD },
      dungeon: { ...INITIAL_FACILITY },

      expandProduction: (facility) =>
        set((s) => {
          if (s[facility].expansionLevel >= useGameStore.getState().guildRank * GR_FACILITY_LEVEL_CAP) return s
          return { [facility]: { ...s[facility], expansionLevel: s[facility].expansionLevel + 1 } }
        }),

      researchProduction: (facility) =>
        set((s) => {
          if (s[facility].researchLevel >= useGameStore.getState().guildRank * GR_FACILITY_LEVEL_CAP) return s
          return { [facility]: { ...s[facility], researchLevel: s[facility].researchLevel + 1 } }
        }),

      expandGuild: (facility) =>
        set((s) => {
          if (s[facility].expansionLevel >= useGameStore.getState().guildRank * GR_FACILITY_LEVEL_CAP) return s
          return { [facility]: { ...s[facility], expansionLevel: s[facility].expansionLevel + 1 } }
        }),

      researchGuild: (facility) =>
        set((s) => {
          if (s[facility].researchLevel >= useGameStore.getState().guildRank * GR_FACILITY_LEVEL_CAP) return s
          return { [facility]: { ...s[facility], researchLevel: s[facility].researchLevel + 1 } }
        }),

      expandDungeon: () =>
        set((s) => {
          if (s.dungeon.expansionLevel >= useGameStore.getState().guildRank * GR_FACILITY_LEVEL_CAP) return s
          return { dungeon: { ...s.dungeon, expansionLevel: s.dungeon.expansionLevel + 1 } }
        }),

      getSlotCount: (facility) => FACILITY_INITIAL_SLOTS + get()[facility].expansionLevel,

      getResearchBonus: (facility) => get()[facility].researchLevel * FACILITY_RESEARCH_BONUS_PER_LEVEL,

      getUpgradeCost: (level) =>
        FACILITY_UPGRADE_COST_FACTOR * level * Math.ceil(level / FACILITY_UPGRADE_TIER_SIZE),
    }),
    { name: 'holo-guild-facilities' }
  )
)
