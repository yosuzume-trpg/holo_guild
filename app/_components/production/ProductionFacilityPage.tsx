'use client'

import { useRef, useState } from 'react'
import type { ProductionFacilityId } from '@/types/game'
import { MATERIALS_BY_FACILITY } from '@/data/materials'
import { getCharacterMaster } from '@/data/characters'
import { GR_FACILITY_LEVEL_CAP } from '@/data/constants'
import { useGameStore } from '@/store/gameStore'
import { useCharacterStore } from '@/store/characterStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { useFacilityStore } from '@/store/facilityStore'
import FacilityStatsBox from '@/app/_components/facility/FacilityStatsBox'
import AssignedSlotList from '@/app/_components/facility/AssignedSlotList'
import CharacterAvatar from '@/app/_components/ui/CharacterAvatar'
import Modal from '@/app/_components/ui/Modal'

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

  const maxLevel = guildRank * GR_FACILITY_LEVEL_CAP

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
      <FacilityStatsBox
        slotCount={slotCount}
        slotNote={`(上限 GR×10=${maxLevel})`}
        bonusLabel="研究ボーナス"
        bonusPct={researchBonus}
        gold={gold}
        expandCost={expandCost}
        researchCost={researchCost}
        onExpand={() => { if (spendGold(expandCost)) expandProduction(facility) }}
        onResearch={() => { if (spendGold(researchCost)) researchProduction(facility) }}
        expandAtMax={facilityData.expansionLevel >= maxLevel}
        researchAtMax={facilityData.researchLevel >= maxLevel}
      />

      {/* Slots */}
      <AssignedSlotList
        slots={slots}
        onAddSlot={(i) => setAssigningSlot(i)}
        onUnassign={handleUnassign}
        renderInfo={(char) => {
          const asgn  = char.assignment
          const matId = asgn?.type === facility ? asgn.materialId : ''
          const mat   = materials.find((m) => m.id === matId)
          return (
            <>
              {SKILL_LABEL[facility]}.{char[SKILL_KEY_MAP[facility]]}
              {mat && (
                <span className="ml-2 text-green-400">
                  → {mat.name} ({mat.ratePerMin}/分)
                </span>
              )}
            </>
          )
        }}
        renderActions={(char) => {
          const asgn  = char.assignment
          const matId = asgn?.type === facility ? asgn.materialId : ''
          const mat   = materials.find((m) => m.id === matId)
          if (!mat) return null
          return (
            <button
              onClick={() => handleManualProduce(char.id, mat.id, mat.price)}
              className="text-xs bg-slate-600 hover:bg-slate-500 border border-slate-500 text-slate-200 px-2 py-1 rounded transition-colors shrink-0"
            >
              手動
            </button>
          )
        }}
      />

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
        <Modal onClose={() => setAssigningSlot(null)} boxClassName="w-80 max-h-[80vh] flex flex-col">
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
                    <CharacterAvatar masterId={char.masterId} size="xs" />
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
        </Modal>
      )}
    </div>
  )
}
