'use client'

import { useState } from 'react'
import { MATERIALS } from '@/data/materials'
import { RECIPES } from '@/data/recipes'
import { getCharacterMaster } from '@/data/characters'
import { useGameStore } from '@/store/gameStore'
import { useCharacterStore } from '@/store/characterStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { useFacilityStore } from '@/store/facilityStore'

const SELL_CANDIDATES = [
  ...MATERIALS.filter((m) => m.facility !== 'dungeon').map((m) => ({
    id: m.id, name: m.name, price: m.price,
  })),
  ...RECIPES.map((r) => ({
    id: r.id, name: r.name, price: r.sellPrice,
  })),
]

export default function MerchantPage() {
  const gold            = useGameStore((s) => s.gold)
  const spendGold       = useGameStore((s) => s.spendGold)
  const addGold         = useGameStore((s) => s.addGold)
  const characters      = useCharacterStore((s) => s.characters)
  const setAssignment   = useCharacterStore((s) => s.setAssignment)
  const materials       = useInventoryStore((s) => s.materials)
  const removeMaterial  = useInventoryStore((s) => s.removeMaterial)
  const facilityData    = useFacilityStore((s) => s.merchant)
  const getSlotCount    = useFacilityStore((s) => s.getSlotCount)
  const getResearchBonus = useFacilityStore((s) => s.getResearchBonus)
  const getUpgradeCost  = useFacilityStore((s) => s.getUpgradeCost)
  const expandGuild     = useFacilityStore((s) => s.expandGuild)
  const researchGuild   = useFacilityStore((s) => s.researchGuild)

  const [assignOpen, setAssignOpen] = useState(false)
  const [pendingSlot, setPendingSlot] = useState(0)
  const [pickCharId, setPickCharId] = useState('')
  const [pickSellId, setPickSellId] = useState(SELL_CANDIDATES[0]?.id ?? '')
  const [pickMinStock, setPickMinStock] = useState(0)

  const slotCount     = getSlotCount('merchant')
  const researchBonus = getResearchBonus('merchant')
  const expandCost    = getUpgradeCost(facilityData.expansionLevel + 1)
  const researchCost  = getUpgradeCost(facilityData.researchLevel + 1)

  const assignedMerchants = characters.filter((c) => c.assignment?.type === 'merchant')
  const availableChars    = characters.filter((c) => c.assignment === null)
  const slots = Array.from({ length: slotCount }, (_, i) => assignedMerchants[i] ?? null)

  function openAssign(i: number) {
    setPendingSlot(i)
    setPickCharId(availableChars[0]?.id ?? '')
    setPickSellId(SELL_CANDIDATES[0]?.id ?? '')
    setPickMinStock(0)
    setAssignOpen(true)
  }

  function confirmAssign() {
    if (!pickCharId || !pickSellId) return
    setAssignment(pickCharId, { type: 'merchant', sellMaterialId: pickSellId, minStock: pickMinStock })
    setAssignOpen(false)
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-slate-200">商人ギルド</h1>

      <div className="bg-slate-800 rounded-lg p-3 text-sm space-y-1">
        <div className="flex justify-between text-slate-300">
          <span>枠数</span><span className="font-semibold">{slotCount}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>販売速度ボーナス</span>
          <span className="font-semibold text-green-400">+{(researchBonus * 100).toFixed(0)}%</span>
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={() => { if (spendGold(expandCost)) expandGuild('merchant') }} disabled={gold < expandCost}
            className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-500 rounded py-1.5">
            拡張 ({expandCost.toLocaleString()}G)
          </button>
          <button onClick={() => { if (spendGold(researchCost)) researchGuild('merchant') }} disabled={gold < researchCost}
            className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-500 rounded py-1.5">
            研究 ({researchCost.toLocaleString()}G)
          </button>
        </div>
      </div>

      <div>
        <div className="text-sm text-slate-400 mb-2">配置スロット</div>
        <div className="space-y-2">
          {slots.map((char, i) => {
            if (!char) return (
              <button key={i} onClick={() => openAssign(i)}
                className="w-full bg-slate-800 border border-dashed border-slate-600 hover:border-yellow-400 rounded-lg p-3 text-slate-500 hover:text-slate-300 text-sm transition-colors text-center">
                ＋ キャラクターを配置
              </button>
            )
            const master = getCharacterMaster(char.masterId)
            const asgn = char.assignment as Extract<typeof char.assignment, { type: 'merchant' }>
            const item = SELL_CANDIDATES.find((s) => s.id === asgn?.sellMaterialId)
            const stock = materials[asgn?.sellMaterialId ?? ''] ?? 0
            return (
              <div key={char.id} className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center text-sm font-bold text-slate-300 shrink-0">
                  {master?.name.slice(0, 1) ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-100 truncate">{master?.name}</div>
                  <div className="text-xs text-slate-400">
                    商人Lv.{char.merchantLevel}
                    {item && <span className="ml-2 text-green-400">→ {item.name} ({item.price}G) 最低{asgn.minStock}個 在庫{stock}</span>}
                  </div>
                </div>
                <button onClick={() => setAssignment(char.id, null)} className="text-xs text-slate-500 hover:text-red-400 shrink-0">解除</button>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <div className="text-sm text-slate-400 mb-2">手動販売（クリックで即時1個）</div>
        <div className="grid grid-cols-2 gap-2">
          {SELL_CANDIDATES.filter((s) => (materials[s.id] ?? 0) > 0).map((item) => (
            <button key={item.id} onClick={() => { if (removeMaterial(item.id, 1)) addGold(item.price) }}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-yellow-400 rounded-lg p-2 text-left transition-colors">
              <div className="text-xs font-semibold text-slate-200">{item.name}</div>
              <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                <span>{item.price}G</span><span>在庫:{materials[item.id] ?? 0}</span>
              </div>
            </button>
          ))}
        </div>
        {SELL_CANDIDATES.filter((s) => (materials[s.id] ?? 0) > 0).length === 0 && (
          <p className="text-sm text-slate-600 text-center py-4">販売できる素材がありません</p>
        )}
      </div>

      {assignOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setAssignOpen(false)}>
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-4 w-80 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold text-white">配置設定</div>
            <div>
              <div className="text-xs text-slate-400 mb-1">キャラクター</div>
              <select value={pickCharId} onChange={(e) => setPickCharId(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200">
                {availableChars.map((c) => {
                  const m = getCharacterMaster(c.masterId)
                  return <option key={c.id} value={c.id}>{m?.name ?? c.masterId} (商人Lv.{c.merchantLevel})</option>
                })}
              </select>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">販売する素材/商品</div>
              <select value={pickSellId} onChange={(e) => setPickSellId(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200">
                {SELL_CANDIDATES.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.price}G)</option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">最低保有数（この数を下回らないよう販売）</div>
              <input type="number" min={0} value={pickMinStock}
                onChange={(e) => setPickMinStock(Math.max(0, Number(e.target.value)))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAssignOpen(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded text-sm">キャンセル</button>
              <button onClick={confirmAssign} disabled={!pickCharId}
                className="flex-1 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-slate-900 font-bold py-2 rounded text-sm">配置</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
