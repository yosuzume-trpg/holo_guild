'use client'

import { useState } from 'react'
import { RECIPES, CATEGORY_LABEL, getRecipe } from '@/data/recipes'
import { getMaterial } from '@/data/materials'
import { getCharacterMaster } from '@/data/characters'
import { GR_FACILITY_LEVEL_CAP } from '@/data/constants'
import { useGameStore } from '@/store/gameStore'
import { useCharacterStore } from '@/store/characterStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { useFacilityStore } from '@/store/facilityStore'
import FacilityStatsBox from '@/app/_components/facility/FacilityStatsBox'
import AssignedSlotList from '@/app/_components/facility/AssignedSlotList'
import Modal from '@/app/_components/ui/Modal'

export default function CraftPage() {
  const gold           = useGameStore((s) => s.gold)
  const guildRank      = useGameStore((s) => s.guildRank)
  const spendGold      = useGameStore((s) => s.spendGold)
  const characters     = useCharacterStore((s) => s.characters)
  const setAssignment  = useCharacterStore((s) => s.setAssignment)
  const materials      = useInventoryStore((s) => s.materials)
  const removeMaterial = useInventoryStore((s) => s.removeMaterial)
  const addMaterial    = useInventoryStore((s) => s.addMaterial)
  const facilityData   = useFacilityStore((s) => s.craft)
  const getSlotCount   = useFacilityStore((s) => s.getSlotCount)
  const getResearchBonus = useFacilityStore((s) => s.getResearchBonus)
  const getUpgradeCost = useFacilityStore((s) => s.getUpgradeCost)
  const expandGuild    = useFacilityStore((s) => s.expandGuild)
  const researchGuild  = useFacilityStore((s) => s.researchGuild)

  const [assignOpen, setAssignOpen] = useState(false)
  const [pickCharId, setPickCharId] = useState('')
  const [pickRecipeId, setPickRecipeId] = useState(RECIPES[0]?.id ?? '')

  const slotCount     = getSlotCount('craft')
  const researchBonus = getResearchBonus('craft')
  const expandCost    = getUpgradeCost(facilityData.expansionLevel + 1)
  const researchCost  = getUpgradeCost(facilityData.researchLevel + 1)
  const maxLevel      = guildRank * GR_FACILITY_LEVEL_CAP

  const assignedCrafters = characters.filter((c) => c.assignment?.type === 'craft')
  const availableChars   = characters.filter((c) => c.assignment === null)
  const slots = Array.from({ length: slotCount }, (_, i) => assignedCrafters[i] ?? null)

  function canCraft(recipeId: string): boolean {
    const recipe = getRecipe(recipeId)
    if (!recipe) return false
    return recipe.ingredients.every((ing) => (materials[ing.materialId] ?? 0) >= ing.qty)
  }

  function handleManualCraft(recipeId: string) {
    const recipe = getRecipe(recipeId)
    if (!recipe) return
    for (const ing of recipe.ingredients) {
      if (!removeMaterial(ing.materialId, ing.qty)) return
    }
    addMaterial(recipe.id, 1)
  }

  function openAssign() {
    setPickCharId(availableChars[0]?.id ?? '')
    setPickRecipeId(RECIPES[0]?.id ?? '')
    setAssignOpen(true)
  }

  function confirmAssign() {
    if (!pickCharId || !pickRecipeId) return
    setAssignment(pickCharId, { type: 'craft', recipeId: pickRecipeId })
    setAssignOpen(false)
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-ink">工芸ギルド</h1>

      <FacilityStatsBox
        slotCount={slotCount}
        slotNote={`(上限 GR×10=${maxLevel})`}
        bonusLabel="製作速度ボーナス"
        bonusPct={researchBonus}
        gold={gold}
        expandCost={expandCost}
        researchCost={researchCost}
        onExpand={() => { if (spendGold(expandCost)) expandGuild('craft') }}
        onResearch={() => { if (spendGold(researchCost)) researchGuild('craft') }}
        expandAtMax={facilityData.expansionLevel >= maxLevel}
        researchAtMax={facilityData.researchLevel >= maxLevel}
      />

      <AssignedSlotList
        slots={slots}
        onAddSlot={openAssign}
        onUnassign={(id) => setAssignment(id, null)}
        renderInfo={(char) => {
          const asgn = char.assignment as Extract<typeof char.assignment, { type: 'craft' }>
          const recipe = getRecipe(asgn?.recipeId ?? '')
          return (
            <>
              工芸Lv.{char.craftLevel}
              {recipe && <span className="ml-2 text-success">→ {recipe.name} ({recipe.sellPrice}G)</span>}
            </>
          )
        }}
      />

      <div>
        <div className="text-sm text-ink-muted mb-2">手動製作（クリックで即時1個）</div>
        {Object.entries(CATEGORY_LABEL).map(([cat, catLabel]) => {
          const catRecipes = RECIPES.filter((r) => r.category === cat)
          return (
            <div key={cat} className="mb-3">
              <div className="text-xs text-ink-subtle mb-1">{catLabel}</div>
              <div className="grid grid-cols-2 gap-2">
                {catRecipes.map((recipe) => {
                  const ok = canCraft(recipe.id)
                  return (
                    <button key={recipe.id} onClick={() => ok && handleManualCraft(recipe.id)} disabled={!ok}
                      className="bg-surface border border-line hover:border-accent-strong disabled:opacity-40 disabled:cursor-not-allowed rounded-lg p-2 text-left transition-colors">
                      <div className="text-xs font-semibold text-ink">{recipe.name}</div>
                      <div className="text-xs text-ink-muted mt-0.5">
                        {recipe.ingredients.map((ing) => {
                          const m = getMaterial(ing.materialId)
                          const have = materials[ing.materialId] ?? 0
                          return (
                            <span key={ing.materialId} className={`mr-1 ${have >= ing.qty ? 'text-ink-muted' : 'text-danger'}`}>
                              {m?.name}×{ing.qty}({have})
                            </span>
                          )
                        })}
                      </div>
                      <div className="text-xs text-success mt-0.5">→ {recipe.sellPrice}G</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {assignOpen && (
        <Modal onClose={() => setAssignOpen(false)} boxClassName="w-80 space-y-3">
          <div className="font-bold text-ink">配置設定</div>
          <div>
            <div className="text-xs text-ink-muted mb-1">キャラクター</div>
            <select value={pickCharId} onChange={(e) => setPickCharId(e.target.value)}
              className="w-full bg-app border border-line rounded px-2 py-1.5 text-sm text-ink">
              {availableChars.map((c) => {
                const m = getCharacterMaster(c.masterId)
                return <option key={c.id} value={c.id}>{m?.name ?? c.masterId} (工芸Lv.{c.craftLevel})</option>
              })}
            </select>
          </div>
          <div>
            <div className="text-xs text-ink-muted mb-1">製作するレシピ</div>
            <select value={pickRecipeId} onChange={(e) => setPickRecipeId(e.target.value)}
              className="w-full bg-app border border-line rounded px-2 py-1.5 text-sm text-ink">
              {RECIPES.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.sellPrice}G)</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAssignOpen(false)}
              className="flex-1 bg-surface-2 hover:bg-surface-3 text-ink py-2 rounded text-sm">キャンセル</button>
            <button onClick={confirmAssign} disabled={!pickCharId}
              className="flex-1 bg-accent hover:bg-accent-strong disabled:opacity-40 text-ink font-bold py-2 rounded text-sm">配置</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
