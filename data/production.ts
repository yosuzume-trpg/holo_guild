import type { CharacterInstance, EquipmentInstance, ProductionFacilityId } from '@/types/game'
import type { MaterialDef } from '@/data/materials'
import { getEquipment } from '@/data/equipment'
import { PROD_STAR_BONUS_PER_RANK, PROD_CHAR_LEVEL_BONUS, PROD_DL_BONUS_PER_LEVEL } from '@/data/constants'

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
