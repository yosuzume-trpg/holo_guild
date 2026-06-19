import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CharacterAssignment, CharacterInstance, CharacterStats, EquipmentSlot, Tendency } from '@/types/game'

const TENDENCIES: Tendency[] = ['standard', 'attack', 'magic', 'defense', 'speed']

const STAT_VARIANCE: Record<Tendency, Partial<CharacterStats>> = {
  standard: { hp: 15, atk: 5, def: 5, mag: 5, mdef: 5, spd: 1 },
  attack:   { hp: 15, atk: 15, def: 2, mag: 2, mdef: 2, spd: 1 },
  magic:    { hp: 15, atk: 2, def: 2, mag: 15, mdef: 2, spd: 1 },
  defense:  { hp: 20, atk: 2, def: 15, mag: 2, mdef: 15, spd: 1 },
  speed:    { hp: 15, atk: 5, def: 5, mag: 5, mdef: 5, spd: 3 },
}

function rollStats(tendency: Tendency): CharacterStats {
  const v = STAT_VARIANCE[tendency]
  const rand = (base: number, variance: number) =>
    base + Math.floor((Math.random() * 2 - 1) * variance)
  return {
    hp:   rand(200, v.hp ?? 15),
    atk:  rand(50,  v.atk ?? 5),
    def:  rand(50,  v.def ?? 5),
    mag:  rand(50,  v.mag ?? 5),
    mdef: rand(50,  v.mdef ?? 5),
    spd:  rand(10,  v.spd ?? 1),
  }
}

interface CharacterState {
  characters: CharacterInstance[]

  addCharacter: (masterId: string) => string
  addCertificate: (masterId: string, count?: number) => void
  setAssignment: (id: string, assignment: CharacterAssignment | null) => void
  equip: (id: string, slot: EquipmentSlot, equipInstanceId: string | null) => void
  socialize: (id: string) => void
  resetSocialFlag: () => void
  gainBattleExp: (id: string, exp: number) => void
  gainProductionExp: (id: string, facility: 'farm' | 'mining' | 'fishing' | 'alchemy', exp: number) => void
  gainCraftExp: (id: string, exp: number) => void
  gainMerchantExp: (id: string, exp: number) => void
  updateCurrentHp: (id: string, hp: number) => void
  upgradeStarRank: (id: string) => void
}

function updateChar(
  chars: CharacterInstance[],
  id: string,
  update: Partial<CharacterInstance>
): CharacterInstance[] {
  return chars.map((c) => (c.id === id ? { ...c, ...update } : c))
}

function expToLevel(exp: number): number {
  let level = 1
  while (exp >= 100 * level) {
    exp -= 100 * level
    level++
  }
  return level
}

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set, get) => ({
      characters: [],

      addCharacter: (masterId) => {
        const id = crypto.randomUUID()
        const tendency = TENDENCIES[Math.floor(Math.random() * TENDENCIES.length)]
        const stats = rollStats(tendency)
        const instance: CharacterInstance = {
          id,
          masterId,
          starRank: 1,
          certificates: 0,
          stats,
          currentHp: stats.hp,
          battleLevel: 1, battleExp: 0,
          farmLevel: 1,   farmExp: 0,
          miningLevel: 1, miningExp: 0,
          fishingLevel: 1, fishingExp: 0,
          alchemyLevel: 1, alchemyExp: 0,
          craftLevel: 1,  craftExp: 0,
          merchantLevel: 1, merchantExp: 0,
          affectionLevel: 1,
          affectionPoints: 0,
          equipment: { weapon: null, armor: null, accessory: null, tool: null },
          assignment: null,
          tendency,
          socializedThisCycle: false,
        }
        set((s) => ({ characters: [...s.characters, instance] }))
        return id
      },

      addCertificate: (masterId, count = 1) =>
        set((s) => ({
          characters: s.characters.map((c) =>
            c.masterId === masterId ? { ...c, certificates: c.certificates + count } : c
          ),
        })),

      setAssignment: (id, assignment) =>
        set((s) => ({ characters: updateChar(s.characters, id, { assignment }) })),

      equip: (id, slot, equipInstanceId) =>
        set((s) => ({
          characters: updateChar(s.characters, id, {
            equipment: { ...s.characters.find((c) => c.id === id)!.equipment, [slot]: equipInstanceId },
          }),
        })),

      socialize: (id) => {
        const char = get().characters.find((c) => c.id === id)
        if (!char || char.socializedThisCycle) return
        const gain = 95 + Math.floor(Math.random() * 11)
        const newPoints = char.affectionPoints + gain
        const pointsNeeded = char.affectionLevel * 100
        const leveled = newPoints >= pointsNeeded
        set((s) => ({
          characters: updateChar(s.characters, id, {
            socializedThisCycle: true,
            affectionPoints: leveled ? newPoints - pointsNeeded : newPoints,
            affectionLevel: leveled ? char.affectionLevel + 1 : char.affectionLevel,
          }),
        }))
      },

      resetSocialFlag: () =>
        set((s) => ({
          characters: s.characters.map((c) => ({ ...c, socializedThisCycle: false })),
        })),

      gainBattleExp: (id, exp) =>
        set((s) => {
          const char = s.characters.find((c) => c.id === id)
          if (!char) return s
          const newExp = char.battleExp + exp
          const newLevel = expToLevel(newExp)
          return { characters: updateChar(s.characters, id, { battleExp: newExp, battleLevel: newLevel }) }
        }),

      gainProductionExp: (id, facility, exp) => {
        const levelKey = `${facility}Level` as keyof CharacterInstance
        const expKey = `${facility}Exp` as keyof CharacterInstance
        set((s) => {
          const char = s.characters.find((c) => c.id === id)
          if (!char) return s
          const newExp = (char[expKey] as number) + exp
          const newLevel = expToLevel(newExp)
          return {
            characters: updateChar(s.characters, id, {
              [expKey]: newExp,
              [levelKey]: newLevel,
            }),
          }
        })
      },

      gainCraftExp: (id, exp) =>
        set((s) => {
          const char = s.characters.find((c) => c.id === id)
          if (!char) return s
          const newExp = char.craftExp + exp
          return { characters: updateChar(s.characters, id, { craftExp: newExp, craftLevel: expToLevel(newExp) }) }
        }),

      gainMerchantExp: (id, exp) =>
        set((s) => {
          const char = s.characters.find((c) => c.id === id)
          if (!char) return s
          const newExp = char.merchantExp + exp
          return { characters: updateChar(s.characters, id, { merchantExp: newExp, merchantLevel: expToLevel(newExp) }) }
        }),

      updateCurrentHp: (id, hp) =>
        set((s) => ({ characters: updateChar(s.characters, id, { currentHp: hp }) })),

      upgradeStarRank: (id) =>
        set((s) => {
          const char = s.characters.find((c) => c.id === id)
          if (!char || char.starRank >= 5) return s
          const cost = char.starRank * 10
          if (char.certificates < cost) return s
          return {
            characters: updateChar(s.characters, id, {
              starRank: char.starRank + 1,
              certificates: char.certificates - cost,
            }),
          }
        }),
    }),
    { name: 'holo-guild-characters' }
  )
)
