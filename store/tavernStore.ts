import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TavernState {
  /** completed が属する納品ローテーション番号（初期 -1 = 未設定） */
  rotationIndex: number
  /** 当該ローテーションで納品済みのスロット番号 */
  completed: number[]

  /** rotationIndex が変わっていたら達成状態をリセットする（同じなら何もしない） */
  ensureRotation: (rotationIndex: number) => void
  /** スロットを納品済みにする */
  claimQuest: (slot: number) => void
}

export const useTavernStore = create<TavernState>()(
  persist(
    (set, get) => ({
      rotationIndex: -1,
      completed: [],

      ensureRotation: (rotationIndex) => {
        if (get().rotationIndex === rotationIndex) return
        set({ rotationIndex, completed: [] })
      },

      claimQuest: (slot) =>
        set((s) =>
          s.completed.includes(slot)
            ? s
            : { completed: [...s.completed, slot] }
        ),
    }),
    { name: 'holo-guild-tavern' }
  )
)
