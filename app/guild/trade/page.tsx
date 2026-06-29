'use client'

import { useState } from 'react'
import { WEAPON_POOL, ARMOR_POOL, ACC_TOOL_POOL } from '@/data/equipment'
import type { EquipmentMaster } from '@/data/equipment'
import { useGameStore } from '@/store/gameStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { TRADE_COST, PICKUP_RATE } from '@/data/constants'
import { getDeliveryRotationIndex } from '@/data/tavern'
import { getPickup } from '@/data/pickup'
import ItemIcon from '@/app/_components/facility/ItemIcon'

const ATTRIBUTE_LABEL: Record<string, string> = {
  fire: '火', water: '水', wind: '風', earth: '地',
}

const POOLS = [
  { key: 'weapon', label: '武器ガチャ',      pool: WEAPON_POOL },
  { key: 'armor',  label: '防具ガチャ',      pool: ARMOR_POOL },
  { key: 'acctool',label: 'アクセ・道具',   pool: ACC_TOOL_POOL },
] as const

type PoolKey = typeof POOLS[number]['key']

export default function TradePage() {
  const gold        = useGameStore((s) => s.gold)
  const spendGold   = useGameStore((s) => s.spendGold)
  const cycleCount  = useGameStore((s) => s.cycleCount)
  const addEquipment = useInventoryStore((s) => s.addEquipment)

  const [activePool, setActivePool] = useState<PoolKey>('weapon')
  const [result, setResult] = useState<EquipmentMaster[] | null>(null)
  const [pickupMode, setPickupMode] = useState(false)

  const pool = POOLS.find((p) => p.key === activePool)!.pool
  const TRADE_COST_10 = TRADE_COST * 10

  // ピックアップ対象：3サイクルごとに切り替わり、ローテーション内では固定
  const rotationIndex = getDeliveryRotationIndex(cycleCount)
  const pickup = getPickup(pool, rotationIndex, activePool)

  function handlePull(count: number) {
    const cost = TRADE_COST * count
    if (!spendGold(cost)) return
    const picked: EquipmentMaster[] = []
    for (let i = 0; i < count; i++) {
      // ピックアップモードでは最初に PICKUP_RATE で判定し、当たればピックアップ対象を確定
      const item = pickupMode && Math.random() < PICKUP_RATE
        ? pickup
        : pool[Math.floor(Math.random() * pool.length)]
      addEquipment(item.id)
      picked.push(item)
    }
    setResult(picked)
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-ink mb-4">貿易</h1>

      {/* Pool tabs */}
      <div className="flex gap-1 mb-4">
        {POOLS.map((p) => (
          <button
            key={p.key}
            onClick={() => { setActivePool(p.key); setResult(null) }}
            className={`flex-1 text-xs py-2 rounded border transition-colors ${
              activePool === p.key
                ? 'border-accent-strong text-accent-strong bg-surface'
                : 'border-line text-ink-muted hover:border-line-strong'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Gacha mode toggle */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => { setPickupMode(false); setResult(null) }}
          className={`flex-1 text-xs py-2 rounded border transition-colors ${
            !pickupMode
              ? 'border-accent-strong text-accent-strong bg-surface'
              : 'border-line text-ink-muted hover:border-line-strong'
          }`}
        >
          通常ガチャ
        </button>
        <button
          onClick={() => { setPickupMode(true); setResult(null) }}
          className={`flex-1 text-xs py-2 rounded border transition-colors ${
            pickupMode
              ? 'border-accent-strong text-accent-strong bg-surface'
              : 'border-line text-ink-muted hover:border-line-strong'
          }`}
        >
          ピックアップガチャ
        </button>
      </div>

      {/* Pickup target banner */}
      {pickupMode && (
        <div className="flex items-center gap-3 bg-surface-2 border border-accent-strong rounded-xl p-3 mb-4">
          <div className="relative w-14 h-11 shrink-0">
            <ItemIcon id={pickup.id} alt={pickup.name} />
          </div>
          <div className="flex-1">
            <div className="text-xs text-accent-strong font-semibold">⭐ ピックアップ対象</div>
            <div className="text-sm font-bold text-ink leading-tight">
              {pickup.name}
              {pickup.attribute && (
                <span className="text-xs text-orange-400 ml-1">[{ATTRIBUTE_LABEL[pickup.attribute]}]</span>
              )}
            </div>
            <div className="text-xs text-ink-muted">各抽選 {Math.round(PICKUP_RATE * 100)}% で確定入手</div>
          </div>
        </div>
      )}

      {/* Pool contents */}
      <div className="bg-surface border border-line rounded-lg p-3 mb-4">
        <div className="text-xs text-ink-muted mb-2">排出アイテム（全{pool.length}種・等確率）</div>
        <div className="grid grid-cols-2 gap-1">
          {pool.map((item) => (
            <div key={item.id} className="text-xs text-ink flex items-center gap-1">
              <span className="text-ink-subtle">・</span>
              {item.name}
              {item.attribute && (
                <span className="text-xs text-orange-400">[{ATTRIBUTE_LABEL[item.attribute]}]</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pull buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => handlePull(1)}
          disabled={gold < TRADE_COST}
          className="flex-1 bg-surface-2 hover:bg-surface-3 disabled:opacity-40 disabled:cursor-not-allowed border border-line-strong hover:border-accent-strong text-ink font-bold py-3 rounded-lg transition-colors"
        >
          1回引く（{TRADE_COST.toLocaleString()}G）
        </button>
        <button
          onClick={() => handlePull(10)}
          disabled={gold < TRADE_COST_10}
          className="flex-1 bg-surface-2 hover:bg-surface-3 disabled:opacity-40 disabled:cursor-not-allowed border border-line-strong hover:border-accent-strong text-ink font-bold py-3 rounded-lg transition-colors"
        >
          10連を引く（{TRADE_COST_10.toLocaleString()}G）
        </button>
      </div>

      {/* Result */}
      {result && result.length === 1 && (
        <div className="bg-surface border border-accent-strong rounded-xl p-4 text-center">
          <div className="text-xs text-accent-strong mb-1">入手！</div>
          <div className="relative w-20 h-16 mx-auto mb-1">
            <ItemIcon id={result[0].id} alt={result[0].name} />
          </div>
          <div className="text-xl font-bold text-ink mb-1">
            {result[0].name}
            {result[0].attribute && (
              <span className="text-sm text-orange-400 ml-1">[{ATTRIBUTE_LABEL[result[0].attribute]}]</span>
            )}
          </div>
          <div className="text-xs text-ink-muted mb-2">★1</div>
          <div className="text-sm text-success">{result[0].baseEffectLabel}</div>
        </div>
      )}
      {result && result.length > 1 && (
        <div className="bg-surface border border-accent-strong rounded-xl p-4">
          <div className="text-xs text-accent-strong mb-2 text-center">{result.length}連 入手！</div>
          <div className="grid grid-cols-2 gap-2">
            {result.map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-surface-2 border border-line rounded p-1">
                <div className="relative w-10 h-8 shrink-0">
                  <ItemIcon id={item.id} alt={item.name} />
                </div>
                <span className="text-xs text-ink leading-tight">
                  {item.name}
                  {item.attribute && (
                    <span className="text-xs text-orange-400 ml-0.5">[{ATTRIBUTE_LABEL[item.attribute]}]</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
