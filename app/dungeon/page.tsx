'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getDungeonMaterials, getMaterial } from '@/data/materials'
import { getCharacterMaster } from '@/data/characters'
import { useGameStore } from '@/store/gameStore'
import { useCharacterStore } from '@/store/characterStore'
import { useDungeonStore } from '@/store/dungeonStore'

export default function DungeonPage() {
  const guildRank       = useGameStore((s) => s.guildRank)
  const characters      = useCharacterStore((s) => s.characters)
  const setAssignment   = useCharacterStore((s) => s.setAssignment)
  const maxCleared      = useDungeonStore((s) => s.maxClearedLevel)
  const clearedLevels   = useDungeonStore((s) => s.clearedLevels)

  const [tab, setTab] = useState<'challenge' | 'auto'>('challenge')

  // Levels unlocked: 1 always, then next after each clear
  const unlockedMax = maxCleared + 1
  const challengeLevels = Array.from({ length: unlockedMax }, (_, i) => i + 1)

  // Auto-grind: characters assigned to dungeon
  const autoChars = characters.filter((c) => c.assignment?.type === 'dungeon')
  const availableChars = characters.filter((c) => c.assignment === null)

  // Available dungeon materials based on cleared level
  const availableMats = getDungeonMaterials(maxCleared)

  // GR upgrade check (every 10 DL)
  const nextGrDl = guildRank * 10

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-slate-700 bg-slate-800 shrink-0">
        <button onClick={() => setTab('challenge')}
          className={`flex-1 py-2 text-sm border-b-2 transition-colors ${tab === 'challenge' ? 'border-yellow-400 text-yellow-300' : 'border-transparent text-slate-400'}`}>
          ダンジョン攻略
        </button>
        <button onClick={() => setTab('auto')}
          className={`flex-1 py-2 text-sm border-b-2 transition-colors ${tab === 'auto' ? 'border-yellow-400 text-yellow-300' : 'border-transparent text-slate-400'}`}>
          自動周回
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'challenge' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-400">
              最高クリア: {maxCleared > 0 ? `DL ${maxCleared}` : 'なし'} ／ GR{guildRank} (次のGRはDL{nextGrDl}クリアで解放)
            </div>
            {challengeLevels.map((lv) => {
              const cleared = clearedLevels.includes(lv)
              return (
                <Link key={lv} href={`/dungeon/${lv}`}
                  className="flex items-center justify-between bg-slate-800 border border-slate-700 hover:border-yellow-400 rounded-xl p-4 transition-colors">
                  <div>
                    <div className="font-semibold text-slate-100">ダンジョン Lv.{lv}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      敵Lv: ~{lv * 10} ／ 報酬: {lv * 100}G
                      {cleared && <span className="ml-2 text-green-400">✓ クリア済み</span>}
                    </div>
                  </div>
                  <div className="text-yellow-300 text-lg">→</div>
                </Link>
              )
            })}
          </div>
        )}

        {tab === 'auto' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400">
              クリア済みダンジョンにキャラクターを配置すると、自動で素材を収集します。
              {maxCleared === 0 && <span className="text-yellow-400 ml-1">まずダンジョンをクリアしてください。</span>}
            </div>

            {maxCleared > 0 && (
              <>
                <div className="text-sm text-slate-400 mb-1">配置中のキャラクター ({autoChars.length}人)</div>
                <div className="space-y-2">
                  {autoChars.map((char) => {
                    const master = getCharacterMaster(char.masterId)
                    const asgn = char.assignment as Extract<typeof char.assignment, { type: 'dungeon' }>
                    const mat = getMaterial(asgn.materialId)
                    return (
                      <div key={char.id} className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center text-sm font-bold text-slate-300 shrink-0">
                          {master?.name.slice(0, 1) ?? '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-100 truncate">{master?.name}</div>
                          <div className="text-xs text-slate-400">
                            DL{asgn.level} → {mat?.name ?? asgn.materialId}
                          </div>
                        </div>
                        <button onClick={() => setAssignment(char.id, null)} className="text-xs text-slate-500 hover:text-red-400 shrink-0">解除</button>
                      </div>
                    )
                  })}

                  {availableChars.length > 0 && (
                    <AutoAssignButton
                      availableChars={availableChars}
                      maxCleared={maxCleared}
                      availableMats={availableMats}
                      onAssign={(charId, level, materialId) =>
                        setAssignment(charId, { type: 'dungeon', level, materialId })
                      }
                    />
                  )}
                </div>

                <div className="text-sm text-slate-400">入手可能な素材</div>
                <div className="grid grid-cols-2 gap-2">
                  {availableMats.map((mat) => (
                    <div key={mat.id} className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm">
                      <div className="text-slate-200">{mat.name}</div>
                      <div className="text-xs text-slate-400">{mat.ratePerMin}/分・{mat.price}G</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AutoAssignButton({
  availableChars, maxCleared, availableMats, onAssign,
}: {
  availableChars: ReturnType<typeof useCharacterStore.getState>['characters']
  maxCleared: number
  availableMats: ReturnType<typeof getDungeonMaterials>
  onAssign: (charId: string, level: number, materialId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [charId, setCharId] = useState(availableChars[0]?.id ?? '')
  const [level, setLevel] = useState(maxCleared)
  const [matId, setMatId] = useState(availableMats[0]?.id ?? '')

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-full bg-slate-800 border border-dashed border-slate-600 hover:border-yellow-400 rounded-lg p-3 text-slate-500 hover:text-slate-300 text-sm transition-colors text-center">
        ＋ キャラクターを配置
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setOpen(false)}>
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-4 w-80 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold text-white">自動周回設定</div>
            <div>
              <div className="text-xs text-slate-400 mb-1">キャラクター</div>
              <select value={charId} onChange={(e) => setCharId(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200">
                {availableChars.map((c) => {
                  const m = getCharacterMaster(c.masterId)
                  return <option key={c.id} value={c.id}>{m?.name ?? c.masterId}</option>
                })}
              </select>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">ダンジョンレベル</div>
              <select value={level} onChange={(e) => setLevel(Number(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200">
                {Array.from({ length: maxCleared }, (_, i) => i + 1).map((lv) => (
                  <option key={lv} value={lv}>DL {lv} (+{(lv - 1) * 5}%ボーナス)</option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">収集する素材</div>
              <select value={matId} onChange={(e) => setMatId(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200">
                {availableMats.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.ratePerMin}/分)</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} className="flex-1 bg-slate-700 text-slate-300 py-2 rounded text-sm">キャンセル</button>
              <button onClick={() => { onAssign(charId, level, matId); setOpen(false) }}
                className="flex-1 bg-yellow-500 text-slate-900 font-bold py-2 rounded text-sm">配置</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
