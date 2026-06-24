'use client'

import { useState } from 'react'
import { REGIONS, getRegionCharacters } from '@/data/characters'
import type { CharacterMaster, RegionId } from '@/types/game'
import { useGameStore } from '@/store/gameStore'
import { useCharacterStore } from '@/store/characterStore'
import { useInventoryStore } from '@/store/inventoryStore'
import CharacterAvatar from '@/app/_components/ui/CharacterAvatar'

export default function SetupScreen() {
  const [step, setStep] = useState<'region' | 'character' | 'confirm'>('region')
  const [selectedRegion, setSelectedRegion] = useState<RegionId | null>(null)
  const [selectedChar, setSelectedChar] = useState<CharacterMaster | null>(null)

  const completeSetup = useGameStore((s) => s.completeSetup)
  const addCharacter  = useCharacterStore((s) => s.addCharacter)
  const equip         = useCharacterStore((s) => s.equip)
  const addEquipment  = useInventoryStore((s) => s.addEquipment)

  function handleSelectRegion(regionId: RegionId) {
    setSelectedRegion(regionId)
    setSelectedChar(null)
    setStep('character')
  }

  function handleSelectChar(char: CharacterMaster) {
    setSelectedChar(char)
    setStep('confirm')
  }

  function handleStart() {
    if (!selectedRegion || !selectedChar) return

    const weaponId = addEquipment('weapon_iron_sword')
    const armorId  = addEquipment('armor_adventurer')
    const charId   = addCharacter(selectedChar.id)

    equip(charId, 'weapon', weaponId)
    equip(charId, 'armor', armorId)

    // 選択キャラと同地域から、重複しないランダムな3名を装備なしで追加
    const bonusPool = getRegionCharacters(selectedRegion).filter((c) => c.id !== selectedChar.id)
    const shuffled  = [...bonusPool].sort(() => Math.random() - 0.5)
    for (const c of shuffled.slice(0, 3)) {
      addCharacter(c.id)
    }

    completeSetup(selectedRegion)
  }

  return (
    <div className="flex flex-col h-dvh bg-app text-ink">
      <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full">
        <h1 className="text-2xl font-bold text-center text-accent-strong mt-6 mb-2">
          ホロギルド
        </h1>
        <p className="text-ink-muted text-center text-sm mb-8">
          ギルドを立ち上げ、仲間を集めて冒険しよう
        </p>

        {step === 'region' && (
          <>
            <h2 className="text-lg font-semibold mb-4 text-ink">
              最初の活動地域を選んでください
            </h2>
            <div className="grid gap-3">
              {REGIONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelectRegion(r.id)}
                  className="w-full text-left bg-surface hover:bg-surface-2 border border-line hover:border-accent-strong rounded-lg p-4 transition-colors"
                >
                  <div className="font-semibold text-ink">{r.name}</div>
                  <div className="text-xs text-ink-muted mt-1">全20名のキャラクターが在籍</div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'character' && selectedRegion && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setStep('region')}
                className="text-ink-muted hover:text-ink text-sm"
              >
                ← 戻る
              </button>
              <h2 className="text-lg font-semibold text-ink">
                最初のメンバーを選んでください
              </h2>
            </div>
            <p className="text-xs text-ink-muted mb-4">
              {REGIONS.find((r) => r.id === selectedRegion)?.name} ／ 全20名
            </p>
            <div className="grid grid-cols-2 gap-2">
              {getRegionCharacters(selectedRegion).map((char) => (
                <button
                  key={char.id}
                  onClick={() => handleSelectChar(char)}
                  className="bg-surface hover:bg-surface-2 border border-line hover:border-accent-strong rounded-lg p-3 text-left transition-colors"
                >
                  <CharacterAvatar masterId={char.id} size="lg" className="mb-2 mx-auto" />
                  <div className="text-sm font-semibold text-center text-ink truncate">
                    {char.name}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'confirm' && selectedChar && selectedRegion && (
          <>
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => setStep('character')}
                className="text-ink-muted hover:text-ink text-sm"
              >
                ← 戻る
              </button>
              <h2 className="text-lg font-semibold text-ink">確認</h2>
            </div>

            <div className="bg-surface border border-line rounded-xl p-5 mb-6">
              <CharacterAvatar masterId={selectedChar.id} size="xl" className="mx-auto mb-3" />
              <div className="text-center">
                <div className="text-xl font-bold text-ink mb-2">
                  {selectedChar.name}
                </div>
                <div className="text-xs text-ink-subtle mb-1">傾向はスカウト時にランダム決定</div>
                <div className="text-sm text-ink-muted">
                  {REGIONS.find((r) => r.id === selectedRegion)?.name}
                </div>
              </div>
            </div>

            <div className="bg-surface border border-line rounded-lg p-4 mb-6 text-sm text-ink space-y-1">
              <div className="font-semibold text-ink mb-2">初期装備</div>
              <div className="flex justify-between">
                <span className="text-ink-muted">武器</span>
                <span>鉄の剣</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">防具</span>
                <span>冒険者の服</span>
              </div>
              <div className="text-xs text-ink-subtle pt-2 border-t border-line mt-2">
                さらに同じ地域からランダムな仲間が3名加わります（装備なし）
              </div>
            </div>

            <button
              onClick={handleStart}
              className="w-full bg-accent hover:bg-accent-strong text-ink font-bold py-3 rounded-xl text-lg transition-colors"
            >
              ギルドを始める
            </button>
          </>
        )}
      </div>
    </div>
  )
}
