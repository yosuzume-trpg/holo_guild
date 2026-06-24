'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Header from './Header'
import TabNav from './TabNav'
import SetupScreen from './SetupScreen'
import { useGameStore } from '@/store/gameStore'
import { CYCLE_DURATION_MS } from '@/data/constants'
import { useCharacterStore } from '@/store/characterStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { useDungeonStore } from '@/store/dungeonStore'
import { useFacilityStore } from '@/store/facilityStore'
import { useManualProductionStore } from '@/store/manualProductionStore'
import { useProductionFracStore } from '@/store/productionFracStore'
import { getMaterial, MATERIALS } from '@/data/materials'
import { getProductionRate, getDungeonRate, getCraftRate, getMerchantRate } from '@/data/production'
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

    // 永続化された端数アキュムレータを復元（リロード/タブを閉じても引き継ぐ）
    fracRef.current = { ...useProductionFracStore.getState().frac }

    // Apply offline catch-up on first mount
    const offlineMin = useGameStore.getState().getOfflineElapsed() / 60_000
    applyProduction(offlineMin)
    applyGuildWork(offlineMin)
    // 手動生産タスクの完了回収（オフライン・リロード後も含む。生産ページ外でも完了する）
    useManualProductionStore.getState().collectCompleted()
    persistFrac()
    lastTickRef.current = Date.now()

    const id = setInterval(() => {
      const now = Date.now()
      const elapsedMin = (now - lastTickRef.current) / 60_000
      lastTickRef.current = now
      applyProduction(elapsedMin)
      applyGuildWork(elapsedMin)
      useManualProductionStore.getState().collectCompleted()
      persistFrac()
    }, 10_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  // 端数アキュムレータを永続ストアへ保存（ティックごと）。lastTick はUIの進捗補間に使う。
  function persistFrac() {
    useProductionFracStore.getState().setFrac({ ...fracRef.current }, lastTickRef.current)
  }

  function applyProduction(elapsedMin: number) {
    if (elapsedMin <= 0) return
    const { characters } = useCharacterStore.getState()
    const { addMaterial } = useInventoryStore.getState()
    const { harvestBonuses } = useGameStore.getState()
    const { getResearchBonus } = useFacilityStore.getState()
    const frac = fracRef.current

    for (const char of characters) {
      const asgn = char.assignment
      if (!asgn) continue

      // Dungeon auto-grind: DL bonus (+1%/level, DL1=+0%) + star bonus
      if (asgn.type === 'dungeon') {
        const mat = getMaterial(asgn.materialId)
        if (!mat) continue
        const rate = getDungeonRate(mat, asgn.level, char.starRank)
        const key = `dungeon:${char.id}:${mat.id}`
        frac[key] = (frac[key] ?? 0) + rate * elapsedMin
        const whole = Math.floor(frac[key])
        if (whole >= 1) {
          addMaterial(mat.id, whole)
          frac[key] -= whole
        }
        continue
      }

      if (
        asgn.type !== 'farm' &&
        asgn.type !== 'mining' &&
        asgn.type !== 'fishing' &&
        asgn.type !== 'alchemy'
      ) continue

      const mat = getMaterial(asgn.materialId)
      if (!mat) continue

      // 研究ボーナス・キャラ生産レベル・凸(★)・装備道具を反映した実レート（豊作は含まない共通ロジック）
      const researchBonus = getResearchBonus(asgn.type)
      const equipmentList = useInventoryStore.getState().equipment
      const baseRate = getProductionRate(char, mat, asgn.type, researchBonus, equipmentList)
      // 豊作ボーナス(サイクルごとに変動)だけはここで加算
      const harvestBonus = (harvestBonuses[mat.id] ?? 0) / 100
      const rate = baseRate + mat.ratePerMin * harvestBonus
      const key = `${char.id}:${mat.id}`
      frac[key] = (frac[key] ?? 0) + rate * elapsedMin

      // 経験値は整数個ドロップの有無に関わらず毎tick加算（取りこぼし防止）
      // 育成ペースは市場価格(price)とは独立に expValue 基準で算出し、全素材で一律に保つ
      useCharacterStore
        .getState()
        .gainProductionExp(char.id, asgn.type, mat.expValue * rate * elapsedMin)

      const whole = Math.floor(frac[key])
      if (whole >= 1) {
        addMaterial(mat.id, whole)
        frac[key] -= whole
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
        const rate = getCraftRate(char.craftLevel, getResearchBonus('craft'))
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
        const rate = getMerchantRate(char.merchantLevel, getResearchBonus('merchant'))
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
      <div className="flex h-dvh items-center justify-center bg-app text-ink-muted">
        読み込み中...
      </div>
    )
  }

  if (!isSetupComplete) {
    return <SetupScreen />
  }

  return (
    <div className="relative flex flex-col h-dvh bg-app text-ink">
      <Header />
      <main className="flex-1 overflow-y-auto min-h-0">
        {children}
      </main>
      <TabNav />

      {/* Block navigation during an active dungeon battle */}
      {activeBattle && !isOnDungeonPage && (
        <div className="absolute inset-0 bg-black/75 z-50 flex items-center justify-center">
          <div className="bg-surface border border-accent-strong rounded-2xl p-6 text-center w-72 space-y-4">
            <div className="text-accent-strong font-bold text-lg">ダンジョン攻略中</div>
            <div className="text-ink text-sm">
              DL{activeBattle.dungeonLevel} —
              ステージ{activeBattle.currentStage + 1}/6
            </div>
            <div className="text-xs text-ink-muted">
              {activeBattle.stageType === 'boss' ? '🔴 BOSS' :
               activeBattle.stageType === 'elite' ? '🟠 強敵' : '⚔️ 戦闘中'}
            </div>
            <Link
              href={`/dungeon/${activeBattle.dungeonLevel}`}
              className="block w-full bg-accent hover:bg-accent-strong text-ink font-bold py-3 rounded-xl transition-colors"
            >
              ダンジョンに戻る
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
