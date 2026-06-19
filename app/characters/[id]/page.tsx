'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useCharacterStore } from '@/store/characterStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { getCharacterMaster } from '@/data/characters'
import { getEquipment, EQUIPMENT_MASTERS } from '@/data/equipment'
import type { EquipmentSlot } from '@/types/game'

const TENDENCY_LABEL: Record<string, string> = {
  standard: '標準',
  attack:   '攻撃',
  magic:    '魔法',
  defense:  '防御',
  speed:    '速度',
}

const TENDENCY_COLOR: Record<string, string> = {
  standard: 'bg-slate-500',
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
  const equipment        = useInventoryStore((s) => s.equipment)

  const [equipModal, setEquipModal] = useState<EquipmentSlot | null>(null)

  const char = characters.find((c) => c.id === id)
  if (!char) {
    return (
      <div className="p-4 text-slate-400">
        <Link href="/characters" className="text-sm text-slate-400 hover:text-white mb-4 block">
          ← 一覧に戻る
        </Link>
        キャラクターが見つかりません
      </div>
    )
  }

  const master   = getCharacterMaster(char.masterId)
  const hpPct    = Math.round((char.currentHp / char.stats.hp) * 100)
  const affPct   = Math.round((char.affectionPoints / (char.affectionLevel * 100)) * 100)

  // Effective stats: character star rank × equipment star rank
  const starBonus = (char.starRank - 1) * 0.2
  const effStats = (() => {
    let atkM = 1 + starBonus, defM = 1 + starBonus, magM = 1 + starBonus
    let mdefM = 1 + starBonus, hpM = 1 + starBonus, spdM = 1 + starBonus
    for (const slot of ['weapon', 'armor', 'accessory'] as const) {
      const inst = equipment.find((e) => e.instanceId === char.equipment[slot])
      const master = inst ? getEquipment(inst.masterId) : null
      if (!master || !inst) continue
      const s = inst.starRank
      atkM  += (master.effects.atkPercent  ?? 0) / 100 * s
      defM  += (master.effects.defPercent  ?? 0) / 100 * s
      magM  += (master.effects.magPercent  ?? 0) / 100 * s
      mdefM += (master.effects.mdefPercent ?? 0) / 100 * s
      hpM   += (master.effects.hpPercent   ?? 0) / 100 * s
      spdM  += (master.effects.spdPercent  ?? 0) / 100 * s
    }
    const b = char.stats
    return {
      hp: Math.floor(b.hp * hpM), atk: Math.floor(b.atk * atkM), def: Math.floor(b.def * defM),
      mag: Math.floor(b.mag * magM), mdef: Math.floor(b.mdef * mdefM), spd: Math.floor(b.spd * spdM),
    }
  })()

  const equippedItems = {
    weapon:    char.equipment.weapon    ? equipment.find((e) => e.instanceId === char.equipment.weapon)    : null,
    armor:     char.equipment.armor     ? equipment.find((e) => e.instanceId === char.equipment.armor)     : null,
    accessory: char.equipment.accessory ? equipment.find((e) => e.instanceId === char.equipment.accessory) : null,
    tool:      char.equipment.tool      ? equipment.find((e) => e.instanceId === char.equipment.tool)      : null,
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <Link href="/characters" className="text-sm text-slate-400 hover:text-white mb-4 block">
        ← 一覧に戻る
      </Link>

      {/* Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4 text-center">
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-full bg-slate-600 flex items-center justify-center text-4xl font-bold text-slate-300 mx-auto mb-2">
            {master?.name.slice(0, 1) ?? '?'}
          </div>
          <span className="absolute top-0 right-0 bg-yellow-500 text-slate-900 text-xs font-bold px-1.5 py-0.5 rounded">
            ★{char.starRank}
          </span>
        </div>
        <div className="text-xl font-bold text-slate-100 mb-1">
          {master?.name ?? char.masterId}
        </div>
        <div className="flex justify-center gap-2 mb-2">
          <span className={`text-xs px-2 py-0.5 rounded-full text-white ${TENDENCY_COLOR[char.tendency]}`}>
            {TENDENCY_LABEL[char.tendency]}タイプ
          </span>
        </div>
        <div className="flex items-center justify-center gap-3 text-xs">
          <span className="text-slate-400">証書 {char.certificates}枚</span>
          {char.starRank < 5 ? (
            <button
              onClick={() => upgradeStarRank(char.id)}
              disabled={char.certificates < char.starRank * 10}
              className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-bold px-3 py-1 rounded-full transition-colors"
            >
              ★アップ（証書×{char.starRank * 10}）
            </button>
          ) : (
            <span className="text-yellow-300 font-bold">MAX</span>
          )}
        </div>
      </div>

      {/* HP */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-400">HP</span>
          <span className="text-slate-200">{char.currentHp} / {char.stats.hp}</span>
        </div>
        <div className="w-full h-2 bg-slate-700 rounded-full">
          <div
            className={`h-full rounded-full ${hpPct > 50 ? 'bg-green-500' : hpPct > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${hpPct}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 mb-3">
        <div className="text-sm font-semibold text-slate-300 mb-2">ステータス</div>
        <div className="grid grid-cols-3 gap-2 text-xs text-center">
          {([
            ['攻撃', effStats.atk, char.stats.atk],
            ['防御', effStats.def, char.stats.def],
            ['魔力', effStats.mag, char.stats.mag],
            ['魔防', effStats.mdef, char.stats.mdef],
            ['素早', effStats.spd, char.stats.spd],
          ] as [string, number, number][]).map(([label, eff, base]) => (
            <div key={label} className="bg-slate-700 rounded p-2">
              <div className="text-slate-400">{label}</div>
              <div className="text-slate-100 font-semibold">{eff}</div>
              {eff !== base && <div className="text-green-400 text-xs">({base})</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Levels */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 mb-3">
        <div className="text-sm font-semibold text-slate-300 mb-2">レベル</div>
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
            <div key={label as string} className="flex justify-between text-slate-300">
              <span className="text-slate-400">{label}</span>
              <span>Lv.{lv}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Equipment */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 mb-3">
        <div className="text-sm font-semibold text-slate-300 mb-2">装備</div>
        <div className="space-y-1.5">
          {(['weapon', 'armor', 'accessory', 'tool'] as const).map((slot) => {
            const inst = equippedItems[slot]
            const mast = inst ? getEquipment(inst.masterId) : null
            return (
              <button key={slot} onClick={() => setEquipModal(slot)}
                className="w-full flex justify-between items-center text-sm bg-slate-700 hover:bg-slate-600 rounded px-3 py-2 transition-colors">
                <span className="text-slate-400 w-20 text-left">{SLOT_LABEL[slot]}</span>
                {mast ? (
                  <span className="text-slate-100">★{inst!.starRank} {mast.name}</span>
                ) : (
                  <span className="text-slate-500">未装備（タップで変更）</span>
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
          <div className="bg-slate-800 border border-slate-600 rounded-t-2xl w-full max-w-lg p-4 space-y-3 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="font-bold text-white">{SLOT_LABEL[equipModal]} 変更</div>
              <button onClick={() => setEquipModal(null)} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
            </div>

            {/* Unequip option */}
            {char.equipment[equipModal] && (
              <button onClick={() => { equip(char.id, equipModal, null); setEquipModal(null) }}
                className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg px-3 py-2.5 text-left text-sm text-red-400">
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
                return <p className="text-sm text-slate-500 text-center py-2">所持装備なし</p>
              }
              return slotItems.map((e) => {
                const m = getEquipment(e.masterId)
                const isEquipped  = char.equipment[equipModal] === e.instanceId
                const usedByOther = equippedByOthers.has(e.instanceId)
                const otherChar   = usedByOther
                  ? characters.find((c) => c.id !== char.id && Object.values(c.equipment).includes(e.instanceId))
                  : null
                const otherName   = otherChar ? getCharacterMaster(otherChar.masterId)?.name : null
                return (
                  <button key={e.instanceId}
                    disabled={usedByOther && !isEquipped}
                    onClick={() => { if (!usedByOther) { equip(char.id, equipModal, e.instanceId); setEquipModal(null) } }}
                    className={`w-full rounded-lg px-3 py-2.5 text-left border transition-colors ${
                      isEquipped
                        ? 'border-yellow-400 bg-yellow-900 text-yellow-100'
                        : usedByOther
                        ? 'border-slate-700 bg-slate-800 opacity-50 cursor-not-allowed'
                        : 'border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-200'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold">★{e.starRank} {m?.name}</span>
                      {isEquipped && <span className="text-xs text-yellow-400">装備中</span>}
                      {usedByOther && !isEquipped && (
                        <span className="text-xs text-slate-500">{otherName} が装備中</span>
                      )}
                    </div>
                    {m?.baseEffectLabel && (
                      <div className="text-xs text-green-400 mt-0.5">{m.baseEffectLabel}</div>
                    )}
                  </button>
                )
              })
            })()}
          </div>
        </div>
      )}

      {/* Affection */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-400">親愛度 Lv.{char.affectionLevel}</span>
          <span className="text-slate-200">{char.affectionPoints} / {char.affectionLevel * 100}</span>
        </div>
        <div className="w-full h-1.5 bg-slate-700 rounded-full mb-2">
          <div
            className="h-full bg-pink-500 rounded-full"
            style={{ width: `${affPct}%` }}
          />
        </div>
        <button
          onClick={() => socialize(char.id)}
          disabled={char.socializedThisCycle}
          className="w-full bg-pink-700 hover:bg-pink-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 rounded-lg transition-colors"
        >
          {char.socializedThisCycle ? '今日は交遊済み' : '交遊する (+95〜105 pt)'}
        </button>
      </div>
    </div>
  )
}
