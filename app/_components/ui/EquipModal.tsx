'use client'

import { getCharacterMaster } from '@/data/characters'
import { getEquipment, EQUIPMENT_MASTERS } from '@/data/equipment'
import type { CharacterInstance, EquipmentInstance, EquipmentSlot } from '@/types/game'

const SLOT_LABEL: Record<EquipmentSlot, string> = {
  weapon:    '武器',
  armor:     '防具',
  accessory: 'アクセサリー',
  tool:      '道具',
}

interface Props {
  char: CharacterInstance
  slot: EquipmentSlot
  characters: CharacterInstance[]
  equipment: EquipmentInstance[]
  equip: (id: string, slot: EquipmentSlot, equipInstanceId: string | null) => void
  onClose: () => void
}

/**
 * 装備スロットの変更用ボトムシート。
 * 他キャラ装備中・★ランク超過のアイテムは選択不可。
 */
export default function EquipModal({ char, slot, characters, equipment, equip, onClose }: Props) {
  // 他キャラが装備中の instanceId 一覧
  const equippedByOthers = new Set(
    characters
      .filter((c) => c.id !== char.id)
      .flatMap((c) => Object.values(c.equipment).filter(Boolean) as string[])
  )

  const slotItems = equipment.filter((e) => {
    const m = EQUIPMENT_MASTERS.find((em) => em.id === e.masterId)
    return m?.slot === slot
  })

  // 表示順の優先度: 装備中(自分) → 装備可能(フリー・ランクOK) → ランク超過 → 他キャラ装備中。
  const sortPriority = (e: EquipmentInstance): number => {
    if (char.equipment[slot] === e.instanceId) return 0
    if (equippedByOthers.has(e.instanceId)) return 3
    return e.starRank > char.starRank ? 2 : 1
  }
  const sortedItems = [...slotItems].sort((a, b) => sortPriority(a) - sortPriority(b))

  // 誰も装備していない（フリーな）装備を「同名＋同★ランク」でまとめる
  const freeKey = (e: EquipmentInstance) => `${e.masterId}__${e.starRank}`
  const freeGroups = new Map<string, EquipmentInstance[]>()
  for (const e of slotItems) {
    const isEquipped = char.equipment[slot] === e.instanceId
    const usedByOther = equippedByOthers.has(e.instanceId)
    if (isEquipped || usedByOther) continue
    const arr = freeGroups.get(freeKey(e))
    if (arr) arr.push(e)
    else freeGroups.set(freeKey(e), [e])
  }
  // 各グループは最初に出現したときだけ1行で描画する
  const renderedGroups = new Set<string>()

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface border border-line rounded-t-2xl w-full max-w-lg p-4 space-y-3 max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="font-bold text-ink">{SLOT_LABEL[slot]} 変更</div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-xl leading-none">×</button>
        </div>

        {/* 外す */}
        {char.equipment[slot] && (
          <button
            onClick={() => { equip(char.id, slot, null); onClose() }}
            className="w-full bg-surface-2 hover:bg-surface-3 border border-line-strong rounded-lg px-3 py-2.5 text-left text-sm text-danger"
          >
            外す
          </button>
        )}

        {slotItems.length === 0 ? (
          <p className="text-sm text-ink-subtle text-center py-2">所持装備なし</p>
        ) : (
          sortedItems.map((e) => {
            const m = getEquipment(e.masterId)
            const isEquipped  = char.equipment[slot] === e.instanceId
            const usedByOther = equippedByOthers.has(e.instanceId)
            const rankTooHigh = e.starRank > char.starRank

            // フリーな装備は同名＋同★でまとめて1行（個数を併記）にする
            if (!isEquipped && !usedByOther) {
              const key = freeKey(e)
              if (renderedGroups.has(key)) return null
              renderedGroups.add(key)
              const count = freeGroups.get(key)?.length ?? 1
              const isDisabled = rankTooHigh
              return (
                <button key={key}
                  disabled={isDisabled}
                  onClick={() => { if (!isDisabled) { equip(char.id, slot, e.instanceId); onClose() } }}
                  className={`w-full rounded-lg px-3 py-2.5 text-left border transition-colors ${
                    isDisabled
                      ? 'border-line bg-surface opacity-50 cursor-not-allowed'
                      : 'border-line bg-surface-2 hover:bg-surface-3 text-ink'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">
                      ★{e.starRank} {m?.name}
                      {count > 1 && <span className="text-ink-subtle font-normal"> ×{count}</span>}
                    </span>
                    {rankTooHigh && (
                      <span className="text-xs text-danger">★{char.starRank}以下のみ</span>
                    )}
                  </div>
                  {m?.baseEffectLabel && (
                    <div className="text-xs text-success mt-0.5">{m.baseEffectLabel}</div>
                  )}
                </button>
              )
            }

            // 装備中（自分 or 他キャラ）は個別に表示
            const isDisabled  = usedByOther && !isEquipped
            const otherChar   = usedByOther
              ? characters.find((c) => c.id !== char.id && Object.values(c.equipment).includes(e.instanceId))
              : null
            const otherName   = otherChar ? getCharacterMaster(otherChar.masterId)?.name : null
            return (
              <button key={e.instanceId}
                disabled={isDisabled}
                onClick={() => { if (!isDisabled) { equip(char.id, slot, e.instanceId); onClose() } }}
                className={`w-full rounded-lg px-3 py-2.5 text-left border transition-colors ${
                  isEquipped
                    ? 'border-accent-strong bg-surface-2 text-accent-strong'
                    : isDisabled
                    ? 'border-line bg-surface opacity-50 cursor-not-allowed'
                    : 'border-line bg-surface-2 hover:bg-surface-3 text-ink'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">★{e.starRank} {m?.name}</span>
                  {isEquipped && <span className="text-xs text-accent-strong">装備中</span>}
                  {!isEquipped && usedByOther && (
                    <span className="text-xs text-ink-subtle">{otherName} が装備中</span>
                  )}
                </div>
                {m?.baseEffectLabel && (
                  <div className="text-xs text-success mt-0.5">{m.baseEffectLabel}</div>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
