'use client'

import { useRef, useState } from 'react'
import type { ProductionFacilityId } from '@/types/game'
import { MATERIALS_BY_FACILITY } from '@/data/materials'
import { getCharacterMaster } from '@/data/characters'
import { useGameStore } from '@/store/gameStore'
import { useCharacterStore } from '@/store/characterStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { useFacilityStore } from '@/store/facilityStore'

const FACILITY_LABEL: Record<ProductionFacilityId, string> = {
  farm:    '農業',
  mining:  '鉱業',
  fishing: '漁業',
  alchemy: '錬金',
}

const SKILL_LABEL: Record<ProductionFacilityId, string> = {
  farm:    '農業Lv',
  mining:  '鉱業Lv',
  fishing: '漁業Lv',
  alchemy: '錬金Lv',
}

const SKILL_KEY_MAP: Record<ProductionFacilityId, 'farmLevel' | 'miningLevel' | 'fishingLevel' | 'alchemyLevel'> = {
  farm:    'farmLevel',
  mining:  'miningLevel',
  fishing: 'fishingLevel',
  alchemy: 'alchemyLevel',
}

interface Props {
  facility: ProductionFacilityId
}

export default function ProductionFacilityPage({ facility }: Props) {
  const materials = MATERIALS_BY_FACILITY[facility]

  const gold = useGameStore((s) => s.gold)
  const guildRank = useGameStore((s) => s.guildRank)
  const spendGold = useGameStore((s) => s.spendGold)
  const characters = useCharacterStore((s) => s.characters)
  const setAssignment = useCharacterStore((s) => s.setAssignment)
  const inventoryMaterials = useInventoryStore((s) => s.materials)
  const addMaterial = useInventoryStore((s) => s.addMaterial)
  const facilityData = useFacilityStore((s) => s[facility])
  const getSlotCount = useFacilityStore((s) => s.getSlotCount)
  const getResearchBonus = useFacilityStore((s) => s.getResearchBonus)
  const getUpgradeCost = useFacilityStore((s) => s.getUpgradeCost)
  const expandProduction = useFacilityStore((s) => s.expandProduction)
  const researchProduction = useFacilityStore((s) => s.researchProduction)

  const [assigningSlot, setAssigningSlot] = useState<number | null>(null)
  const [selectedMaterial, setSelectedMaterial] = useState<string>(materials[0]?.id ?? '')
  const manualFracRef = useRef<Record<string, number>>({})

  const maxLevel = guildRank * 10

  function handleManualProduce(charId: string, matId: string, matPrice: number) {
    const key = `${charId}:${matId}`
    manualFracRef.current[key] = (manualFracRef.current[key] ?? 0) + 1 / matPrice
    const whole = Math.floor(manualFracRef.current[key])
    if (whole >= 1) {
      // 手動生産では経験値は入らない（自動配置のみ加算）
      addMaterial(matId, whole)
      manualFracRef.current[key] -= whole
    }
  }

  const slotCount    = getSlotCount(facility)
  const researchBonus = getResearchBonus(facility)
  const expandCost   = getUpgradeCost(facilityData.expansionLevel + 1)
  const researchCost = getUpgradeCost(facilityData.researchLevel + 1)

  // Characters assigned to this facility
  const assignedChars = characters.filter(
    (c) => c.assignment?.type === facility
  )
  // Characters unassigned (available to assign)
  const availableChars = characters.filter((c) => c.assignment === null)

  // Build slot list: [char | null, ...]
  const slots: (typeof characters[0] | null)[] = Array.from({ length: slotCount }, (_, i) =>
    assignedChars[i] ?? null
  )

  function handleAssign(charId: string) {
    if (assigningSlot === null) return
    const matId = selectedMaterial
    setAssignment(charId, { type: facility, materialId: matId })
    setAssigningSlot(null)
  }

  function handleUnassign(charId: string) {
    setAssignment(charId, null)
  }

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-lg font-bold text-slate-200">
        {FACILITY_LABEL[facility]}施設
      </h1>

      {/* Facility stats */}
      <div className="bg-slate-800 rounded-lg p-3 text-sm space-y-1">
        <div className="flex justify-between text-slate-300">
          <span>枠数</span>
          <span className="font-semibold">{slotCount} <span className="text-xs text-slate-500">(上限 GR×10={maxLevel})</span></span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>研究ボーナス</span>
          <span className="font-semibold text-green-400">+{(researchBonus * 100).toFixed(0)}%</span>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => { if (spendGold(expandCost)) expandProduction(facility) }}
            disabled={gold < expandCost || facilityData.expansionLevel >= maxLevel}
            className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-500 rounded py-1.5 transition-colors"
          >
            {facilityData.expansionLevel >= maxLevel ? '拡張上限' : `拡張 (${expandCost.toLocaleString()}G)`}
          </button>
          <button
            onClick={() => { if (spendGold(researchCost)) researchProduction(facility) }}
            disabled={gold < researchCost || facilityData.researchLevel >= maxLevel}
            className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-500 rounded py-1.5 transition-colors"
          >
            {facilityData.researchLevel >= maxLevel ? '研究上限' : `研究 (${researchCost.toLocaleString()}G)`}
          </button>
        </div>
      </div>

      {/* Slots */}
      <div>
        <div className="text-sm text-slate-400 mb-2">配置スロット</div>
        <div className="space-y-2">
          {slots.map((char, i) => {
            if (!char) {
              return (
                <button
                  key={i}
                  onClick={() => setAssigningSlot(i)}
                  className="w-full bg-slate-800 border border-dashed border-slate-600 hover:border-yellow-400 rounded-lg p-3 text-slate-500 hover:text-slate-300 text-sm transition-colors text-center"
                >
                  ＋ キャラクターを配置
                </button>
              )
            }
            const master = getCharacterMaster(char.masterId)
            const asgn   = char.assignment
            const matId  = asgn?.type === facility ? asgn.materialId : ''
            const mat    = materials.find((m) => m.id === matId)
            const skillLv = char[SKILL_KEY_MAP[facility]]
            return (
              <div key={char.id} className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-sm font-bold text-slate-300 shrink-0">
                  {master?.name.slice(0, 1) ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-100 truncate">
                    {master?.name ?? char.masterId}
                  </div>
                  <div className="text-xs text-slate-400">
                    {SKILL_LABEL[facility]}.{skillLv}
                    {mat && (
                      <span className="ml-2 text-green-400">
                        → {mat.name} ({mat.ratePerMin}/分)
                      </span>
                    )}
                  </div>
                </div>
                {mat && (
                  <button
                    onClick={() => handleManualProduce(char.id, mat.id, mat.price)}
                    className="text-xs bg-slate-600 hover:bg-slate-500 border border-slate-500 text-slate-200 px-2 py-1 rounded transition-colors shrink-0"
                  >
                    手動
                  </button>
                )}
                <button
                  onClick={() => handleUnassign(char.id)}
                  className="text-xs text-slate-500 hover:text-red-400 transition-colors shrink-0"
                >
                  解除
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Materials inventory */}
      <div>
        <div className="text-sm text-slate-400 mb-2">素材在庫</div>
        <div className="grid grid-cols-2 gap-2">
          {materials.map((mat) => (
            <div
              key={mat.id}
              className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm flex justify-between items-center"
            >
              <span className="text-slate-300">{mat.name}</span>
              <span className="font-semibold text-slate-100">
                {inventoryMaterials[mat.id] ?? 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Assignment modal */}
      {assigningSlot !== null && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setAssigningSlot(null)}
        >
          <div
            className="bg-slate-800 border border-slate-600 rounded-2xl p-4 w-80 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-base font-bold text-white mb-3">配置するキャラクターを選択</div>

            {/* Material selection */}
            <div className="mb-3">
              <div className="text-xs text-slate-400 mb-1">生産する素材</div>
              <div className="grid grid-cols-2 gap-1">
                {materials.map((mat) => (
                  <button
                    key={mat.id}
                    onClick={() => setSelectedMaterial(mat.id)}
                    className={`text-xs p-2 rounded border transition-colors ${
                      selectedMaterial === mat.id
                        ? 'border-yellow-400 text-yellow-300 bg-slate-700'
                        : 'border-slate-600 text-slate-400 hover:border-slate-400'
                    }`}
                  >
                    {mat.name}
                    <span className="block text-slate-500">{mat.ratePerMin}/分</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Available characters */}
            <div className="text-xs text-slate-400 mb-2">配置可能なキャラクター</div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {availableChars.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">配置可能なキャラクターがいません</p>
              ) : (
                availableChars.map((char) => {
                  const master = getCharacterMaster(char.masterId)
                  const skillLv = char[SKILL_KEY_MAP[facility]]
                  return (
                    <button
                      key={char.id}
                      onClick={() => handleAssign(char.id)}
                      className="w-full flex items-center gap-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-yellow-400 rounded-lg p-2 text-left transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                        {master?.name.slice(0, 1) ?? '?'}
                      </div>
                      <div>
                        <div className="text-sm text-slate-100">{master?.name ?? char.masterId}</div>
                        <div className="text-xs text-slate-400">{SKILL_LABEL[facility]}.{skillLv}</div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            <button
              onClick={() => setAssigningSlot(null)}
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
