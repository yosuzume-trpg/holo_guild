import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GuildFacility, GuildFacilityId, ProductionFacility, ProductionFacilityId } from '@/types/game'

const INITIAL_FACILITY: ProductionFacility = { expansionLevel: 0, researchLevel: 0 }
const INITIAL_GUILD: GuildFacility = { expansionLevel: 0, researchLevel: 0 }

interface FacilityState {
  farm: ProductionFacility
  mining: ProductionFacility
  fishing: ProductionFacility
  alchemy: ProductionFacility
  merchant: GuildFacility
  craft: GuildFacility

  expandProduction: (facility: ProductionFacilityId) => void
  researchProduction: (facility: ProductionFacilityId) => void
  expandGuild: (facility: GuildFacilityId) => void
  researchGuild: (facility: GuildFacilityId) => void

  getSlotCount: (facility: ProductionFacilityId | GuildFacilityId) => number
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

      expandProduction: (facility) =>
        set((s) => ({
          [facility]: {
            ...s[facility],
            expansionLevel: s[facility].expansionLevel + 1,
          },
        })),

      researchProduction: (facility) =>
        set((s) => ({
          [facility]: {
            ...s[facility],
            researchLevel: s[facility].researchLevel + 1,
          },
        })),

      expandGuild: (facility) =>
        set((s) => ({
          [facility]: {
            ...s[facility],
            expansionLevel: s[facility].expansionLevel + 1,
          },
        })),

      researchGuild: (facility) =>
        set((s) => ({
          [facility]: {
            ...s[facility],
            researchLevel: s[facility].researchLevel + 1,
          },
        })),

      getSlotCount: (facility) => 3 + get()[facility].expansionLevel,

      getResearchBonus: (facility) => get()[facility].researchLevel * 0.01,

      getUpgradeCost: (level) => 500 * level * level,
    }),
    { name: 'holo-guild-facilities' }
  )
)
