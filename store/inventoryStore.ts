import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EquipmentInstance } from "@/types/game";

interface InventoryState {
  materials: Record<string, number>;
  equipment: EquipmentInstance[];

  addMaterial: (id: string, amount: number) => void;
  removeMaterial: (id: string, amount: number) => boolean;
  getMaterial: (id: string) => number;
  addEquipment: (masterId: string) => string;
  removeEquipment: (instanceId: string) => void;
  /**
   * 重複を一括消費して survivor を targetRank までランクアップする。
   * consumeInstanceIds を削除し、survivor の starRank を targetRank に設定する。
   * （消費分の妥当性・コストは呼び出し側で検証・支払い済みであることを前提とする）
   */
  mergeEquipmentTo: (
    survivorInstanceId: string,
    consumeInstanceIds: string[],
    targetRank: number,
  ) => void;
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
        const current = get().materials[id] ?? 0;
        if (current < amount) return false;
        set((s) => ({
          materials: { ...s.materials, [id]: s.materials[id] - amount },
        }));
        return true;
      },

      getMaterial: (id) => get().materials[id] ?? 0,

      addEquipment: (masterId) => {
        const instanceId = crypto.randomUUID();
        set((s) => ({
          equipment: [...s.equipment, { instanceId, masterId, starRank: 1 }],
        }));
        return instanceId;
      },

      removeEquipment: (instanceId) =>
        set((s) => ({
          equipment: s.equipment.filter((e) => e.instanceId !== instanceId),
        })),

      mergeEquipmentTo: (
        survivorInstanceId,
        consumeInstanceIds,
        targetRank,
      ) => {
        const eq = get().equipment;
        const survivor = eq.find((e) => e.instanceId === survivorInstanceId);
        if (!survivor) return;
        const consumeSet = new Set(consumeInstanceIds);
        // survivor は消費対象に含めない。消費は全件存在し、survivor と同 masterId であること。
        if (consumeSet.has(survivorInstanceId)) return;
        const consumed = eq.filter((e) => consumeSet.has(e.instanceId));
        if (consumed.length !== consumeSet.size) return;
        if (consumed.some((e) => e.masterId !== survivor.masterId)) return;
        set((s) => ({
          equipment: s.equipment
            .filter((e) => !consumeSet.has(e.instanceId))
            .map((e) =>
              e.instanceId === survivorInstanceId
                ? { ...e, starRank: targetRank }
                : e,
            ),
        }));
      },
    }),
    { name: "holo-guild-inventory" },
  ),
);
