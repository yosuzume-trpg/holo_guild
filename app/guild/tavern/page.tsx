'use client'

import { useEffect, useMemo } from 'react'
import { DELIVERY_ROTATION_CYCLES } from '@/data/constants'
import { generateDeliveryQuests, getDeliveryRotationIndex } from '@/data/tavern'
import { useGameStore } from '@/store/gameStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { useTavernStore } from '@/store/tavernStore'
import ItemIcon from '@/app/_components/facility/ItemIcon'

export default function TavernPage() {
  const cycleCount     = useGameStore((s) => s.cycleCount)
  const addGold        = useGameStore((s) => s.addGold)
  const materials      = useInventoryStore((s) => s.materials)
  const removeMaterial = useInventoryStore((s) => s.removeMaterial)
  const completed      = useTavernStore((s) => s.completed)
  const ensureRotation = useTavernStore((s) => s.ensureRotation)
  const claimQuest     = useTavernStore((s) => s.claimQuest)

  const rotationIndex = getDeliveryRotationIndex(cycleCount)
  const quests = useMemo(() => generateDeliveryQuests(rotationIndex), [rotationIndex])

  // ローテーションが切り替わったら達成状態をリセット
  useEffect(() => {
    ensureRotation(rotationIndex)
  }, [rotationIndex, ensureRotation])

  // このローテーションが切り替わるサイクル（このサイクルに入ると新しい3種）
  const nextRotationCycle = (rotationIndex + 1) * DELIVERY_ROTATION_CYCLES + 1

  function deliver(slot: number, itemId: string, qty: number, reward: number) {
    if (completed.includes(slot)) return
    if ((materials[itemId] ?? 0) < qty) return
    if (!removeMaterial(itemId, qty)) return
    addGold(reward)
    claimQuest(slot)
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-ink">酒場</h1>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-sm font-bold text-ink">納品クエスト</div>
          <div className="text-xs text-ink-subtle">
            サイクル{nextRotationCycle}で更新
          </div>
        </div>
        <p className="text-xs text-ink-subtle mb-3">
          指定の素材・工芸品を納品すると、商人ギルドより高値で買い取ってもらえます。
        </p>

        <div className="space-y-2">
          {quests.map((q) => {
            const stock = materials[q.itemId] ?? 0
            const done = completed.includes(q.slot)
            const enough = stock >= q.qty
            return (
              <div
                key={q.slot}
                className={`rounded-lg border p-3 ${
                  done ? 'border-line bg-surface-2 opacity-60' : 'border-line-strong bg-surface'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="relative w-12 aspect-5/4 shrink-0 self-center">
                    <ItemIcon id={q.itemId} alt={q.name} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-ink truncate">{q.name}</div>
                    <div className="text-xs text-ink-muted">
                      必要 {q.qty}個 ・ 在庫 <span className={enough ? 'text-success' : 'text-danger'}>{stock}</span>
                    </div>
                    <div className="text-xs text-warning">報酬 {q.reward.toLocaleString()}G</div>
                  </div>
                  <button
                    onClick={() => deliver(q.slot, q.itemId, q.qty, q.reward)}
                    disabled={done || !enough}
                    className="shrink-0 bg-accent hover:bg-accent-strong disabled:opacity-40 disabled:hover:bg-accent text-ink font-bold px-4 py-2 rounded text-sm transition-colors"
                  >
                    {done ? '納品済み' : '納品'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
