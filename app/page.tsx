'use client'

import Link from 'next/link'
import { useCharacterStore } from '@/store/characterStore'
import { useGameStore } from '@/store/gameStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { getCharacterMaster } from '@/data/characters'
import { getMaterial } from '@/data/materials'
import CharacterPortrait from '@/app/_components/ui/CharacterPortrait'

export default function HomePage() {
  const characters   = useCharacterStore((s) => s.characters)
  const socialize    = useCharacterStore((s) => s.socialize)
  const cycleCount   = useGameStore((s) => s.cycleCount)
  const guildRank    = useGameStore((s) => s.guildRank)
  const socializedThisCycle = useGameStore((s) => s.socializedThisCycle)
  const harvestBonuses = useGameStore((s) => s.harvestBonuses)
  const materials    = useInventoryStore((s) => s.materials)

  // 今サイクルの豊作素材（+%）
  const harvestEntries = Object.entries(harvestBonuses).filter(([, pct]) => pct > 0)

  // Characters with affection >= 5 are shown on the home screen
  const homeChars = characters.filter((c) => c.affectionLevel >= 5)

  const totalMaterialCount = Object.values(materials).reduce((s, v) => s + v, 0)

  return (
    <div className="p-4 space-y-4">
      {/* Guild summary */}
      <div className="bg-surface border border-line rounded-xl p-4">
        <div className="text-xs text-ink-muted mb-1">ギルドランク</div>
        <div className="text-2xl font-bold text-gold mb-2">GR {guildRank}</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-ink-muted">サイクル数</div>
          <div className="text-ink text-right">{cycleCount}</div>
          <div className="text-ink-muted">メンバー数</div>
          <div className="text-ink text-right">{characters.length}人</div>
          <div className="text-ink-muted">素材在庫</div>
          <div className="text-ink text-right">{totalMaterialCount.toLocaleString()}個</div>
        </div>
        {harvestEntries.length > 0 && (
          <div className="mt-2 pt-2 border-t border-line text-xs text-success flex items-start gap-1">
            <span>🌾</span>
            <span>
              今サイクルの豊作:{' '}
              {harvestEntries.map(([id, pct]) => `${getMaterial(id)?.name ?? id} +${pct}%`).join(' / ')}
            </span>
          </div>
        )}
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/guild/offer"
          className="bg-surface hover:bg-surface-2 border border-line hover:border-accent-strong rounded-lg p-3 text-center transition-colors"
        >
          <div className="text-lg mb-0.5">🏹</div>
          <div className="text-sm font-semibold text-ink">キャラ募集</div>
        </Link>
        <Link
          href="/production/farm"
          className="bg-surface hover:bg-surface-2 border border-line hover:border-green-400 rounded-lg p-3 text-center transition-colors"
        >
          <div className="text-lg mb-0.5">🌾</div>
          <div className="text-sm font-semibold text-ink">生産管理</div>
        </Link>
        <Link
          href="/dungeon"
          className="bg-surface hover:bg-surface-2 border border-line hover:border-red-400 rounded-lg p-3 text-center transition-colors"
        >
          <div className="text-lg mb-0.5">⚔️</div>
          <div className="text-sm font-semibold text-ink">ダンジョン</div>
        </Link>
        <Link
          href="/characters"
          className="bg-surface hover:bg-surface-2 border border-line hover:border-purple-400 rounded-lg p-3 text-center transition-colors"
        >
          <div className="text-lg mb-0.5">👥</div>
          <div className="text-sm font-semibold text-ink">キャラ一覧</div>
        </Link>
      </div>

      {/* Home characters (affection >= 5) */}
      {homeChars.length > 0 && (
        <div>
          <div className="text-sm text-ink-muted mb-2">ホームにいるメンバー</div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {homeChars.map((char) => {
              const master = getCharacterMaster(char.masterId)
              return (
                <div key={char.id} className="shrink-0">
                  <div className="relative w-16 h-20 rounded-lg overflow-hidden bg-surface-3 mx-auto mb-1">
                    <CharacterPortrait masterId={char.masterId} />
                  </div>
                  <div className="text-xs text-ink text-center w-16 truncate">
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
        <div className="text-sm text-ink-subtle text-center py-4 bg-surface rounded-lg border border-line">
          親愛度がLv.5以上になると<br />ホームに表示されます
        </div>
      )}
    </div>
  )
}
