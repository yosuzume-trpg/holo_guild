'use client'

import Link from 'next/link'
import { useCharacterStore } from '@/store/characterStore'
import { useGameStore } from '@/store/gameStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { getCharacterMaster } from '@/data/characters'

export default function HomePage() {
  const characters   = useCharacterStore((s) => s.characters)
  const socialize    = useCharacterStore((s) => s.socialize)
  const cycleCount   = useGameStore((s) => s.cycleCount)
  const guildRank    = useGameStore((s) => s.guildRank)
  const socializedThisCycle = useGameStore((s) => s.socializedThisCycle)
  const materials    = useInventoryStore((s) => s.materials)

  // Characters with affection >= 5 are shown on the home screen
  const homeChars = characters.filter((c) => c.affectionLevel >= 5)

  const totalMaterialCount = Object.values(materials).reduce((s, v) => s + v, 0)

  return (
    <div className="p-4 space-y-4">
      {/* Guild summary */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="text-xs text-slate-400 mb-1">ギルドランク</div>
        <div className="text-2xl font-bold text-yellow-300 mb-2">GR {guildRank}</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-slate-400">サイクル数</div>
          <div className="text-slate-200 text-right">{cycleCount}</div>
          <div className="text-slate-400">メンバー数</div>
          <div className="text-slate-200 text-right">{characters.length}人</div>
          <div className="text-slate-400">素材在庫</div>
          <div className="text-slate-200 text-right">{totalMaterialCount.toLocaleString()}個</div>
        </div>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/guild/offer"
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-yellow-400 rounded-lg p-3 text-center transition-colors"
        >
          <div className="text-lg mb-0.5">🏹</div>
          <div className="text-sm font-semibold text-slate-200">キャラ募集</div>
        </Link>
        <Link
          href="/production/farm"
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-green-400 rounded-lg p-3 text-center transition-colors"
        >
          <div className="text-lg mb-0.5">🌾</div>
          <div className="text-sm font-semibold text-slate-200">生産管理</div>
        </Link>
        <Link
          href="/dungeon"
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-red-400 rounded-lg p-3 text-center transition-colors"
        >
          <div className="text-lg mb-0.5">⚔️</div>
          <div className="text-sm font-semibold text-slate-200">ダンジョン</div>
        </Link>
        <Link
          href="/characters"
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-purple-400 rounded-lg p-3 text-center transition-colors"
        >
          <div className="text-lg mb-0.5">👥</div>
          <div className="text-sm font-semibold text-slate-200">キャラ一覧</div>
        </Link>
      </div>

      {/* Home characters (affection >= 5) */}
      {homeChars.length > 0 && (
        <div>
          <div className="text-sm text-slate-400 mb-2">ホームにいるメンバー</div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {homeChars.map((char) => {
              const master = getCharacterMaster(char.masterId)
              return (
                <div key={char.id} className="shrink-0">
                  <div className="w-16 h-16 rounded-full bg-slate-600 flex items-center justify-center text-2xl font-bold text-slate-300 mx-auto mb-1">
                    {master?.name.slice(0, 1) ?? '?'}
                  </div>
                  <div className="text-xs text-slate-300 text-center w-16 truncate">
                    {master?.name ?? char.masterId}
                  </div>
                  <div className="flex justify-center mt-1">
                    <button
                      onClick={() => socialize(char.id)}
                      disabled={socializedThisCycle}
                      className="text-xs px-2 py-0.5 rounded bg-pink-700 hover:bg-pink-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                    >
                      {char.socializedThisCycle ? '済' : '交遊'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {homeChars.length === 0 && characters.length > 0 && (
        <div className="text-sm text-slate-500 text-center py-4 bg-slate-800 rounded-lg border border-slate-700">
          親愛度がLv.5以上になると<br />ホームに表示されます
        </div>
      )}
    </div>
  )
}
