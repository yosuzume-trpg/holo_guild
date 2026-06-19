import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EquipmentInstance } from '@/types/game'

interface InventoryState {
  materials: Record<string, number>
  equipment: EquipmentInstance[]

  addMaterial: (id: string, amount: number) => void
  removeMaterial: (id: string, amount: number) => boolean
  getMaterial: (id: string) => number
  addEquipment: (masterId: string) => string
  removeEquipment: (instanceId: string) => void
  upgradeEquipment: (instanceId1: string, instanceId2: string) => void
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      materials: {},
      equipment: [],

      addMaterial: (id, amount) =>
        set((s) => ({
          materials: { ...s.materials, [id]: (s.materials[id] ?? 0) + amount },
        })),

      removeMaterial: (id, amount) => {
        const current = get().materials[id] ?? 0
        if (current < amount) return false
        set((s) => ({
          materials: { ...s.materials, [id]: s.materials[id] - amount },
        }))
        return true
      },

      getMaterial: (id) => get().materials[id] ?? 0,

      addEquipment: (masterId) => {
        const instanceId = crypto.randomUUID()
        set((s) => ({
          equipment: [...s.equipment, { instanceId, masterId, starRank: 1 }],
        }))
        return instanceId
      },

      removeEquipment: (instanceId) =>
        set((s) => ({
          equipment: s.equipment.filter((e) => e.instanceId !== instanceId),
        })),

      upgradeEquipment: (instanceId1, instanceId2) => {
        const eq1 = get().equipment.find((e) => e.instanceId === instanceId1)
        const eq2 = get().equipment.find((e) => e.instanceId === instanceId2)
        if (!eq1 || !eq2 || eq1.masterId !== eq2.masterId || eq1.starRank !== eq2.starRank) return
        set((s) => ({
          equipment: s.equipment
            .filter((e) => e.instanceId !== instanceId2)
            .map((e) =>
              e.instanceId === instanceId1 ? { ...e, starRank: e.starRank + 1 } : e
            ),
        }))
      },
    }),
    { name: 'holo-guild-inventory' }
  )
)
