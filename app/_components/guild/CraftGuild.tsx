'use client'

import { useState, useEffect } from 'react'
import { RECIPES, CATEGORY_LABEL, getRecipe } from '@/data/recipes'
import { getMaterial } from '@/data/materials'
import { getAutoProgress, getCraftRate } from '@/data/production'
import { getCharacterMaster } from '@/data/characters'
import { GR_FACILITY_LEVEL_CAP, MANUAL_CRAFT_MS_PER_100G, MANUAL_CRAFT_MIN_MS } from '@/data/constants'
import { useGameStore } from '@/store/gameStore'
import { useCharacterStore } from '@/store/characterStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { useFacilityStore } from '@/store/facilityStore'
import { useManualProductionStore } from '@/store/manualProductionStore'
import { useProductionFracStore } from '@/store/productionFracStore'
import FacilityStatsBox from '@/app/_components/facility/FacilityStatsBox'
import AssignedSlotList from '@/app/_components/facility/AssignedSlotList'
import ItemTile from '@/app/_components/facility/ItemTile'
import Modal from '@/app/_components/ui/Modal'
import CharacterAvatar from '@/app/_components/ui/CharacterAvatar'

export default function CraftGuild() {
  const gold           = useGameStore((s) => s.gold)
  const guildRank      = useGameStore((s) => s.guildRank)
  const spendGold      = useGameStore((s) => s.spendGold)
  const characters     = useCharacterStore((s) => s.characters)
  const setAssignment  = useCharacterStore((s) => s.setAssignment)
  const materials      = useInventoryStore((s) => s.materials)
  const removeMaterial = useInventoryStore((s) => s.removeMaterial)
  const facilityData   = useFacilityStore((s) => s.craft)
  const getSlotCount   = useFacilityStore((s) => s.getSlotCount)
  const getResearchBonus = useFacilityStore((s) => s.getResearchBonus)
  const getUpgradeCost = useFacilityStore((s) => s.getUpgradeCost)
  const expandGuild    = useFacilityStore((s) => s.expandGuild)
  const researchGuild  = useFacilityStore((s) => s.researchGuild)

  // 手動製作タスクは永続ストアに保持（画面遷移・リロード・オフラインをまたいで継続）
  const craftTasks = useManualProductionStore((s) => s.craftTasks)
  const startCraftTask = useManualProductionStore((s) => s.startCraftTask)
  const collectCompleted = useManualProductionStore((s) => s.collectCompleted)
  // 自動製作の進捗（次の1個まで）補間用
  const frac = useProductionFracStore((s) => s.frac)
  const lastTick = useProductionFracStore((s) => s.lastTick)

  const [assignOpen, setAssignOpen] = useState(false)
  const [editCharId, setEditCharId] = useState<string | null>(null)
  const [pickCharId, setPickCharId] = useState('')
  const [pickRecipeId, setPickRecipeId] = useState(RECIPES[0]?.id ?? '')
  const [, setTick] = useState(0)

  const slotCount     = getSlotCount('craft')
  const researchBonus = getResearchBonus('craft')
  const expandCost    = getUpgradeCost(facilityData.expansionLevel + 1)
  const researchCost  = getUpgradeCost(facilityData.researchLevel + 1)
  const maxLevel      = guildRank * GR_FACILITY_LEVEL_CAP

  const assignedCrafters = characters.filter((c) => c.assignment?.type === 'craft')
  const availableChars   = characters.filter((c) => c.assignment === null)
  const slots = Array.from({ length: slotCount }, (_, i) => assignedCrafters[i] ?? null)

  // 現在の配置でレシピごとに1分あたり製作できる合計個数
  const ratePerRecipe: Record<string, number> = {}
  for (const char of assignedCrafters) {
    const asgn = char.assignment as Extract<typeof char.assignment, { type: 'craft' }>
    if (!asgn) continue
    ratePerRecipe[asgn.recipeId] =
      (ratePerRecipe[asgn.recipeId] ?? 0) + getCraftRate(char.craftLevel, researchBonus)
  }

  function canCraft(recipeId: string): boolean {
    const recipe = getRecipe(recipeId)
    if (!recipe) return false
    return recipe.ingredients.every((ing) => (materials[ing.materialId] ?? 0) >= ing.qty)
  }

  function startManualCraft(recipeId: string) {
    const recipe = getRecipe(recipeId)
    if (!recipe) return
    if (craftTasks[recipeId]) return // 製作中は新規不可
    if (!canCraft(recipeId)) return
    // 材料を先に消費し、完成品は所要時間経過後に付与される
    for (const ing of recipe.ingredients) {
      if (!removeMaterial(ing.materialId, ing.qty)) return
    }
    // 完成品の売値（経済倍率適用済み）に比例。100Gにつき MANUAL_CRAFT_MS_PER_100G ミリ秒、最低 MANUAL_CRAFT_MIN_MS。
    const duration = Math.max(MANUAL_CRAFT_MIN_MS, (recipe.sellPrice / 100) * MANUAL_CRAFT_MS_PER_100G)
    startCraftTask(recipeId, duration)
  }

  // 進捗アニメーションと完了回収。手動タスク or 自動製作の配置がある間だけ動かす。
  const hasAssigned = assignedCrafters.length > 0
  useEffect(() => {
    if (Object.keys(craftTasks).length === 0 && !hasAssigned) return
    const id = setInterval(() => {
      collectCompleted()
      setTick((x) => x + 1)
    }, 100)
    return () => clearInterval(id)
  }, [craftTasks, collectCompleted, hasAssigned])

  const editing = editCharId !== null
  const modalOpen = assignOpen || editing
  const editChar = editing ? characters.find((c) => c.id === editCharId) : null
  const editMaster = editChar ? getCharacterMaster(editChar.masterId) : null

  function openAssign() {
    setPickCharId(availableChars[0]?.id ?? '')
    setPickRecipeId(RECIPES[0]?.id ?? '')
    setAssignOpen(true)
  }

  function openEdit(char: typeof characters[number]) {
    const asgn = char.assignment as Extract<typeof char.assignment, { type: 'craft' }>
    setPickRecipeId(asgn?.recipeId ?? RECIPES[0]?.id ?? '')
    setEditCharId(char.id)
  }

  function closeModal() {
    setAssignOpen(false)
    setEditCharId(null)
  }

  function confirmAssign() {
    const target = editCharId ?? pickCharId
    if (!target || !pickRecipeId) return
    setAssignment(target, { type: 'craft', recipeId: pickRecipeId })
    closeModal()
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
        slotProgress={(char) => {
          const asgn = char.assignment as Extract<typeof char.assignment, { type: 'craft' }>
          if (!asgn?.recipeId) return null
          // 材料不足でブロック中は待機表示（null）
          if (!canCraft(asgn.recipeId)) return null
          const rate = getCraftRate(char.craftLevel, researchBonus)
          return getAutoProgress(frac[`craft:${char.id}`] ?? 0, rate, lastTick, Date.now())
        }}
        renderInfo={(char) => {
          const asgn = char.assignment as Extract<typeof char.assignment, { type: 'craft' }>
          const recipe = getRecipe(asgn?.recipeId ?? '')
          // 自動製作レート(個/分): 研究ボーナス＋キャラ工芸レベルを反映（基準1個/分）
          const rate = getCraftRate(char.craftLevel, researchBonus)
          return (
            <>
              工芸Lv.{char.craftLevel}
              {recipe && <div className=" text-success">{recipe.name} ({rate.toFixed(2)}/分)</div>}
            </>
          )
        }}
        renderActions={(char) => (
          <button
            onClick={() => openEdit(char)}
            className="text-xs bg-surface-2 hover:bg-surface-3 border border-line-strong text-ink px-2 py-1 rounded transition-colors shrink-0"
          >
            変更
          </button>
        )}
      />

      <div>
        <div className="text-sm text-ink-muted mb-2">手動製作（時間がかかります）</div>
        {Object.entries(CATEGORY_LABEL).map(([cat, catLabel]) => {
          const catRecipes = RECIPES.filter((r) => r.category === cat)
          return (
            <div key={cat} className="mb-3">
              <div className="text-xs text-ink-subtle mb-1">{catLabel}</div>
              <div className="grid grid-cols-2 gap-2">
                {catRecipes.map((recipe) => {
                  const task = craftTasks[recipe.id]
                  const crafting = !!task
                  const progress = crafting ? Math.min(1, (Date.now() - task.start) / task.duration) : 0
                  const ok = canCraft(recipe.id)
                  return (
                    <ItemTile
                      key={recipe.id}
                      name={recipe.name}
                      price={recipe.sellPrice}
                      stock={materials[recipe.id] ?? 0}
                      ratePerMin={ratePerRecipe[recipe.id] ?? 0}
                      onClick={() => startManualCraft(recipe.id)}
                      disabled={crafting || !ok}
                      progress={crafting ? progress : null}
                      ingredients={recipe.ingredients.map((ing) => ({
                        name: getMaterial(ing.materialId)?.name ?? ing.materialId,
                        qty: ing.qty,
                        have: materials[ing.materialId] ?? 0,
                      }))}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {modalOpen && (
        <Modal onClose={closeModal} boxClassName="w-80 space-y-3">
          <div className="font-bold text-ink">{editing ? 'レシピ変更' : '配置設定'}</div>
          <div>
            <div className="text-xs text-ink-muted mb-1">キャラクター</div>
            {editing ? (
              <div className="text-sm text-ink px-2 py-1.5">{editMaster?.name ?? editCharId} (工芸Lv.{editChar?.craftLevel})</div>
            ) : availableChars.length === 0 ? (
              <p className="text-sm text-ink-subtle text-center py-4">配置可能なキャラクターがいません</p>
            ) : (
              <div className="max-h-44 overflow-y-auto grid grid-cols-3 gap-2">
                {availableChars.map((c) => {
                  const m = getCharacterMaster(c.masterId)
                  const sel = pickCharId === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setPickCharId(c.id)}
                      className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-colors ${
                        sel ? 'border-accent-strong bg-surface-2' : 'border-line hover:border-accent-strong'
                      }`}
                    >
                      <CharacterAvatar masterId={c.masterId} size="lg" />
                      <div className="text-[10px] text-ink leading-tight text-center w-full truncate">{m?.name ?? c.masterId}</div>
                      <div className="text-[10px] text-ink-muted">Lv.{c.craftLevel}</div>
                    </button>
                  )
                })}
              </div>
            )}
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
            <button onClick={closeModal}
              className="flex-1 bg-surface-2 hover:bg-surface-3 text-ink py-2 rounded text-sm">キャンセル</button>
            <button onClick={confirmAssign} disabled={!editing && !pickCharId}
              className="flex-1 bg-accent hover:bg-accent-strong disabled:opacity-40 text-ink font-bold py-2 rounded text-sm">{editing ? '変更' : '配置'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
