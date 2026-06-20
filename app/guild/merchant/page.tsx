'use client'

import { useState } from 'react'
import { MATERIALS } from '@/data/materials'
import { RECIPES } from '@/data/recipes'
import { getCharacterMaster } from '@/data/characters'
import { GR_FACILITY_LEVEL_CAP } from '@/data/constants'
import { useGameStore } from '@/store/gameStore'
import { useCharacterStore } from '@/store/characterStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { useFacilityStore } from '@/store/facilityStore'
import FacilityStatsBox from '@/app/_components/facility/FacilityStatsBox'
import AssignedSlotList from '@/app/_components/facility/AssignedSlotList'
import Modal from '@/app/_components/ui/Modal'

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
  const guildRank       = useGameStore((s) => s.guildRank)
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
  const [pickCharId, setPickCharId] = useState('')
  const [pickSellId, setPickSellId] = useState(SELL_CANDIDATES[0]?.id ?? '')
  const [pickMinStock, setPickMinStock] = useState(0)

  const slotCount     = getSlotCount('merchant')
  const researchBonus = getResearchBonus('merchant')
  const expandCost    = getUpgradeCost(facilityData.expansionLevel + 1)
  const researchCost  = getUpgradeCost(facilityData.researchLevel + 1)
  const maxLevel      = guildRank * GR_FACILITY_LEVEL_CAP

  const assignedMerchants = characters.filter((c) => c.assignment?.type === 'merchant')
  const availableChars    = characters.filter((c) => c.assignment === null)
  const slots = Array.from({ length: slotCount }, (_, i) => assignedMerchants[i] ?? null)

  function openAssign() {
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
      <h1 className="text-lg font-bold text-ink">商人ギルド</h1>

      <FacilityStatsBox
        slotCount={slotCount}
        slotNote={`(上限 GR×10=${maxLevel})`}
        bonusLabel="販売速度ボーナス"
        bonusPct={researchBonus}
        gold={gold}
        expandCost={expandCost}
        researchCost={researchCost}
        onExpand={() => { if (spendGold(expandCost)) expandGuild('merchant') }}
        onResearch={() => { if (spendGold(researchCost)) researchGuild('merchant') }}
        expandAtMax={facilityData.expansionLevel >= maxLevel}
        researchAtMax={facilityData.researchLevel >= maxLevel}
      />

      <AssignedSlotList
        slots={slots}
        onAddSlot={openAssign}
        onUnassign={(id) => setAssignment(id, null)}
        renderInfo={(char) => {
          const asgn = char.assignment as Extract<typeof char.assignment, { type: 'merchant' }>
          const item = SELL_CANDIDATES.find((s) => s.id === asgn?.sellMaterialId)
          const stock = materials[asgn?.sellMaterialId ?? ''] ?? 0
          return (
            <>
              商人Lv.{char.merchantLevel}
              {item && <span className="ml-2 text-success">→ {item.name} ({item.price}G) 最低{asgn.minStock}個 在庫{stock}</span>}
            </>
          )
        }}
      />

      <div>
        <div className="text-sm text-ink-muted mb-2">手動販売（クリックで即時1個）</div>
        <div className="grid grid-cols-2 gap-2">
          {SELL_CANDIDATES.filter((s) => (materials[s.id] ?? 0) > 0).map((item) => (
            <button key={item.id} onClick={() => { if (removeMaterial(item.id, 1)) addGold(item.price) }}
              className="bg-surface hover:bg-surface-2 border border-line hover:border-accent-strong rounded-lg p-2 text-left transition-colors">
              <div className="text-xs font-semibold text-ink">{item.name}</div>
              <div className="flex justify-between text-xs text-ink-muted mt-0.5">
                <span>{item.price}G</span><span>在庫:{materials[item.id] ?? 0}</span>
              </div>
            </button>
          ))}
        </div>
        {SELL_CANDIDATES.filter((s) => (materials[s.id] ?? 0) > 0).length === 0 && (
          <p className="text-sm text-ink-subtle text-center py-4">販売できる素材がありません</p>
        )}
      </div>

      {assignOpen && (
        <Modal onClose={() => setAssignOpen(false)} boxClassName="w-80 space-y-3">
          <div className="font-bold text-ink">配置設定</div>
          <div>
            <div className="text-xs text-ink-muted mb-1">キャラクター</div>
            <select value={pickCharId} onChange={(e) => setPickCharId(e.target.value)}
              className="w-full bg-app border border-line rounded px-2 py-1.5 text-sm text-ink">
              {availableChars.map((c) => {
                const m = getCharacterMaster(c.masterId)
                return <option key={c.id} value={c.id}>{m?.name ?? c.masterId} (商人Lv.{c.merchantLevel})</option>
              })}
            </select>
          </div>
          <div>
            <div className="text-xs text-ink-muted mb-1">販売する素材/商品</div>
            <select value={pickSellId} onChange={(e) => setPickSellId(e.target.value)}
              className="w-full bg-app border border-line rounded px-2 py-1.5 text-sm text-ink">
              {SELL_CANDIDATES.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.price}G)</option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs text-ink-muted mb-1">最低保有数（この数を下回らないよう販売）</div>
            <input type="number" min={0} value={pickMinStock}
              onChange={(e) => setPickMinStock(Math.max(0, Number(e.target.value)))}
              className="w-full bg-app border border-line rounded px-2 py-1.5 text-sm text-ink" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAssignOpen(false)}
              className="flex-1 bg-surface-2 hover:bg-surface-3 text-ink py-2 rounded text-sm">キャンセル</button>
            <button onClick={confirmAssign} disabled={!pickCharId}
              className="flex-1 bg-accent hover:bg-accent-strong disabled:opacity-40 text-ink font-bold py-2 rounded text-sm">配置</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
