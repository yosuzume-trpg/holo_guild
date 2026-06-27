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
import ItemIcon from '@/app/_components/facility/ItemIcon'

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

// 描画・選択用エントリ。未装備は (masterId, starRank) でまとめ、装備中は個別。
type Entry =
  | { kind: 'group'; key: string; masterId: string; starRank: number; count: number; instanceIds: string[] }
  | { kind: 'equipped'; key: string; masterId: string; starRank: number; instanceId: string; who: { name: string; starRank: number } }

export default function UpgradeGuildPage({ mode }: Props) {
  const slots = SLOTS_BY_MODE[mode]
  const [activeSlot, setActiveSlot] = useState<EquipmentSlot>(slots[0])
  // 選択キー: 'grp:<masterId>:<starRank>' | 'inst:<instanceId>' | ''
  const [sel, setSel] = useState<string>('')

  const gold       = useGameStore((s) => s.gold)
  const spendGold  = useGameStore((s) => s.spendGold)
  const equipment  = useInventoryStore((s) => s.equipment)
  const materials  = useInventoryStore((s) => s.materials)
  const removeMaterial = useInventoryStore((s) => s.removeMaterial)
  const upgradeEquipment = useInventoryStore((s) => s.upgradeEquipment)
  const characters = useCharacterStore((s) => s.characters)

  // instanceId → 装備中キャラ情報
  const equippedBy = new Map<string, { name: string; starRank: number }>()
  for (const char of characters) {
    for (const iid of Object.values(char.equipment)) {
      if (iid) equippedBy.set(iid, { name: getCharacterMaster(char.masterId)?.name ?? '?', starRank: char.starRank })
    }
  }

  const slotEquip = equipment.filter(
    (e) => EQUIPMENT_MASTERS.find((m) => m.id === e.masterId)?.slot === activeSlot,
  )

  // 未装備をグループ化
  const groupMap = new Map<string, Extract<Entry, { kind: 'group' }>>()
  for (const e of slotEquip) {
    if (equippedBy.has(e.instanceId)) continue
    const key = `grp:${e.masterId}:${e.starRank}`
    const g = groupMap.get(key) ?? {
      kind: 'group' as const, key, masterId: e.masterId, starRank: e.starRank, count: 0, instanceIds: [],
    }
    g.count++
    g.instanceIds.push(e.instanceId)
    groupMap.set(key, g)
  }
  const groupFor = (masterId: string, starRank: number) => groupMap.get(`grp:${masterId}:${starRank}`)

  // 装備中（個別）
  const equippedEntries: Entry[] = slotEquip
    .filter((e) => equippedBy.has(e.instanceId))
    .map((e) => ({
      kind: 'equipped', key: `inst:${e.instanceId}`, masterId: e.masterId, starRank: e.starRank,
      instanceId: e.instanceId, who: equippedBy.get(e.instanceId)!,
    }))

  const entries: Entry[] = [...groupMap.values(), ...equippedEntries].sort((a, b) => {
    const na = EQUIPMENT_MASTERS.find((m) => m.id === a.masterId)?.name ?? ''
    const nb = EQUIPMENT_MASTERS.find((m) => m.id === b.masterId)?.name ?? ''
    return na.localeCompare(nb, 'ja') || a.starRank - b.starRank
  })

  // 強化対象（残す側）として選べるか
  function canSelect(entry: Entry): boolean {
    if (entry.kind === 'group') return entry.count >= 2
    const g = groupFor(entry.masterId, entry.starRank)
    return !!g && g.count >= 1
  }

  // 選択 → 残す側 id1 / 消費する重複 id2
  function resolveIds(entry: Entry): { id1: string; id2: string } | null {
    if (entry.kind === 'group') {
      if (entry.instanceIds.length < 2) return null
      return { id1: entry.instanceIds[0], id2: entry.instanceIds[1] }
    }
    const g = groupFor(entry.masterId, entry.starRank)
    if (!g || g.count < 1) return null
    return { id1: entry.instanceId, id2: g.instanceIds[0] }
  }

  const selectedEntry = entries.find((e) => e.key === sel) ?? null
  const ids = selectedEntry ? resolveIds(selectedEntry) : null
  const targetStar = selectedEntry?.starRank ?? 0
  const matId = MATERIAL_BY_SLOT[activeSlot]
  const matNeeded = targetStar * EQUIP_UPGRADE_MAT_FACTOR
  const matHave = matId ? (materials[matId] ?? 0) : 0
  const upgradeCost = EQUIP_UPGRADE_GOLD_FACTOR * targetStar
  const canMerge = !!(selectedEntry && ids && matId)

  function handleUpgrade() {
    if (!selectedEntry || !ids || !matId) return
    if (gold < upgradeCost || matHave < matNeeded) return
    if (!spendGold(upgradeCost)) return
    if (!removeMaterial(matId, matNeeded)) return
    upgradeEquipment(ids.id1, ids.id2)
    setSel('')
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-ink">
        {mode === 'blacksmith' ? '鍛冶ギルド' : '仕立屋ギルド'}
      </h1>

      {/* Slot tabs */}
      <div className="flex gap-2">
        {slots.map((s) => (
          <button key={s} onClick={() => { setActiveSlot(s); setSel('') }}
            className={`flex-1 text-sm py-2 rounded border transition-colors ${
              activeSlot === s
                ? 'border-accent-strong text-accent-strong bg-surface'
                : 'border-line text-ink-muted hover:border-line-strong'
            }`}>
            {SLOT_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="text-sm text-ink-muted">
        強化したい装備をタップしてください（未装備の同名・同★ランクの重複から自動で1個消費します）。
      </div>

      {/* Equipment cards */}
      {entries.length === 0 ? (
        <p className="text-sm text-ink-subtle text-center py-6">装備がありません</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {entries.map((entry) => {
            const master = EQUIPMENT_MASTERS.find((m) => m.id === entry.masterId)
            const selectable = canSelect(entry)
            const isSelected = entry.key === sel
            return (
              <button
                key={entry.key}
                type="button"
                disabled={!selectable}
                onClick={() => setSel(isSelected ? '' : entry.key)}
                className={`flex items-center gap-2 h-20 text-left rounded-lg p-2 border transition-colors ${
                  !selectable
                    ? 'border-line bg-surface opacity-40 cursor-not-allowed'
                    : isSelected
                      ? 'border-accent-strong bg-surface-2'
                      : 'border-line bg-surface hover:border-accent-strong'
                }`}
              >
                <div className="relative w-12 aspect-5/4 shrink-0 self-center">
                  <ItemIcon id={entry.masterId} alt={master?.name ?? ''} />
                  {entry.kind === 'group' && entry.count > 1 && (
                    <span className="absolute -top-1 -right-1 bg-accent-strong text-ink text-[10px] font-bold rounded-full px-1 leading-tight">
                      ×{entry.count}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-ink truncate">
                    ★{entry.starRank} {master?.name}
                  </div>
                  <div className="text-[10px] text-success truncate">{master?.baseEffectLabel}</div>
                  {entry.kind === 'equipped' && (
                    <div className="text-[10px] text-accent-strong truncate">
                      {entry.who.name}（★{entry.who.starRank}）装備中
                    </div>
                  )}
                  {!selectable && (
                    <div className="text-[10px] text-ink-subtle">重複なし（合成不可）</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Action panel（下部固定バー） */}
      {selectedEntry && canMerge && (
        <div className="sticky bottom-0 z-10 -mx-4 -mb-4 px-4 pt-3 pb-4 bg-app border-t border-line space-y-2">
          <div className="text-sm text-ink">
            {selectedEntry.kind === 'group'
              ? `×${selectedEntry.count} のうち2個を合成 → ★${selectedEntry.starRank + 1}`
              : `未装備の重複×1を消費して ★${selectedEntry.starRank + 1} に強化（強化後も装備維持）`}
          </div>
          <div className="text-xs text-ink-muted space-y-0.5">
            <div>
              必要素材: {getMaterial(matId ?? '')?.name} × {matNeeded}
              <span className={matHave < matNeeded ? 'text-danger' : ''}>（所持: {matHave}）</span>
            </div>
            <div>
              費用: <span className={gold < upgradeCost ? 'text-danger' : ''}>{upgradeCost.toLocaleString()}G</span>
            </div>
          </div>
          <button onClick={handleUpgrade}
            disabled={gold < upgradeCost || matHave < matNeeded}
            className="w-full bg-accent hover:bg-accent-strong disabled:opacity-40 disabled:cursor-not-allowed text-ink font-bold py-2 rounded-lg text-sm transition-colors">
            合成して★アップ
          </button>
        </div>
      )}
    </div>
  )
}
