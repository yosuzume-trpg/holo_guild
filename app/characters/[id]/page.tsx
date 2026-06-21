'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useCharacterStore } from '@/store/characterStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { useGameStore } from '@/store/gameStore'
import { getCharacterMaster } from '@/data/characters'
import { getEquipment, EQUIPMENT_MASTERS } from '@/data/equipment'
import type { EquipmentSlot } from '@/types/game'
import {
  STAR_GOLD_COST_FACTOR, AFFECTION_POINTS_PER_LEVEL, AFFECTION_GAIN_MIN, AFFECTION_GAIN_RANGE,
} from '@/data/constants'
import { calcCharacterStats, calcMaxHp } from '@/utils/characterStats'
import ProgressBar from '@/app/_components/ui/ProgressBar'
import CharacterAvatar from '@/app/_components/ui/CharacterAvatar'

const TENDENCY_LABEL: Record<string, string> = {
  standard: '標準',
  attack:   '攻撃',
  magic:    '魔法',
  defense:  '防御',
  speed:    '速度',
}

const TENDENCY_COLOR: Record<string, string> = {
  standard: 'bg-surface-3',
  attack:   'bg-red-600',
  magic:    'bg-purple-600',
  defense:  'bg-blue-600',
  speed:    'bg-green-600',
}

const SLOT_LABEL: Record<string, string> = {
  weapon:    '武器',
  armor:     '防具',
  accessory: 'アクセサリー',
  tool:      '道具',
}

