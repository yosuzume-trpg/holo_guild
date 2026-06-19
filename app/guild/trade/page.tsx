'use client'

import { useState } from 'react'
import { WEAPON_POOL, ARMOR_POOL, ACC_TOOL_POOL } from '@/data/equipment'
import type { EquipmentMaster } from '@/data/equipment'
import { useGameStore } from '@/store/gameStore'
import { useInventoryStore } from '@/store/inventoryStore'

const TRADE_COST = 500

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
  const addEquipment = useInventoryStore((s) => s.addEquipment)

  const [activePool, setActivePool] = useState<PoolKey>('weapon')
  const [result, setResult] = useState<EquipmentMaster | null>(null)

  const pool = POOLS.find((p) => p.key === activePool)!.pool

  function handlePull() {
    if (!spendGold(TRADE_COST)) return
    const picked = pool[Math.floor(Math.random() * pool.length)]
    addEquipment(picked.id)
    setResult(picked)
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-slate-200 mb-4">貿易</h1>

      {/* Pool tabs */}
      <div className="flex gap-1 mb-4">
        {POOLS.map((p) => (
          <button
            key={p.key}
            onClick={() => { setActivePool(p.key); setResult(null) }}
            className={`flex-1 text-xs py-2 rounded border transition-colors ${
              activePool === p.key
                ? 'border-yellow-400 text-yellow-300 bg-slate-800'
                : 'border-slate-600 text-slate-400 hover:border-slate-400'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Pool contents */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 mb-4">
        <div className="text-xs text-slate-400 mb-2">排出アイテム（全{pool.length}種・等確率）</div>
        <div className="grid grid-cols-2 gap-1">
          {pool.map((item) => (
            <div key={item.id} className="text-xs text-slate-300 flex items-center gap-1">
              <span className="text-slate-500">・</span>
              {item.name}
              {item.attribute && (
                <span className="text-xs text-orange-400">[{ATTRIBUTE_LABEL[item.attribute]}]</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pull button */}
      <button
        onClick={handlePull}
        disabled={gold < TRADE_COST}
        className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-500 hover:border-yellow-400 text-white font-bold py-3 rounded-lg transition-colors mb-4"
      >
        {POOLS.find((p) => p.key === activePool)!.label}を引く（{TRADE_COST.toLocaleString()}G）
      </button>

      {/* Result */}
      {result && (
        <div className="bg-slate-800 border border-yellow-500 rounded-xl p-4 text-center">
          <div className="text-xs text-yellow-300 mb-1">入手！</div>
          <div className="text-xl font-bold text-white mb-1">
            {result.name}
            {result.attribute && (
              <span className="text-sm text-orange-400 ml-1">[{ATTRIBUTE_LABEL[result.attribute]}]</span>
            )}
          </div>
          <div className="text-xs text-slate-400 mb-2">★1</div>
          <div className="text-sm text-green-400">{result.baseEffectLabel}</div>
        </div>
      )}
    </div>
  )
}
