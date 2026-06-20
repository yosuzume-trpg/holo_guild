'use client'

import Link from 'next/link'
import { useCharacterStore } from '@/store/characterStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { getCharacterMaster } from '@/data/characters'
import { getEquipment } from '@/data/equipment'

const TENDENCY_COLOR: Record<string, string> = {
  standard: 'bg-slate-500',
  attack:   'bg-red-600',
  magic:    'bg-purple-600',
  defense:  'bg-blue-600',
  speed:    'bg-green-600',
}

const TENDENCY_LABEL: Record<string, string> = {
  standard: '標準',
  attack:   '攻撃',
  magic:    '魔法',
  defense:  '防御',
  speed:    '速度',
}

const ASSIGNMENT_LABEL: Record<string, string> = {
  farm:     '農業',
  mining:   '鉱業',
  fishing:  '漁業',
  alchemy:  '錬金',
  merchant: '商人',
  craft:    '工芸',
  dungeon:  'ダンジョン',
}

function expInLevel(totalExp: number, level: number): number {
  return totalExp - 100 * level * (level - 1) / 2
}

export default function CharactersPage() {
  const characters   = useCharacterStore((s) => s.characters)
  const invEquipment = useInventoryStore((s) => s.equipment)

  function getEquipName(instanceId: string | null) {
    if (!instanceId) return null
    const inst = invEquipment.find((e) => e.instanceId === instanceId)
    return inst ? getEquipment(inst.masterId)?.name ?? null : null
  }

  if (characters.length === 0) {
    return (
      <div className="p-4 text-center text-slate-400 mt-12">
        キャラクターがまだいません
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-slate-200">キャラクター一覧</h1>
        <span className="text-sm text-slate-400">{characters.length}人</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {characters.map((char) => {
          const master    = getCharacterMaster(char.masterId)
          const asgn      = char.assignment
          const hpPct     = Math.round((char.currentHp / (char.stats.hp * char.battleLevel)) * 100)
          const expCur    = expInLevel(char.battleExp, char.battleLevel)
          const expNeeded = 100 * char.battleLevel
          const expPct    = Math.min(100, Math.round((expCur / expNeeded) * 100))

          const weaponName = getEquipName(char.equipment.weapon)
          const armorName  = getEquipName(char.equipment.armor)

          return (
            <Link
              key={char.id}
              href={`/characters/${char.id}`}
              className="bg-slate-800 border border-slate-700 hover:border-yellow-400 rounded-xl p-3 transition-colors block"
            >
              {/* Portrait placeholder */}
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-slate-600 flex items-center justify-center text-2xl font-bold text-slate-300 mx-auto mb-2">
                  {master?.name.slice(0, 1) ?? '?'}
                </div>
                <div className="absolute top-0 right-4 bg-yellow-500 text-slate-900 text-xs font-bold px-1.5 rounded">
                  ★{char.starRank}
                </div>
              </div>

              <div className="text-sm font-semibold text-slate-100 text-center truncate mb-1">
                {master?.name ?? char.masterId}
              </div>

              <div className="flex justify-center mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full text-white ${TENDENCY_COLOR[char.tendency]}`}>
                  {TENDENCY_LABEL[char.tendency]}
                </span>
              </div>

              {/* HP bar */}
              <div className="mb-1.5">
                <div className="w-full h-1.5 bg-slate-700 rounded-full">
                  <div
                    className={`h-full rounded-full transition-all ${hpPct > 50 ? 'bg-green-500' : hpPct > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
              </div>

              {/* Battle level + EXP bar */}
              <div className="mb-1.5">
                <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                  <span>戦闘 Lv.{char.battleLevel}</span>
                  <span>{expCur}/{expNeeded}</span>
                </div>
                <div className="w-full h-1 bg-slate-700 rounded-full">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${expPct}%` }} />
                </div>
              </div>

              {/* Equipment */}
              <div className="text-xs text-slate-500 mb-1 truncate text-center">
                {weaponName || armorName ? (
                  <>
                    {weaponName && <span>⚔{weaponName}</span>}
                    {weaponName && armorName && <span className="mx-1">·</span>}
                    {armorName && <span>🛡{armorName}</span>}
                  </>
                ) : (
                  <span className="text-slate-700">未装備</span>
                )}
              </div>

              {/* Assignment */}
              <div className="text-xs text-center text-slate-400">
                {asgn ? (
                  <span className="text-slate-300">
                    {ASSIGNMENT_LABEL[asgn.type] ?? asgn.type}
                  </span>
                ) : (
                  <span className="text-slate-600">待機中</span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
