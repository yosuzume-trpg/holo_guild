'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Header from './Header'
import TabNav from './TabNav'
import SetupScreen from './SetupScreen'
import { useGameStore, CYCLE_DURATION_MS } from '@/store/gameStore'
import { useCharacterStore } from '@/store/characterStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { useDungeonStore } from '@/store/dungeonStore'
import { useFacilityStore } from '@/store/facilityStore'
import { getMaterial, MATERIALS } from '@/data/materials'
import { getEquipment } from '@/data/equipment'
import { RECIPES, getRecipe } from '@/data/recipes'

export default function GameShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const isSetupComplete  = useGameStore((s) => s.isSetupComplete)
  const activeBattle     = useDungeonStore((s) => s.activeBattle)
  const pathname         = usePathname()
  const isOnDungeonPage  = !!pathname?.match(/^\/dungeon\/\d+$/)
  // fractional production accumulator: key = `${charId}:${materialId}`
  const fracRef = useRef<Record<string, number>>({})
  const lastTickRef = useRef<number>(0)

  useEffect(() => {
    setMounted(true)
    lastTickRef.current = Date.now()
  }, [])

  // Cycle tick
  useEffect(() => {
    if (!mounted) return
    const id = setInterval(() => {
      const { cycleStartTime, advanceCycle } = useGameStore.getState()
      if (Date.now() - cycleStartTime >= CYCLE_DURATION_MS) {
        advanceCycle()
        useCharacterStore.getState().resetSocialFlag()
      }
    }, 5000)
    return () => clearInterval(id)
  }, [mounted])

  // Heartbeat: keep lastActiveTime current for offline calculation
  useEffect(() => {
    if (!mounted) return
    const id = setInterval(() => {
      useGameStore.getState().setLastActiveTime(Date.now())
    }, 10_000)
    return () => clearInterval(id)
  }, [mounted])

  // Production + guild tick: runs every 10 seconds
  useEffect(() => {
    if (!mounted) return

    // Apply offline catch-up on first mount
    const offlineMin = useGameStore.getState().getOfflineElapsed() / 60_000
    applyProduction(offlineMin)
    applyGuildWork(offlineMin)
    lastTickRef.current = Date.now()

    const id = setInterval(() => {
      const now = Date.now()
      const elapsedMin = (now - lastTickRef.current) / 60_000
      lastTickRef.current = now
      applyProduction(elapsedMin)
      applyGuildWork(elapsedMin)
    }, 10_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  function applyProduction(elapsedMin: number) {
    if (elapsedMin <= 0) return
    const { characters } = useCharacterStore.getState()
    const { addMaterial } = useInventoryStore.getState()
    const { harvestBonuses } = useGameStore.getState()
    const frac = fracRef.current

    for (const char of characters) {
      const asgn = char.assignment
      if (!asgn) continue
      if (
        asgn.type !== 'farm' &&
        asgn.type !== 'mining' &&
        asgn.type !== 'fishing' &&
        asgn.type !== 'alchemy'
      ) continue

      const mat = getMaterial(asgn.materialId)
      if (!mat) continue

      // Tool bonus from equipped tool
      let toolBonus = 0
      const toolId = char.equipment.tool
      if (toolId) {
        const inv = useInventoryStore.getState().equipment.find((e) => e.instanceId === toolId)
        if (inv) {
          const toolMaster = getEquipment(inv.masterId)
          if (toolMaster) {
            const facilityKey = `${asgn.type}Percent` as keyof typeof toolMaster.effects
            toolBonus = (toolMaster.effects[facilityKey] ?? 0) / 100
          }
        }
      }

      const harvestBonus = (harvestBonuses[mat.id] ?? 0) / 100
      const rate = mat.ratePerMin * (1 + toolBonus + harvestBonus)
      const key = `${char.id}:${mat.id}`
      frac[key] = (frac[key] ?? 0) + rate * elapsedMin

      const whole = Math.floor(frac[key])
      if (whole >= 1) {
        addMaterial(mat.id, whole)
        frac[key] -= whole
        useCharacterStore
          .getState()
          .gainProductionExp(char.id, asgn.type, mat.price * rate * elapsedMin)
      }
    }
  }

  function applyGuildWork(elapsedMin: number) {
    if (elapsedMin <= 0) return
    const { characters } = useCharacterStore.getState()
    const { getResearchBonus } = useFacilityStore.getState()
    const frac = fracRef.current

    for (const char of characters) {
      const asgn = char.assignment
      // Fetch fresh inventory per character so canMake/canSell reflects prior iterations
      const inv = useInventoryStore.getState()

      // ── Craft ──────────────────────────────────────────────────────────
      if (asgn?.type === 'craft') {
        const recipe = getRecipe(asgn.recipeId)
        if (!recipe) continue
        const charBonus = (char.craftLevel - 1) * 0.01
        const rate = 1 * (1 + getResearchBonus('craft') + charBonus)
        const key = `craft:${char.id}`
        frac[key] = (frac[key] ?? 0) + rate * elapsedMin
        const whole = Math.floor(frac[key])
        if (whole < 1) continue
        const canMake = Math.min(whole, ...recipe.ingredients.map(
          (ing) => Math.floor((inv.materials[ing.materialId] ?? 0) / ing.qty)
        ))
        if (canMake < 1) continue
        for (const ing of recipe.ingredients) inv.removeMaterial(ing.materialId, ing.qty * canMake)
        inv.addMaterial(recipe.id, canMake)
        useCharacterStore.getState().gainCraftExp(char.id, canMake)
        frac[key] -= whole
      }

      // ── Merchant ────────────────────────────────────────────────────────
      if (asgn?.type === 'merchant') {
        const matDef  = MATERIALS.find((m) => m.id === asgn.sellMaterialId && m.facility !== 'dungeon')
        const recipeDef = RECIPES.find((r) => r.id === asgn.sellMaterialId)
        const price = matDef?.price ?? recipeDef?.sellPrice
        if (price === undefined) continue
        const charBonus = (char.merchantLevel - 1) * 0.01
        const rate = 1 * (1 + getResearchBonus('merchant') + charBonus)
        const key = `merchant:${char.id}`
        frac[key] = (frac[key] ?? 0) + rate * elapsedMin
        const whole = Math.floor(frac[key])
        if (whole < 1) continue
        const stock   = inv.materials[asgn.sellMaterialId] ?? 0
        const canSell = Math.min(whole, Math.max(0, stock - asgn.minStock))
        if (canSell < 1) continue
        if (inv.removeMaterial(asgn.sellMaterialId, canSell)) {
          useGameStore.getState().addGold(price * canSell)
          useCharacterStore.getState().gainMerchantExp(char.id, canSell)
          frac[key] -= whole
        }
      }
    }
  }

  if (!mounted) {
    return (
      <div className="flex h-dvh items-center justify-center bg-slate-900 text-slate-400">
        読み込み中...
      </div>
    )
  }

  if (!isSetupComplete) {
    return <SetupScreen />
  }

  return (
    <div className="relative flex flex-col h-dvh bg-slate-900 text-white">
      <Header />
      <main className="flex-1 overflow-y-auto min-h-0">
        {children}
      </main>
      <TabNav />

      {/* Block navigation during an active dungeon battle */}
      {activeBattle && !isOnDungeonPage && (
        <div className="absolute inset-0 bg-black/75 z-50 flex items-center justify-center">
          <div className="bg-slate-800 border border-yellow-400 rounded-2xl p-6 text-center w-72 space-y-4">
            <div className="text-yellow-300 font-bold text-lg">ダンジョン攻略中</div>
            <div className="text-slate-300 text-sm">
              DL{activeBattle.dungeonLevel} —
              ステージ{activeBattle.currentStage + 1}/6
            </div>
            <div className="text-xs text-slate-400">
              {activeBattle.stageType === 'boss' ? '🔴 BOSS' :
               activeBattle.stageType === 'elite' ? '🟠 強敵' : '⚔️ 戦闘中'}
            </div>
            <Link
              href={`/dungeon/${activeBattle.dungeonLevel}`}
              className="block w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-3 rounded-xl transition-colors"
            >
              ダンジョンに戻る
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
