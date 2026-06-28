import type { ProductionFacilityId } from '@/types/game'
import {
  MATERIAL_PRICE_MULTIPLIER,
  MATERIAL_PRICE_REF_RATE,
  MATERIAL_PRICE_SCARCITY_EXP,
} from '@/data/constants'

export interface MaterialDef {
  id: string
  name: string
  /** 市場価格（売却用）。ratePerMin から希少度プライシングで導出し、×MULTIPLIER 適用後の実価格。 */
  price: number
  /**
   * 生産経験値の基準値（×MULTIPLIER 前）。育成ペースを全素材で一律に保つための値で、
   * 市場価格(price)とは独立。価格改定で低速素材の price が上がっても育成速度は変わらない。
   */
  expValue: number
  ratePerMin: number
  /** 'special' は生産施設・ダンジョンのどちらでも入手できない特殊素材（交遊報酬など） */
  facility: ProductionFacilityId | 'dungeon' | 'special'
  dungeonMinLevel?: number
  /** false なら商人ギルドで売却できない（既定は売却可） */
  sellable?: boolean
}

/**
 * 生産レートから素材の基準価格（×MULTIPLIER 前）を求める。
 * 基準価格 = round((REF_RATE / ratePerMin) ^ SCARCITY_EXP)。
 * 低レート（=配置枠を多く要する）素材ほど高くなる。
 */
export function computeBaseMaterialPrice(ratePerMin: number): number {
  return Math.round(
    Math.pow(MATERIAL_PRICE_REF_RATE / ratePerMin, MATERIAL_PRICE_SCARCITY_EXP),
  )
}

// price は ratePerMin から導出するため RAW では持たない。expValue は育成ペース用の基準値（旧基準価格）。
type RawMaterial = Omit<MaterialDef, 'price'>

const RAW_MATERIALS: RawMaterial[] = [
  { id: 'wheat',       name: '小麦',         expValue: 1,  ratePerMin: 2.5,  facility: 'farm' },
  { id: 'potato',      name: 'じゃがいも',   expValue: 2,  ratePerMin: 1.25, facility: 'farm' },
  { id: 'tomato',      name: 'トマト',       expValue: 3,  ratePerMin: 0.83, facility: 'farm' },
  { id: 'apple',       name: 'りんご',       expValue: 5,  ratePerMin: 0.5,  facility: 'farm' },
  { id: 'herb',        name: 'ハーブ',       expValue: 10, ratePerMin: 0.25, facility: 'farm' },

  { id: 'coal',        name: '石炭',         expValue: 2,  ratePerMin: 1.25, facility: 'mining' },
  { id: 'iron',        name: '鉄鉱石',       expValue: 5,  ratePerMin: 0.5,  facility: 'mining' },
  { id: 'copper',      name: '銅鉱石',       expValue: 6,  ratePerMin: 0.42, facility: 'mining' },
  { id: 'silver',      name: '銀鉱石',       expValue: 10, ratePerMin: 0.25, facility: 'mining' },
  { id: 'crystal',     name: '水晶',         expValue: 25, ratePerMin: 0.1,  facility: 'mining' },

  { id: 'seaweed',     name: '海藻',         expValue: 1,  ratePerMin: 2.5,  facility: 'fishing' },
  { id: 'smallfish',   name: '小魚',         expValue: 3,  ratePerMin: 0.83, facility: 'fishing' },
  { id: 'mackerel',    name: 'サバ',         expValue: 5,  ratePerMin: 0.5,  facility: 'fishing' },
  { id: 'shrimp',      name: 'エビ',         expValue: 10, ratePerMin: 0.25, facility: 'fishing' },
  { id: 'tuna',        name: 'マグロ',       expValue: 25, ratePerMin: 0.1,  facility: 'fishing' },

  { id: 'goldenwater', name: '黄金水',       expValue: 2,  ratePerMin: 1.25, facility: 'alchemy' },
  { id: 'rainyjuice',  name: 'ラニージュース', expValue: 5, ratePerMin: 0.5,  facility: 'alchemy' },
  { id: 'tbubble',     name: 'Tバブル',      expValue: 5,  ratePerMin: 0.5,  facility: 'alchemy' },
  { id: 'magicmilk',   name: 'マジックミルク', expValue: 10, ratePerMin: 0.25, facility: 'alchemy' },
  { id: 'saltwater',   name: '生成塩水',     expValue: 25, ratePerMin: 0.1,  facility: 'alchemy' },

  { id: 'magicstone',    name: '魔石',     expValue: 5,  ratePerMin: 0.5,  facility: 'dungeon', dungeonMinLevel: 1 },
  { id: 'monstertooth',  name: '魔物の牙', expValue: 10, ratePerMin: 0.5,  facility: 'dungeon', dungeonMinLevel: 1 },
  { id: 'monsterhide',   name: '魔物の皮', expValue: 10, ratePerMin: 0.5,  facility: 'dungeon', dungeonMinLevel: 1 },
  { id: 'magiccrystal',  name: '魔力結晶', expValue: 25, ratePerMin: 0.1,  facility: 'dungeon', dungeonMinLevel: 1 },
  { id: 'ancientgear',   name: '古代歯車', expValue: 25, ratePerMin: 0.1,  facility: 'dungeon', dungeonMinLevel: 1 },
]

// 生産施設でもダンジョンでも入手できない特殊素材（交遊で入手・売却不可）。
// 価格導出（computeBaseMaterialPrice）は ratePerMin を使うため、ここでは別途定義して append する。
const SPECIAL_MATERIALS: MaterialDef[] = [
  { id: 'magiccore', name: '魔力の源', price: 0, expValue: 0, ratePerMin: 0, facility: 'special', sellable: false },
]

// 市場価格を希少度プライシングで導出し、経済倍率を適用（ratePerMin・expValue は不変）
export const MATERIALS: MaterialDef[] = [
  ...RAW_MATERIALS.map((m) => ({
    ...m,
    price: computeBaseMaterialPrice(m.ratePerMin) * MATERIAL_PRICE_MULTIPLIER,
  })),
  ...SPECIAL_MATERIALS,
]

export const MATERIALS_BY_FACILITY = {
  farm:    MATERIALS.filter((m) => m.facility === 'farm'),
  mining:  MATERIALS.filter((m) => m.facility === 'mining'),
  fishing: MATERIALS.filter((m) => m.facility === 'fishing'),
  alchemy: MATERIALS.filter((m) => m.facility === 'alchemy'),
}

export function getMaterial(id: string): MaterialDef | undefined {
  return MATERIALS.find((m) => m.id === id)
}

export function getDungeonMaterials(maxClearedLevel: number): MaterialDef[] {
  return MATERIALS.filter(
    (m) => m.facility === 'dungeon' && (m.dungeonMinLevel ?? 1) <= maxClearedLevel
  )
}
