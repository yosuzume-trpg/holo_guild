import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useInventoryStore } from './inventoryStore'
import { useGameStore } from './gameStore'

/** 手動生産タスク（キャラ単位）。start は絶対時刻なので画面遷移・リロード・オフラインをまたいでも継続する。 */
export interface ManualProdTask {
  matId: string
  start: number
  duration: number
}

interface ManualProductionState {
  tasks: Record<string, ManualProdTask> // 生産施設の手動生産。key: characterId
  craftTasks: Record<string, { start: number; duration: number }> // 工芸の手動製作。key: recipeId
  sellTasks: Record<string, { gold: number; start: number; duration: number }> // 商人の手動売却。key: itemId

  /** 生産中でなければ手動生産タスク開始 */
  startTask: (charId: string, matId: string, duration: number) => void
  /** 手動生産タスクを破棄（配置解除・素材変更時など） */
  cancelTask: (charId: string) => void
  /** 製作中でなければ手動製作タスク開始（材料は呼び出し側で消費済みの前提） */
  startCraftTask: (recipeId: string, duration: number) => void
  /** 売却中でなければ手動売却タスク開始（売却対象は呼び出し側で在庫から減算済みの前提） */
  startSellTask: (itemId: string, gold: number, duration: number) => void
  /** 完了済みタスクを回収：生産は素材を、製作は完成品を1個付与、売却はゴールドを付与して除去。どの画面からでも呼べる（経験値は付与しない） */
  collectCompleted: () => void
}

export const useManualProductionStore = create<ManualProductionState>()(
  persist(
    (set, get) => ({
      tasks: {},
      craftTasks: {},
      sellTasks: {},

      startTask: (charId, matId, duration) => {
        if (get().tasks[charId]) return // 生産中は新規不可
        set((s) => ({
          tasks: { ...s.tasks, [charId]: { matId, start: Date.now(), duration } },
        }))
      },

      cancelTask: (charId) =>
        set((s) => {
          if (!s.tasks[charId]) return s
          const next = { ...s.tasks }
          delete next[charId]
          return { tasks: next }
        }),

      startCraftTask: (recipeId, duration) => {
        if (get().craftTasks[recipeId]) return // 製作中は新規不可
        set((s) => ({
          craftTasks: { ...s.craftTasks, [recipeId]: { start: Date.now(), duration } },
        }))
      },

      startSellTask: (itemId, gold, duration) => {
        if (get().sellTasks[itemId]) return // 売却中は新規不可
        set((s) => ({
          sellTasks: { ...s.sellTasks, [itemId]: { gold, start: Date.now(), duration } },
        }))
      },

      collectCompleted: () => {
        const now = Date.now()
        const addMaterial = useInventoryStore.getState().addMaterial

        // 生産施設の手動生産（素材を付与）
        const tasks = get().tasks
        const dueIds = Object.keys(tasks).filter(
          (id) => now - tasks[id].start >= tasks[id].duration
        )
        // 工芸の手動製作（完成品を付与）
        const craftTasks = get().craftTasks
        const dueCraftIds = Object.keys(craftTasks).filter(
          (id) => now - craftTasks[id].start >= craftTasks[id].duration
        )
        // 商人の手動売却（ゴールドを付与）
        const sellTasks = get().sellTasks
        const dueSellIds = Object.keys(sellTasks).filter(
          (id) => now - sellTasks[id].start >= sellTasks[id].duration
        )
        if (dueIds.length === 0 && dueCraftIds.length === 0 && dueSellIds.length === 0) return

        for (const id of dueIds) addMaterial(tasks[id].matId, 1)
        for (const recipeId of dueCraftIds) addMaterial(recipeId, 1)
        if (dueSellIds.length > 0) {
          const addGold = useGameStore.getState().addGold
          for (const id of dueSellIds) addGold(sellTasks[id].gold)
        }

        set((s) => {
          const nextTasks = { ...s.tasks }
          for (const id of dueIds) delete nextTasks[id]
          const nextCraft = { ...s.craftTasks }
          for (const id of dueCraftIds) delete nextCraft[id]
          const nextSell = { ...s.sellTasks }
          for (const id of dueSellIds) delete nextSell[id]
          return { tasks: nextTasks, craftTasks: nextCraft, sellTasks: nextSell }
        })
      },
    }),
    { name: 'holo-guild-manual-prod' }
  )
)
