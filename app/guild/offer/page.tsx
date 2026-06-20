'use client'

import { useState } from 'react'
import { REGIONS, getRegionCharacters } from '@/data/characters'
import type { CharacterMaster, RegionId, Tendency } from '@/types/game'
import { useGameStore } from '@/store/gameStore'
import { useCharacterStore } from '@/store/characterStore'
import { useDungeonStore } from '@/store/dungeonStore'
import {
  GUARANTEE_THRESHOLD, RECRUIT_BASE_COST, RECRUIT_COST_STEP, RECRUIT_STEP_COUNT,
} from '@/data/constants'

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

interface PullResult {
  char: CharacterMaster
  isNew: boolean
  tendency: Tendency
  certCount: number
}

export default function OfferPage() {
  const unlockedRegions = useGameStore((s) => s.unlockedRegions)
  const guildRank       = useGameStore((s) => s.guildRank)
  const unlockRegion    = useGameStore((s) => s.unlockRegion)
  const spendGold       = useGameStore((s) => s.spendGold)
  const characters      = useCharacterStore((s) => s.characters)
  const addCharacter    = useCharacterStore((s) => s.addCharacter)
  const addCertificate  = useCharacterStore((s) => s.addCertificate)
  const recruitPoints   = useDungeonStore((s) => s.recruitPoints)
  const addRecruitPoints = useDungeonStore((s) => s.addRecruitPoints)

  const visibleRegions = REGIONS.filter((r) => unlockedRegions.includes(r.id))
  const [activeRegion, setActiveRegion] = useState<RegionId>(
    (visibleRegions[0]?.id ?? 'region1') as RegionId
  )
  const [pullResult, setPullResult] = useState<PullResult | null>(null)
  const [showGuarantee, setShowGuarantee] = useState(false)

  const lockableRegions    = REGIONS.filter((r) => !unlockedRegions.includes(r.id))
  const pendingUnlockCount = Math.max(0, guildRank - unlockedRegions.length)
  const hasPendingUnlock   = pendingUnlockCount > 0 && lockableRegions.length > 0

  const recruitCost    = RECRUIT_BASE_COST + RECRUIT_COST_STEP * Math.floor(characters.length / RECRUIT_STEP_COUNT)
  const regionChars    = getRegionCharacters(activeRegion)
  const ownedMasterIds = new Set(characters.map((c) => c.masterId))
  const points        = recruitPoints[activeRegion] ?? 0
  const canGuarantee  = points >= GUARANTEE_THRESHOLD

  function handlePull() {
    if (!spendGold(recruitCost)) return

    addRecruitPoints(activeRegion, 1)

    const picked = regionChars[Math.floor(Math.random() * regionChars.length)]
    const isNew  = !ownedMasterIds.has(picked.id)

    let tendency: Tendency = 'standard'
    if (isNew) {
      const newCharId = addCharacter(picked.id)
      const newChar = useCharacterStore.getState().characters.find((c) => c.id === newCharId)
      tendency = newChar?.tendency ?? 'standard'
    } else {
      addCertificate(picked.id, 1)
    }

    setPullResult({ char: picked, isNew, tendency, certCount: 1 })
  }

  function handleGuaranteePick(char: CharacterMaster) {
    useDungeonStore.getState().addRecruitPoints(activeRegion, -points)
    setShowGuarantee(false)
    if (ownedMasterIds.has(char.id)) {
      addCertificate(char.id, 5)
      setPullResult({ char, isNew: false, tendency: 'standard', certCount: 5 })
    } else {
      const newCharId = addCharacter(char.id)
      const newChar = useCharacterStore.getState().characters.find((c) => c.id === newCharId)
      const tendency = newChar?.tendency ?? 'standard'
      setPullResult({ char, isNew: true, tendency, certCount: 0 })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Region tabs */}
      <div className="flex border-b border-slate-700 bg-slate-800 overflow-x-auto shrink-0">
        {visibleRegions.map((r) => (
          <button
            key={r.id}
            onClick={() => setActiveRegion(r.id as RegionId)}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeRegion === r.id
                ? 'border-yellow-400 text-yellow-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {r.name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Pending region unlock */}
        {hasPendingUnlock && (
          <div className="bg-yellow-900 border border-yellow-500 rounded-xl p-4 mb-4 space-y-2">
            <div className="text-sm font-semibold text-yellow-200">
              🏆 新しい地域を解放できます（残り{pendingUnlockCount}枠）
            </div>
            <div className="grid grid-cols-2 gap-2">
              {lockableRegions.map((r) => (
                <button key={r.id}
                  onClick={() => unlockRegion(r.id)}
                  className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-2 rounded-lg text-sm transition-colors">
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Points + guarantee banner */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-slate-400">
            ポイント:{' '}
            <span className="text-white font-semibold">{points}</span>
            <span className="text-slate-500"> / {GUARANTEE_THRESHOLD}</span>
          </div>
          <div className="text-xs text-slate-400">
            {ownedMasterIds.size > 0 && `入手済み: ${regionChars.filter((c) => ownedMasterIds.has(c.id)).length} / ${regionChars.length}`}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-slate-700 rounded-full mb-4">
          <div
            className="h-full bg-yellow-400 rounded-full transition-all"
            style={{ width: `${Math.min((points / GUARANTEE_THRESHOLD) * 100, 100)}%` }}
          />
        </div>

        {/* Guarantee available */}
        {canGuarantee && (
          <button
            onClick={() => setShowGuarantee(true)}
            className="w-full mb-4 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-2 rounded-lg text-sm transition-colors"
          >
            セレクト募集を使う（未入手キャラを1人選択）
          </button>
        )}

        {/* Pull button */}
        <button
          onClick={handlePull}
          className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-500 hover:border-yellow-400 text-white font-bold py-3 rounded-lg transition-colors mb-6"
        >
          募集する（{recruitCost.toLocaleString()}G）
        </button>

        {/* Character roster for this region */}
        <div className="text-xs text-slate-400 mb-2">このエリアのキャラクター</div>
        <div className="grid grid-cols-4 gap-2">
          {regionChars.map((char) => {
            const owned = ownedMasterIds.has(char.id)
            const certCount = characters
              .filter((c) => c.masterId === char.id)
              .reduce((sum, c) => sum + c.certificates, 0)
            return (
              <div
                key={char.id}
                className={`relative rounded-lg p-2 text-center border transition-colors ${
                  owned
                    ? 'bg-slate-700 border-slate-500'
                    : 'bg-slate-800 border-slate-700 opacity-50'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-sm font-bold text-slate-300 mx-auto mb-1">
                  {char.name.slice(0, 1)}
                </div>
                <div className="text-xs text-slate-300 leading-tight truncate">
                  {owned ? char.name : '???'}
                </div>
                {owned && certCount > 0 && (
                  <div className="absolute top-0.5 right-0.5 bg-yellow-500 text-slate-900 text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {certCount}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Pull result modal */}
      {pullResult && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setPullResult(null)}
        >
          <div
            className="bg-slate-800 border border-slate-600 rounded-2xl p-6 w-72 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs text-slate-400 mb-1">
              {pullResult.isNew ? '新しいメンバーが加わった！' : '証書を入手！'}
            </div>
            <div className="w-20 h-20 rounded-full bg-slate-600 flex items-center justify-center text-3xl font-bold text-slate-300 mx-auto my-3">
              {pullResult.char.name.slice(0, 1)}
            </div>
            <div className="text-lg font-bold text-white mb-1">
              {pullResult.char.name}
            </div>
            {pullResult.isNew && (
              <div className={`inline-block text-xs px-2 py-0.5 rounded-full text-white mb-3 ${TENDENCY_COLOR[pullResult.tendency]}`}>
                {TENDENCY_LABEL[pullResult.tendency]}タイプ
              </div>
            )}
            {!pullResult.isNew && (
              <div className="text-sm text-yellow-300 mb-3">証書 ×{pullResult.certCount}</div>
            )}
            <button
              onClick={() => setPullResult(null)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* Guarantee select modal */}
      {showGuarantee && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setShowGuarantee(false)}
        >
          <div
            className="bg-slate-800 border border-slate-600 rounded-2xl p-4 w-80 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-base font-bold text-white mb-1">セレクト募集</div>
            <div className="text-xs text-slate-400 mb-3">キャラクターを1人選んでください（所持済みは証書×5）</div>
            <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-2">
              {regionChars.map((char) => {
                const owned = ownedMasterIds.has(char.id)
                return (
                <button
                  key={char.id}
                  onClick={() => handleGuaranteePick(char)}
                  className={`border rounded-lg p-2 text-center transition-colors ${
                    owned
                      ? 'bg-slate-600 border-slate-400 hover:border-yellow-400'
                      : 'bg-slate-700 hover:bg-slate-600 border-slate-500 hover:border-yellow-400'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-500 flex items-center justify-center text-sm font-bold text-slate-300 mx-auto mb-1">
                    {char.name.slice(0, 1)}
                  </div>
                  <div className="text-xs text-slate-200 leading-tight">{char.name}</div>
                  {owned && <div className="text-xs text-yellow-400 mt-0.5">証書×5</div>}
                </button>
              )})}
            </div>
            <button
              onClick={() => setShowGuarantee(false)}
              className="mt-3 w-full bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg text-sm"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
