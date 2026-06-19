'use client'

import { useState } from 'react'
import { RECIPES, CATEGORY_LABEL, getRecipe } from '@/data/recipes'
import { getMaterial } from '@/data/materials'
import { getCharacterMaster } from '@/data/characters'
import { useGameStore } from '@/store/gameStore'
import { useCharacterStore } from '@/store/characterStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { useFacilityStore } from '@/store/facilityStore'

export default function CraftPage() {
  const gold           = useGameStore((s) => s.gold)
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
      <h1 className="text-lg font-bold text-slate-200">工芸ギルド</h1>

      <div className="bg-slate-800 rounded-lg p-3 text-sm space-y-1">
        <div className="flex justify-between text-slate-300">
          <span>枠数</span><span className="font-semibold">{slotCount}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>製作速度ボーナス</span>
          <span className="font-semibold text-green-400">+{(researchBonus * 100).toFixed(0)}%</span>
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={() => { if (spendGold(expandCost)) expandGuild('craft') }} disabled={gold < expandCost}
            className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-500 rounded py-1.5">
            拡張 ({expandCost.toLocaleString()}G)
          </button>
          <button onClick={() => { if (spendGold(researchCost)) researchGuild('craft') }} disabled={gold < researchCost}
            className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-500 rounded py-1.5">
            研究 ({researchCost.toLocaleString()}G)
          </button>
        </div>
      </div>

      <div>
        <div className="text-sm text-slate-400 mb-2">配置スロット</div>
        <div className="space-y-2">
          {slots.map((char, i) => {
            if (!char) return (
              <button key={i} onClick={openAssign}
                className="w-full bg-slate-800 border border-dashed border-slate-600 hover:border-yellow-400 rounded-lg p-3 text-slate-500 hover:text-slate-300 text-sm transition-colors text-center">
                ＋ キャラクターを配置
              </button>
            )
            const master = getCharacterMaster(char.masterId)
            const asgn = char.assignment as Extract<typeof char.assignment, { type: 'craft' }>
            const recipe = getRecipe(asgn?.recipeId ?? '')
            return (
              <div key={char.id} className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center text-sm font-bold text-slate-300 shrink-0">
                  {master?.name.slice(0, 1) ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-100 truncate">{master?.name}</div>
                  <div className="text-xs text-slate-400">
                    工芸Lv.{char.craftLevel}
                    {recipe && <span className="ml-2 text-green-400">→ {recipe.name} ({recipe.sellPrice}G)</span>}
                  </div>
                </div>
                <button onClick={() => setAssignment(char.id, null)} className="text-xs text-slate-500 hover:text-red-400 shrink-0">解除</button>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <div className="text-sm text-slate-400 mb-2">手動製作（クリックで即時1個）</div>
        {Object.entries(CATEGORY_LABEL).map(([cat, catLabel]) => {
          const catRecipes = RECIPES.filter((r) => r.category === cat)
          return (
            <div key={cat} className="mb-3">
              <div className="text-xs text-slate-500 mb-1">{catLabel}</div>
              <div className="grid grid-cols-2 gap-2">
                {catRecipes.map((recipe) => {
                  const ok = canCraft(recipe.id)
                  return (
                    <button key={recipe.id} onClick={() => ok && handleManualCraft(recipe.id)} disabled={!ok}
                      className="bg-slate-800 border border-slate-700 hover:border-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg p-2 text-left transition-colors">
                      <div className="text-xs font-semibold text-slate-200">{recipe.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {recipe.ingredients.map((ing) => {
                          const m = getMaterial(ing.materialId)
                          const have = materials[ing.materialId] ?? 0
                          return (
                            <span key={ing.materialId} className={`mr-1 ${have >= ing.qty ? 'text-slate-400' : 'text-red-400'}`}>
                              {m?.name}×{ing.qty}({have})
                            </span>
                          )
                        })}
                      </div>
                      <div className="text-xs text-green-400 mt-0.5">→ {recipe.sellPrice}G</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {assignOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setAssignOpen(false)}>
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-4 w-80 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold text-white">配置設定</div>
            <div>
              <div className="text-xs text-slate-400 mb-1">キャラクター</div>
              <select value={pickCharId} onChange={(e) => setPickCharId(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200">
                {availableChars.map((c) => {
                  const m = getCharacterMaster(c.masterId)
                  return <option key={c.id} value={c.id}>{m?.name ?? c.masterId} (工芸Lv.{c.craftLevel})</option>
                })}
              </select>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">製作するレシピ</div>
              <select value={pickRecipeId} onChange={(e) => setPickRecipeId(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200">
                {RECIPES.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} ({r.sellPrice}G)</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAssignOpen(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded text-sm">キャンセル</button>
              <button onClick={confirmAssign} disabled={!pickCharId}
                className="flex-1 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-slate-900 font-bold py-2 rounded text-sm">配置</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