export default function CharacterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const characters       = useCharacterStore((s) => s.characters)
  const socialize        = useCharacterStore((s) => s.socialize)
  const equip            = useCharacterStore((s) => s.equip)
  const upgradeStarRank  = useCharacterStore((s) => s.upgradeStarRank)
  const gold             = useGameStore((s) => s.gold)
  const spendGold        = useGameStore((s) => s.spendGold)
  const socializedThisCycle = useGameStore((s) => s.socializedThisCycle)
  const equipment        = useInventoryStore((s) => s.equipment)

  const [equipModal, setEquipModal] = useState<EquipmentSlot | null>(null)

  const char = characters.find((c) => c.id === id)
  if (!char) {
    return (
      <div className="p-4 text-ink-muted">
        <Link href="/characters" className="text-sm text-ink-muted hover:text-ink mb-4 block">
          ← 一覧に戻る
        </Link>
        キャラクターが見つかりません
      </div>
    )
  }

  const master   = getCharacterMaster(char.masterId)
  const maxHp    = calcMaxHp(char, equipment)
  const hpPct    = Math.round((char.currentHp / maxHp) * 100)
  const affPct   = Math.round((char.affectionPoints / (char.affectionLevel * AFFECTION_POINTS_PER_LEVEL)) * 100)

  const effStats = calcCharacterStats(char, equipment).total

  const equippedItems = {
    weapon:    char.equipment.weapon    ? equipment.find((e) => e.instanceId === char.equipment.weapon)    : null,
    armor:     char.equipment.armor     ? equipment.find((e) => e.instanceId === char.equipment.armor)     : null,
    accessory: char.equipment.accessory ? equipment.find((e) => e.instanceId === char.equipment.accessory) : null,
    tool:      char.equipment.tool      ? equipment.find((e) => e.instanceId === char.equipment.tool)      : null,
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <Link href="/characters" className="text-sm text-ink-muted hover:text-ink mb-4 block">
        ← 一覧に戻る
      </Link>

      {/* Header */}
      <div className="bg-surface border border-line rounded-xl p-4 mb-4 text-center">
        <div className="relative inline-block">
          <CharacterAvatar masterId={char.masterId} size="2xl" className="mx-auto mb-2" />
          <span className="absolute top-0 right-0 bg-accent text-ink text-xs font-bold px-1.5 py-0.5 rounded">
            ★{char.starRank}
          </span>
        </div>
        <div className="text-xl font-bold text-ink mb-1">
          {master?.name ?? char.masterId}
        </div>
        <div className="flex justify-center gap-2 mb-2">
          <span className={`text-xs px-2 py-0.5 rounded-full text-white ${TENDENCY_COLOR[char.tendency]}`}>
            {TENDENCY_LABEL[char.tendency]}タイプ
          </span>
        </div>
        {(() => {
          const certCost = Math.pow(2, char.starRank - 1)
          const goldCost = STAR_GOLD_COST_FACTOR * char.starRank
          const canUpgrade = char.certificates >= certCost && gold >= goldCost
          return (
            <div className="flex items-center justify-center gap-3 text-xs">
              <span className="text-ink-muted">証書 {char.certificates}枚</span>
              <button
                onClick={() => { if (spendGold(goldCost)) upgradeStarRank(char.id) }}
                disabled={!canUpgrade}
                className="bg-accent hover:bg-accent-strong disabled:opacity-40 disabled:cursor-not-allowed text-ink font-bold px-3 py-1 rounded-full transition-colors"
              >
                ★アップ（証書×{certCost} / {goldCost}G）
              </button>
            </div>
          )
        })()}
      </div>

      {/* HP */}
      <div className="bg-surface border border-line rounded-lg p-3 mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-ink-muted">HP</span>
          <span className="text-ink">{char.currentHp} / {maxHp}</span>
        </div>
        <ProgressBar
          pct={hpPct}
          heightClass="h-2"
          color={hpPct > 50 ? 'bg-green-500' : hpPct > 25 ? 'bg-accent' : 'bg-red-500'}
          barClassName=""
        />
      </div>

      {/* Stats */}
      <div className="bg-surface border border-line rounded-lg p-3 mb-3">
        <div className="text-sm font-semibold text-ink mb-2">ステータス</div>
        <div className="grid grid-cols-3 gap-2 text-xs text-center">
          {([
            ['攻撃', effStats.atk, char.stats.atk],
            ['防御', effStats.def, char.stats.def],
            ['魔力', effStats.mag, char.stats.mag],
            ['魔防', effStats.mdef, char.stats.mdef],
            ['素早', effStats.spd, char.stats.spd],
          ] as [string, number, number][]).map(([label, eff, base]) => (
            <div key={label} className="bg-surface-2 rounded p-2">
              <div className="text-ink-muted">{label}</div>
              <div className="text-ink font-semibold">{eff}</div>
              {eff !== base && <div className="text-success text-xs">({base})</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Levels */}
      <div className="bg-surface border border-line rounded-lg p-3 mb-3">
        <div className="text-sm font-semibold text-ink mb-2">レベル</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {[
            ['戦闘', char.battleLevel],
            ['農業', char.farmLevel],
            ['鉱業', char.miningLevel],
            ['漁業', char.fishingLevel],
            ['錬金', char.alchemyLevel],
            ['工芸', char.craftLevel],
            ['商人', char.merchantLevel],
          ].map(([label, lv]) => (
            <div key={label as string} className="flex justify-between text-ink">
              <span className="text-ink-muted">{label}</span>
              <span>Lv.{lv}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Equipment */}
      <div className="bg-surface border border-line rounded-lg p-3 mb-3">
        <div className="text-sm font-semibold text-ink mb-2">装備</div>
        <div className="space-y-1.5">
          {(['weapon', 'armor', 'accessory', 'tool'] as const).map((slot) => {
            const inst = equippedItems[slot]
            const mast = inst ? getEquipment(inst.masterId) : null
            return (
              <button key={slot} onClick={() => setEquipModal(slot)}
                className="w-full flex justify-between items-center text-sm bg-surface-2 hover:bg-surface-3 rounded px-3 py-2 transition-colors">
                <span className="text-ink-muted w-20 text-left">{SLOT_LABEL[slot]}</span>
                {mast ? (
                  <span className="text-ink">★{inst!.starRank} {mast.name}</span>
                ) : (
                  <span className="text-ink-subtle">未装備（タップで変更）</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Equipment modal */}
      {equipModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50"
          onClick={() => setEquipModal(null)}>
          <div className="bg-surface border border-line rounded-t-2xl w-full max-w-lg p-4 space-y-3 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="font-bold text-ink">{SLOT_LABEL[equipModal]} 変更</div>
              <button onClick={() => setEquipModal(null)} className="text-ink-muted hover:text-ink text-xl leading-none">×</button>
            </div>

            {/* Unequip option */}
            {char.equipment[equipModal] && (
              <button onClick={() => { equip(char.id, equipModal, null); setEquipModal(null) }}
                className="w-full bg-surface-2 hover:bg-surface-3 border border-line-strong rounded-lg px-3 py-2.5 text-left text-sm text-danger">
                外す
              </button>
            )}

            {/* Available items for this slot */}
            {(() => {
              // Build set of instance IDs equipped by OTHER characters
              const equippedByOthers = new Set(
                characters
                  .filter((c) => c.id !== char.id)
                  .flatMap((c) => Object.values(c.equipment).filter(Boolean) as string[])
              )

              const slotItems = equipment.filter((e) => {
                const m = EQUIPMENT_MASTERS.find((em) => em.id === e.masterId)
                return m?.slot === equipModal
              })
              if (slotItems.length === 0) {
                return <p className="text-sm text-ink-subtle text-center py-2">所持装備なし</p>
              }
              return slotItems.map((e) => {
                const m = getEquipment(e.masterId)
                const isEquipped    = char.equipment[equipModal] === e.instanceId
                const usedByOther   = equippedByOthers.has(e.instanceId)
                const rankTooHigh   = e.starRank > char.starRank
                const isDisabled    = (usedByOther || rankTooHigh) && !isEquipped
                const otherChar     = usedByOther
                  ? characters.find((c) => c.id !== char.id && Object.values(c.equipment).includes(e.instanceId))
                  : null
                const otherName     = otherChar ? getCharacterMaster(otherChar.masterId)?.name : null
                return (
                  <button key={e.instanceId}
                    disabled={isDisabled}
                    onClick={() => { if (!isDisabled) { equip(char.id, equipModal, e.instanceId); setEquipModal(null) } }}
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
                      {!isEquipped && !usedByOther && rankTooHigh && (
                        <span className="text-xs text-danger">★{char.starRank}以下のみ</span>
                      )}
                    </div>
                    {m?.baseEffectLabel && (
                      <div className="text-xs text-success mt-0.5">{m.baseEffectLabel}</div>
                    )}
                  </button>
                )
              })
            })()}
          </div>
        </div>
      )}

      {/* Affection */}
      <div className="bg-surface border border-line rounded-lg p-3 mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-ink-muted">親愛度 Lv.{char.affectionLevel}</span>
          <span className="text-ink">{char.affectionPoints} / {char.affectionLevel * AFFECTION_POINTS_PER_LEVEL}</span>
        </div>
        <div className="mb-2">
          <ProgressBar pct={affPct} color="bg-pink-500" barClassName="" />
        </div>
        <button
          onClick={() => socialize(char.id)}
          disabled={socializedThisCycle}
          className="w-full bg-pink-700 hover:bg-pink-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 rounded-lg transition-colors"
        >
          {char.socializedThisCycle
            ? 'このサイクルは交遊済み'
            : socializedThisCycle
            ? '今サイクルは別のキャラと交遊済み'
            : `交遊する (+${AFFECTION_GAIN_MIN}〜${AFFECTION_GAIN_MIN + AFFECTION_GAIN_RANGE - 1} pt)`}
        </button>
      </div>
    </div>
  )
}
