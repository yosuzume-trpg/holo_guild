import type { ProductionFacilityId } from '@/types/game'

export interface MaterialDef {
  id: string
  name: string
  price: number
  ratePerMin: number
  facility: ProductionFacilityId | 'dungeon'
  dungeonMinLevel?: number
}

export const MATERIALS: MaterialDef[] = [
  { id: 'wheat',       name: '小麦',         price: 1,  ratePerMin: 2.5,  facility: 'farm' },
  { id: 'potato',      name: 'じゃがいも',   price: 2,  ratePerMin: 1.25, facility: 'farm' },
  { id: 'tomato',      name: 'トマト',       price: 3,  ratePerMin: 0.83, facility: 'farm' },
  { id: 'apple',       name: 'りんご',       price: 5,  ratePerMin: 0.5,  facility: 'farm' },
  { id: 'herb',        name: 'ハーブ',       price: 10, ratePerMin: 0.25, facility: 'farm' },

  { id: 'coal',        name: '石炭',         price: 2,  ratePerMin: 1.25, facility: 'mining' },
  { id: 'iron',        name: '鉄鉱石',       price: 5,  ratePerMin: 0.5,  facility: 'mining' },
  { id: 'copper',      name: '銅鉱石',       price: 6,  ratePerMin: 0.42, facility: 'mining' },
  { id: 'silver',      name: '銀鉱石',       price: 10, ratePerMin: 0.25, facility: 'mining' },
  { id: 'crystal',     name: '水晶',         price: 25, ratePerMin: 0.1,  facility: 'mining' },

  { id: 'seaweed',     name: '海藻',         price: 1,  ratePerMin: 2.5,  facility: 'fishing' },
  { id: 'smallfish',   name: '小魚',         price: 3,  ratePerMin: 0.83, facility: 'fishing' },
  { id: 'mackerel',    name: 'サバ',         price: 5,  ratePerMin: 0.5,  facility: 'fishing' },
  { id: 'shrimp',      name: 'エビ',         price: 10, ratePerMin: 0.25, facility: 'fishing' },
  { id: 'tuna',        name: 'マグロ',       price: 25, ratePerMin: 0.1,  facility: 'fishing' },

  { id: 'goldenwater', name: '黄金水',       price: 2,  ratePerMin: 1.25, facility: 'alchemy' },
  { id: 'rainyjuice',  name: 'ラニージュース', price: 5, ratePerMin: 0.5,  facility: 'alchemy' },
  { id: 'tbubble',     name: 'Tバブル',      price: 5,  ratePerMin: 0.5,  facility: 'alchemy' },
  { id: 'magicmilk',   name: 'マジックミルク', price: 10, ratePerMin: 0.25, facility: 'alchemy' },
  { id: 'saltwater',   name: '生成塩水',     price: 25, ratePerMin: 0.1,  facility: 'alchemy' },

  { id: 'magicstone',    name: '魔石',     price: 5,  ratePerMin: 0.5,  facility: 'dungeon', dungeonMinLevel: 1 },
  { id: 'monstertooth',  name: '魔物の牙', price: 10, ratePerMin: 0.25, facility: 'dungeon', dungeonMinLevel: 1 },
  { id: 'monsterhide',   name: '魔物の皮', price: 10, ratePerMin: 0.25, facility: 'dungeon', dungeonMinLevel: 1 },
  { id: 'magiccrystal',  name: '魔力結晶', price: 25, ratePerMin: 0.1,  facility: 'dungeon', dungeonMinLevel: 11 },
  { id: 'ancientgear',   name: '古代歯車', price: 25, ratePerMin: 0.1,  facility: 'dungeon', dungeonMinLevel: 11 },
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
