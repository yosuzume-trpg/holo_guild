'use client'

import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { useDungeonStore } from '@/store/dungeonStore'
import { getMaterial } from '@/data/materials'
import { REGIONS } from '@/data/characters'
import { GR_UPGRADE_MAT_COST, GR_BATTLE_LEVEL_CAP, GR_FACILITY_LEVEL_CAP } from '@/data/constants'

export default function GuildUpgradePage() {
  const guildRank        = useGameStore((s) => s.guildRank)
  const upgradeGuildRank = useGameStore((s) => s.upgradeGuildRank)
  const unlockRegion     = useGameStore((s) => s.unlockRegion)
  const unlockedRegions  = useGameStore((s) => s.unlockedRegions)
  const materials        = useInventoryStore((s) => s.materials)
  const clearedLevels    = useDungeonStore((s) => s.clearedLevels)

  const [upgraded, setUpgraded]     = useState(false)
  const [regionPicked, setRegionPicked] = useState(false)

  const reqDl      = guildRank * 10
  const cost       = guildRank * GR_UPGRADE_MAT_COST
  const dlCleared  = clearedLevels.includes(reqDl)
  const crystalHave = materials['magiccrystal'] ?? 0
  const gearHave    = materials['ancientgear']  ?? 0
  const matsOk     = crystalHave >= cost && gearHave >= cost
  const canUpgrade = dlCleared && matsOk && !upgraded

  const crystalMat = getMaterial('magiccrystal')
  const gearMat    = getMaterial('ancientgear')

  const nextGr = guildRank + 1
  const lockableRegions = REGIONS.filter((r) => !unlockedRegions.includes(r.id))

  function handleUpgrade() {
    if (upgradeGuildRank()) setUpgraded(true)
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-ink">ギルドランクアップ</h1>

      {/* Current rank */}
      <div className="bg-surface border border-line rounded-xl p-4 text-center">
        <div className="text-xs text-ink-muted mb-1">現在のギルドランク</div>
        <div className="text-4xl font-bold text-gold">GR{guildRank}</div>
        {!upgraded && <div className="text-sm text-ink-muted mt-1">→ GR{nextGr}</div>}
      </div>

      {/* Region selection after upgrade */}
      {upgraded && (
        <div className="bg-surface-2 border border-accent-strong rounded-xl p-4 space-y-3">
          <div className="text-sm font-semibold text-accent-strong">
            🏆 GR{guildRank} に上昇しました！
          </div>
          {lockableRegions.length > 0 && !regionPicked ? (
            <>
              <div className="text-xs text-accent-strong">解放する地域を1つ選んでください</div>
              <div className="grid grid-cols-2 gap-2">
                {lockableRegions.map((r) => (
                  <button key={r.id}
                    onClick={() => { unlockRegion(r.id); setRegionPicked(true) }}
                    className="bg-accent hover:bg-accent-strong text-ink font-bold py-2 rounded-lg text-sm transition-colors">
                    {r.name}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-xs text-accent-strong">
              {regionPicked ? '地域を解放しました。' : 'すべての地域が解放済みです。'}
            </div>
          )}
        </div>
      )}

      {/* Requirements */}
      {!upgraded && (
        <div className="bg-surface border border-line rounded-xl p-4 space-y-3">
          <div className="text-sm font-semibold text-ink mb-1">ランクアップ条件</div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">DL{reqDl} クリア</span>
            {dlCleared
              ? <span className="text-success font-semibold">✓ クリア済み</span>
              : <span className="text-danger">未クリア</span>}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">{crystalMat?.name ?? '魔力結晶'} × {cost}</span>
            <span className={crystalHave >= cost ? 'text-success font-semibold' : 'text-danger'}>
              所持: {crystalHave}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">{gearMat?.name ?? '古代歯車'} × {cost}</span>
            <span className={gearHave >= cost ? 'text-success font-semibold' : 'text-danger'}>
              所持: {gearHave}
            </span>
          </div>
        </div>
      )}

      {/* Upgrade button */}
      {!upgraded && (
        <button
          onClick={handleUpgrade}
          disabled={!canUpgrade}
          className="w-full bg-accent hover:bg-accent-strong disabled:opacity-40 disabled:cursor-not-allowed text-ink font-bold py-3 rounded-xl transition-colors"
        >
          {!dlCleared
            ? `DL${reqDl} をクリアしてください`
            : !matsOk
            ? '素材が不足しています'
            : `GR${nextGr} へランクアップ`}
        </button>
      )}

      {/* Effects preview */}
      {!upgraded && (
        <div className="bg-surface border border-line rounded-xl p-4 text-sm text-ink-muted space-y-1">
          <div className="text-ink font-semibold mb-2">GR{nextGr} 解放効果</div>
          <div>・施設拡張・研究の上限: {nextGr * GR_FACILITY_LEVEL_CAP} に上昇</div>
          <div>・戦闘レベルの上限: {nextGr * GR_BATTLE_LEVEL_CAP} に上昇</div>
          <div>・新しい地域の解放選択</div>
        </div>
      )}
    </div>
  )
}
