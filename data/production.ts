import type { CharacterInstance, EquipmentInstance, ProductionFacilityId } from '@/types/game'
import type { MaterialDef } from '@/data/materials'
import { getEquipment } from '@/data/equipment'
import {
  PROD_STAR_BONUS_PER_RANK,
  PROD_CHAR_LEVEL_BONUS,
  PROD_DL_BONUS_PER_LEVEL,
  CRAFT_CHAR_LEVEL_BONUS,
  MERCHANT_CHAR_LEVEL_BONUS,
} from '@/data/constants'

/**
 * 装備している道具の生産量ボーナス(割合, 例: 0.02 = +2%)。
 * 該当施設に対応する効果(farmPercent など)のみ参照。★ランクで効果が倍々(★1=base, ★2=base×2…)。
 */
export function getToolBonus(
  char: CharacterInstance,
  facility: ProductionFacilityId,
  equipmentList: EquipmentInstance[],
): number {
  const toolId = char.equipment.tool
  if (!toolId) return 0
  const toolInst = equipmentList.find((e) => e.instanceId === toolId)
  if (!toolInst) return 0
  const toolMaster = getEquipment(toolInst.masterId)
  if (!toolMaster) return 0
  const facilityKey = `${facility}Percent` as keyof typeof toolMaster.effects
  const basePct = toolMaster.effects[facilityKey] ?? 0
  if (basePct <= 0) return 0
  return (basePct * Math.pow(2, toolInst.starRank - 1)) / 100
}

/**
 * 配置キャラの実生産レート(個/分)。研究ボーナス・キャラ生産レベル・凸(★)・装備道具を反映。
 * 豊作ボーナスはサイクルごとに変動するため含めない。
 *
 * @param researchBonus 施設の研究ボーナス(割合, getResearchBonus の戻り値)
 * @param equipmentList 所持装備インスタンス一覧(道具ボーナス算出用, inventoryStore.equipment)
 */
export function getProductionRate(
  char: CharacterInstance,
  mat: MaterialDef,
  facility: ProductionFacilityId,
  researchBonus: number,
  equipmentList: EquipmentInstance[],
): number {
  const toolBonus = getToolBonus(char, facility, equipmentList)
  const charLevelBonus =
    ((char[`${facility}Level` as keyof CharacterInstance] as number) - 1) * PROD_CHAR_LEVEL_BONUS
  const starBonus = (char.starRank - 1) * PROD_STAR_BONUS_PER_RANK
  return mat.ratePerMin * (1 + toolBonus + starBonus + charLevelBonus + researchBonus)
}

/**
 * ダンジョン自動周回の実収集レート(個/分)。
 * DLボーナス(+1%/Lv, DL1=+0%) と 凸(★)ボーナスを反映。
 *
 * @param level 配置先のダンジョンレベル
 * @param starRank キャラの★ランク
 */
export function getDungeonRate(mat: MaterialDef, level: number, starRank: number): number {
  const dlBonus = (level - 1) * PROD_DL_BONUS_PER_LEVEL
  const starBonus = (starRank - 1) * PROD_STAR_BONUS_PER_RANK
  return mat.ratePerMin * (1 + dlBonus + starBonus)
}

/**
 * 自動製作レート(個/分)。基準1個/分に施設の研究ボーナスとキャラ工芸レベルを加算。
 * @param researchBonus 工芸ギルドの研究ボーナス(割合)
 */
export function getCraftRate(craftLevel: number, researchBonus: number): number {
  return 1 + researchBonus + (craftLevel - 1) * CRAFT_CHAR_LEVEL_BONUS
}

/**
 * 自動販売レート(個/分)。基準1個/分に施設の研究ボーナスとキャラ商人レベルを加算。
 * @param researchBonus 商人ギルドの研究ボーナス(割合)
 */
export function getMerchantRate(merchantLevel: number, researchBonus: number): number {
  return 1 + researchBonus + (merchantLevel - 1) * MERCHANT_CHAR_LEVEL_BONUS
}

/**
 * 自動処理（生産・工芸・販売・ダンジョン）の「次の1個まで」進捗(0-1)。
 * fracValue は前回ティック時点の端数、lastTick はその時刻。経過時間ぶんをレートで補間し、
 * 10秒ティックの間も滑らかに進む。
 */
export function getAutoProgress(
  fracValue: number,
  ratePerMin: number,
  lastTick: number,
  now: number,
): number {
  if (ratePerMin <= 0) return 0
  const dt = Math.max(0, (now - lastTick) / 60_000)
  return Math.min(1, fracValue + ratePerMin * dt)
}
