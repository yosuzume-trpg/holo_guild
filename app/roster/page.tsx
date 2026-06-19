'use client'

import Link from 'next/link'
import { useState } from 'react'
import { REGIONS, getRegionCharacters } from '@/data/characters'
import type { RegionId } from '@/types/game'
import { useCharacterStore } from '@/store/characterStore'
import { useGameStore } from '@/store/gameStore'

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

export default function RosterPage() {
  const characters     = useCharacterStore((s) => s.characters)
  const unlockedRegions = useGameStore((s) => s.unlockedRegions)
  const [activeRegion, setActiveRegion] = useState<RegionId>('region1')

  const ownedMasterIds = new Set(characters.map((c) => c.masterId))
  const regionChars    = getRegionCharacters(activeRegion)
  const ownedInRegion  = regionChars.filter((c) => ownedMasterIds.has(c.id)).length
  const totalOwned     = characters.length

  return (
    <div className="flex flex-col h-full">
      {/* Region tabs */}
      <div className="flex border-b border-slate-700 bg-slate-800 overflow-x-auto shrink-0">
        {REGIONS.map((r) => {
          const unlocked  = unlockedRegions.includes(r.id)
          const rChars    = getRegionCharacters(r.id)
          const owned     = rChars.filter((c) => ownedMasterIds.has(c.id)).length
          return (
            <button
              key={r.id}
              onClick={() => setActiveRegion(r.id as RegionId)}
              className={`px-3 py-2 text-xs whitespace-nowrap border-b-2 transition-colors ${
                activeRegion === r.id
                  ? 'border-yellow-400 text-yellow-300'
                  : unlocked
                  ? 'border-transparent text-slate-400 hover:text-slate-200'
                  : 'border-transparent text-slate-600 cursor-default'
              }`}
            >
              {r.name}
              <span className="ml-1 text-slate-500">{owned}/{rChars.length}</span>
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Region summary */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-slate-300">
            {REGIONS.find((r) => r.id === activeRegion)?.name}
          </div>
          <div className="text-sm text-slate-400">
            <span className="text-white font-semibold">{ownedInRegion}</span> / {regionChars.length}人
            <span className="ml-3 text-xs">全体: {totalOwned}/100</span>
          </div>
        </div>

        {/* Character grid */}
        <div className="grid grid-cols-4 gap-2">
          {regionChars.map((char) => {
            const owned   = ownedMasterIds.has(char.id)
            const charInst = characters.find((c) => c.masterId === char.id)
            return (
              <div key={char.id}>
                {owned && charInst ? (
                  <Link
                    href={`/characters/${charInst.id}`}
                    className="block bg-slate-700 border border-slate-600 hover:border-yellow-400 rounded-lg p-2 text-center transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-500 flex items-center justify-center text-sm font-bold text-slate-200 mx-auto mb-1">
                      {char.name.slice(0, 1)}
                    </div>
                    <div className="text-xs text-slate-200 leading-tight truncate">
                      {char.name}
                    </div>
                    <div className={`mt-1 text-xs px-1 py-0.5 rounded-full text-white ${TENDENCY_COLOR[charInst.tendency]}`}>
                      {TENDENCY_LABEL[charInst.tendency]}
                    </div>
                    <div className="text-xs text-yellow-400 mt-0.5">
                      ★{charInst.starRank}
                    </div>
                  </Link>
                ) : (
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-center opacity-40">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm text-slate-600 mx-auto mb-1">
                      ?
                    </div>
                    <div className="text-xs text-slate-600 leading-tight">
                      ???
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
