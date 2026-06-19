'use client'

import { useState } from 'react'
import { REGIONS, getRegionCharacters } from '@/data/characters'
import type { CharacterMaster, RegionId } from '@/types/game'
import { useGameStore } from '@/store/gameStore'
import { useCharacterStore } from '@/store/characterStore'
import { useInventoryStore } from '@/store/inventoryStore'

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

    completeSetup(selectedRegion)
  }

  return (
    <div className="flex flex-col h-dvh bg-slate-900 text-white">
      <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full">
        <h1 className="text-2xl font-bold text-center text-yellow-300 mt-6 mb-2">
          ホロギルド
        </h1>
        <p className="text-slate-400 text-center text-sm mb-8">
          ギルドを立ち上げ、仲間を集めて冒険しよう
        </p>

        {step === 'region' && (
          <>
            <h2 className="text-lg font-semibold mb-4 text-slate-200">
              最初の活動地域を選んでください
            </h2>
            <div className="grid gap-3">
              {REGIONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelectRegion(r.id)}
                  className="w-full text-left bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-yellow-400 rounded-lg p-4 transition-colors"
                >
                  <div className="font-semibold text-slate-100">{r.name}</div>
                  <div className="text-xs text-slate-400 mt-1">全20名のキャラクターが在籍</div>
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
                className="text-slate-400 hover:text-white text-sm"
              >
                ← 戻る
              </button>
              <h2 className="text-lg font-semibold text-slate-200">
                最初のメンバーを選んでください
              </h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              {REGIONS.find((r) => r.id === selectedRegion)?.name} ／ 全20名
            </p>
            <div className="grid grid-cols-2 gap-2">
              {getRegionCharacters(selectedRegion).map((char) => (
                <button
                  key={char.id}
                  onClick={() => handleSelectChar(char)}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-yellow-400 rounded-lg p-3 text-left transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center text-lg font-bold text-slate-300 mb-2 mx-auto">
                    {char.name.slice(0, 1)}
                  </div>
                  <div className="text-sm font-semibold text-center text-slate-100 truncate">
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
                className="text-slate-400 hover:text-white text-sm"
              >
                ← 戻る
              </button>
              <h2 className="text-lg font-semibold text-slate-200">確認</h2>
            </div>

            <div className="bg-slate-800 border border-slate-600 rounded-xl p-5 mb-6">
              <div className="w-20 h-20 rounded-full bg-slate-600 flex items-center justify-center text-3xl font-bold text-slate-300 mx-auto mb-3">
                {selectedChar.name.slice(0, 1)}
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-slate-100 mb-2">
                  {selectedChar.name}
                </div>
                <div className="text-xs text-slate-500 mb-1">傾向はスカウト時にランダム決定</div>
                <div className="text-sm text-slate-400">
                  {REGIONS.find((r) => r.id === selectedRegion)?.name}
                </div>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 mb-6 text-sm text-slate-300 space-y-1">
              <div className="font-semibold text-slate-200 mb-2">初期装備</div>
              <div className="flex justify-between">
                <span className="text-slate-400">武器</span>
                <span>鉄の剣</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">防具</span>
                <span>冒険者の服</span>
              </div>
            </div>

            <button
              onClick={handleStart}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-3 rounded-xl text-lg transition-colors"
            >
              ギルドを始める
            </button>
          </>
        )}
      </div>
    </div>
  )
}
