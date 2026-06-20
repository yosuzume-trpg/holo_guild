'use client'

import { useState } from 'react'
import type { EquipmentSlot } from '@/types/game'
import { EQUIPMENT_MASTERS } from '@/data/equipment'
import { getMaterial } from '@/data/materials'
import { useGameStore } from '@/store/gameStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { useCharacterStore } from '@/store/characterStore'
import { getCharacterMaster } from '@/data/characters'
import { EQUIP_UPGRADE_MAT_FACTOR, EQUIP_UPGRADE_GOLD_FACTOR } from '@/data/constants'

interface Props {
  mode: 'blacksmith' | 'tailor'
}

const SLOTS_BY_MODE: Record<Props['mode'], EquipmentSlot[]> = {
  blacksmith: ['weapon', 'tool'],
  tailor:     ['armor', 'accessory'],
}

const SLOT_LABEL: Record<EquipmentSlot, string> = {
  weapon: '武器', armor: '防具', accessory: 'アクセサリー', tool: '道具',
}

const MATERIAL_BY_SLOT: Record<EquipmentSlot, string | null> = {
  weapon:    'monstertooth',
  tool:      'monstertooth',
  armor:     'monsterhide',
  accessory: 'monsterhide',
}

export default function UpgradeGuildPage({ mode }: Props) {
  const slots = SLOTS_BY_MODE[mode]
  const [activeSlot, setActiveSlot] = useState<EquipmentSlot>(slots[0])
  const [sel1, setSel1] = useState<string>('')
  const [sel2, setSel2] = useState<string>('')

  const gold       = useGameStore((s) => s.gold)
  const spendGold  = useGameStore((s) => s.spendGold)
  const equipment  = useInventoryStore((s) => s.equipment)
  const removeMaterial = useInventoryStore((s) => s.removeMaterial)
  const upgradeEquipment = useInventoryStore((s) => s.upgradeEquipment)
  const characters = useCharacterStore((s) => s.characters)

  // Map: instanceId → { name, starRank } of equipped character
  const equippedBy = new Map<string, { name: string; starRank: number }>()
  for (const char of characters) {
    for (const iid of Object.values(char.equipment)) {
      if (iid) equippedBy.set(iid, { name: getCharacterMaster(char.masterId)?.name ?? '?', starRank: char.starRank })
    }
  }

  const slotEquipment = equipment
    .filter((e) => {
      const master = EQUIPMENT_MASTERS.find((m) => m.id === e.masterId)
      return master?.slot === activeSlot
    })
    .sort((a, b) => {
      const nameA = EQUIPMENT_MASTERS.find((m) => m.id === a.masterId)?.name ?? ''
      const nameB = EQUIPMENT_MASTERS.find((m) => m.id === b.masterId)?.name ?? ''
      return nameA.localeCompare(nameB, 'ja') || a.starRank - b.starRank
    })

  const item1 = slotEquipment.find((e) => e.instanceId === sel1)
  const item2 = slotEquipment.find((e) => e.instanceId === sel2)

  const canMerge = !!(
    sel1 && sel2 && sel1 !== sel2 &&
    item1 && item2 &&
    item1.masterId === item2.masterId &&
    item1.starRank === item2.starRank
  )

  const matId = MATERIAL_BY_SLOT[activeSlot]
  const matNeeded = item1 ? item1.starRank * EQUIP_UPGRADE_MAT_FACTOR : 0
  const matHave = matId ? (useInventoryStore.getState().materials[matId] ?? 0) : 0
  const upgradeCost = item1 ? EQUIP_UPGRADE_GOLD_FACTOR * item1.starRank : 0

  function handleUpgrade() {
    if (!canMerge || !matId) return
    if (gold < upgradeCost) return
    if (matHave < matNeeded) return
    if (!spendGold(upgradeCost)) return
    if (!removeMaterial(matId, matNeeded)) return
    upgradeEquipment(sel1, sel2)
    setSel1('')
    setSel2('')
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-ink">
        {mode === 'blacksmith' ? '鍛冶ギルド' : '仕立屋ギルド'}
      </h1>

      {/* Slot tabs */}
      <div className="flex gap-2">
        {slots.map((s) => (
          <button key={s} onClick={() => { setActiveSlot(s); setSel1(''); setSel2('') }}
            className={`flex-1 text-sm py-2 rounded border transition-colors ${
              activeSlot === s
                ? 'border-accent-strong text-accent-strong bg-surface'
                : 'border-line text-ink-muted hover:border-line-strong'
            }`}>
            {SLOT_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Merge panel */}
      <div className="bg-surface border border-line rounded-xl p-4">
        <div className="text-sm text-ink-muted mb-3">同じ種類・同じ★ランクを2つ選んで合成</div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {(['sel1', 'sel2'] as const).map((selKey) => {
            const isSel1 = selKey === 'sel1'
            const selVal = isSel1 ? sel1 : sel2
            const setFn  = isSel1 ? setSel1 : setSel2
            const other  = isSel1 ? sel2 : sel1
            const item   = slotEquipment.find((e) => e.instanceId === selVal)
            const master = item ? EQUIPMENT_MASTERS.find((m) => m.id === item.masterId) : null
            const candidates = slotEquipment.filter((e) => {
              if (e.instanceId === other) return false
              if (!isSel1) {
                if (equippedBy.has(e.instanceId)) return false
                if (item1 && e.masterId !== item1.masterId) return false
                if (item1 && e.starRank !== item1.starRank) return false
              }
              return true
            })
            const equippedInfo = item ? equippedBy.get(item.instanceId) : undefined
            const disabled = !isSel1 && !sel1
            return (
              <div key={selKey}>
                <div className="text-xs text-ink-subtle mb-1">
                  {isSel1 ? '素材①' : `素材②（未装備のみ）${disabled ? ' — 素材①を先に選択' : ''}`}
                </div>
                <select
                  value={selVal}
                  onChange={(e) => setFn(e.target.value)}
                  disabled={disabled}
                  className="w-full bg-app border border-line rounded px-2 py-1.5 text-xs text-ink disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option value="">選択</option>
                  {candidates.map((e) => {
                    const m = EQUIPMENT_MASTERS.find((em) => em.id === e.masterId)
                    const who = isSel1 ? equippedBy.get(e.instanceId) : undefined
                    return (
                      <option key={e.instanceId} value={e.instanceId}>
                        ★{e.starRank} {m?.name}{who ? ` [★${who.starRank} ${who.name}装備中]` : ''}
                      </option>
                    )
                  })}
                </select>
                {master && item && (
                  <div className="mt-1 text-xs text-ink-muted">
                    ★{item.starRank} {master.name}
                    <div className="text-success">{master.baseEffectLabel}</div>
                    {equippedInfo && (
                      <div className="text-accent-strong">⚡ ★{equippedInfo.starRank} {equippedInfo.name} が装備中 → 強化後も装備維持</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {canMerge && (
          <div className="text-xs text-ink-muted mb-3 space-y-0.5">
            <div>必要素材: {getMaterial(matId ?? '')?.name} × {matNeeded}（所持: {matHave}）</div>
            <div>費用: {upgradeCost.toLocaleString()}G</div>
          </div>
        )}

        <button onClick={handleUpgrade}
          disabled={!canMerge || gold < upgradeCost || matHave < matNeeded}
          className="w-full bg-accent hover:bg-accent-strong disabled:opacity-40 disabled:cursor-not-allowed text-ink font-bold py-2 rounded-lg text-sm transition-colors">
          合成して★アップ
        </button>
      </div>

      {/* Inventory list */}
      <div>
        <div className="text-sm text-ink-muted mb-2">{SLOT_LABEL[activeSlot]}一覧</div>
        {slotEquipment.length === 0 ? (
          <p className="text-sm text-ink-subtle text-center py-4">装備がありません</p>
        ) : (
          <div className="space-y-1">
            {slotEquipment.map((e) => {
              const master = EQUIPMENT_MASTERS.find((m) => m.id === e.masterId)
              const who = equippedBy.get(e.instanceId)
              return (
                <div key={e.instanceId} className="bg-surface border border-line rounded-lg px-3 py-2 flex justify-between text-sm items-center">
                  <div>
                    <span className="text-ink">★{e.starRank} {master?.name}</span>
                    {who && (
                      <span className="ml-2 text-xs text-accent-strong">★{who.starRank} {who.name}</span>
                    )}
                  </div>
                  <span className="text-success text-xs">{master?.baseEffectLabel}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
