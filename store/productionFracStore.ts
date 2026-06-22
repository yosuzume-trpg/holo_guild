import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 自動生産・自動周回・工芸・商人の「小数アキュムレータ」を永続化するストア。
 * key 例: `${charId}:${matId}` / `dungeon:${charId}:${matId}` / `craft:${charId}` / `merchant:${charId}`
 *
 * GameShell の生産ティックでは高速化のためメモリ上の ref で端数を加算し、
 * 各ティックの最後にこのストアへ丸ごと保存する。これによりリロード・タブを閉じても
 * 1未満の端数（人数が多いと無視できない量になる）が失われない。
 */
interface ProductionFracState {
  frac: Record<string, number>
  setFrac: (frac: Record<string, number>) => void
}

export const useProductionFracStore = create<ProductionFracState>()(
  persist(
    (set) => ({
      frac: {},
      setFrac: (frac) => set({ frac }),
    }),
    { name: 'holo-guild-prod-frac' },
  ),
)
