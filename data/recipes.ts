import { MATERIAL_PRICE_MULTIPLIER } from '@/data/constants'

export interface RecipeDef {
  id: string
  name: string
  category: 'food' | 'processed' | 'drink' | 'medicine' | 'craft'
  ingredients: { materialId: string; qty: number }[]
  baseCost: number
  sellPrice: number
}

// baseCost は基準原価。実際の原価/売値は MATERIAL_PRICE_MULTIPLIER を適用（下部 RECIPES）。
const RAW_RECIPES: RecipeDef[] = [
  // 食品
  { id: 'bread',        name: 'パン',         category: 'food',      ingredients: [{ materialId: 'wheat', qty: 2 }],                                               baseCost: 2,  sellPrice: Math.ceil(2  * 1.2) },
  { id: 'potato_salad', name: 'ポテトサラダ', category: 'food',      ingredients: [{ materialId: 'potato', qty: 1 }, { materialId: 'tomato', qty: 1 }],              baseCost: 5,  sellPrice: Math.ceil(5  * 1.2) },
  { id: 'fish_sand',    name: '魚サンド',     category: 'food',      ingredients: [{ materialId: 'wheat', qty: 1 }, { materialId: 'smallfish', qty: 1 }],            baseCost: 4,  sellPrice: Math.ceil(4  * 1.2) },
  { id: 'shrimp_sand',  name: 'エビサンド',   category: 'food',      ingredients: [{ materialId: 'wheat', qty: 1 }, { materialId: 'shrimp', qty: 1 }],               baseCost: 11, sellPrice: Math.ceil(11 * 1.2) },
  { id: 'seafood',      name: '海鮮プレート', category: 'food',      ingredients: [{ materialId: 'mackerel', qty: 1 }, { materialId: 'shrimp', qty: 1 }, { materialId: 'seaweed', qty: 1 }], baseCost: 16, sellPrice: Math.ceil(16 * 1.2) },
  // 加工食品
  { id: 'mackerel_can', name: 'サバ缶',       category: 'processed', ingredients: [{ materialId: 'mackerel', qty: 1 }, { materialId: 'iron', qty: 1 }],              baseCost: 10, sellPrice: Math.ceil(10 * 1.2) },
  { id: 'tuna_can',     name: 'ツナ缶',       category: 'processed', ingredients: [{ materialId: 'tuna', qty: 1 }, { materialId: 'iron', qty: 1 }],                  baseCost: 30, sellPrice: Math.ceil(30 * 1.2) },
  { id: 'preserved',    name: '保存食セット', category: 'processed', ingredients: [{ materialId: 'smallfish', qty: 1 }, { materialId: 'seaweed', qty: 1 }, { materialId: 'coal', qty: 1 }], baseCost: 6, sellPrice: Math.ceil(6 * 1.2) },
  { id: 'veg_soup',     name: '野菜スープ',   category: 'processed', ingredients: [{ materialId: 'potato', qty: 1 }, { materialId: 'tomato', qty: 1 }, { materialId: 'herb', qty: 1 }], baseCost: 15, sellPrice: Math.ceil(15 * 1.2) },
  { id: 'premium_food', name: '高級保存食',   category: 'processed', ingredients: [{ materialId: 'tuna', qty: 1 }, { materialId: 'seaweed', qty: 1 }, { materialId: 'coal', qty: 1 }], baseCost: 28, sellPrice: Math.ceil(28 * 1.2) },
  // 飲料
  { id: 'apple_juice',  name: 'りんごジュース', category: 'drink',   ingredients: [{ materialId: 'apple', qty: 1 }],                                                baseCost: 5,  sellPrice: Math.ceil(5  * 1.2) },
  { id: 'rainy_drink',  name: 'ラニードリンク', category: 'drink',   ingredients: [{ materialId: 'apple', qty: 1 }, { materialId: 'rainyjuice', qty: 1 }],           baseCost: 10, sellPrice: Math.ceil(10 * 1.2) },
  { id: 't_soda',       name: 'Tソーダ',      category: 'drink',    ingredients: [{ materialId: 'apple', qty: 1 }, { materialId: 'tbubble', qty: 1 }],              baseCost: 10, sellPrice: Math.ceil(10 * 1.2) },
  { id: 'magic_latte',  name: 'マジックラテ', category: 'drink',    ingredients: [{ materialId: 'apple', qty: 1 }, { materialId: 'magicmilk', qty: 1 }],            baseCost: 15, sellPrice: Math.ceil(15 * 1.2) },
  { id: 'gold_drink',   name: '黄金ドリンク', category: 'drink',    ingredients: [{ materialId: 'apple', qty: 1 }, { materialId: 'goldenwater', qty: 1 }],          baseCost: 7,  sellPrice: Math.ceil(7  * 1.2) },
  // 薬品
  { id: 'potion',       name: '回復ポーション', category: 'medicine', ingredients: [{ materialId: 'herb', qty: 1 }, { materialId: 'goldenwater', qty: 1 }],         baseCost: 12, sellPrice: Math.ceil(12 * 1.2) },
  { id: 'stimulant',    name: '強壮剤',       category: 'medicine',  ingredients: [{ materialId: 'herb', qty: 1 }, { materialId: 'rainyjuice', qty: 1 }],           baseCost: 15, sellPrice: Math.ceil(15 * 1.2) },
  { id: 'bubble_med',   name: '泡薬',         category: 'medicine',  ingredients: [{ materialId: 'goldenwater', qty: 1 }, { materialId: 'tbubble', qty: 1 }],       baseCost: 7,  sellPrice: Math.ceil(7  * 1.2) },
  { id: 'magic_med',    name: '魔力薬',       category: 'medicine',  ingredients: [{ materialId: 'herb', qty: 1 }, { materialId: 'magicmilk', qty: 1 }],            baseCost: 20, sellPrice: Math.ceil(20 * 1.2) },
  { id: 'panacea',      name: '万能薬',       category: 'medicine',  ingredients: [{ materialId: 'herb', qty: 1 }, { materialId: 'saltwater', qty: 1 }],            baseCost: 35, sellPrice: Math.ceil(35 * 1.2) },
  // 工芸品
  { id: 'copper_work',  name: '銅細工',       category: 'craft',     ingredients: [{ materialId: 'copper', qty: 1 }],                                               baseCost: 6,  sellPrice: Math.ceil(6  * 1.2) },
  { id: 'silver_work',  name: '銀細工',       category: 'craft',     ingredients: [{ materialId: 'silver', qty: 1 }],                                               baseCost: 10, sellPrice: Math.ceil(10 * 1.2) },
  { id: 'iron_work',    name: '鉄細工',       category: 'craft',     ingredients: [{ materialId: 'iron', qty: 1 }, { materialId: 'coal', qty: 1 }],                 baseCost: 7,  sellPrice: Math.ceil(7  * 1.2) },
  { id: 'crystal_acc',  name: '水晶アクセサリー', category: 'craft', ingredients: [{ materialId: 'crystal', qty: 1 }, { materialId: 'silver', qty: 1 }],            baseCost: 35, sellPrice: Math.ceil(35 * 1.2) },
  { id: 'gem_work',     name: '宝石細工',     category: 'craft',     ingredients: [{ materialId: 'crystal', qty: 1 }, { materialId: 'copper', qty: 1 }],            baseCost: 31, sellPrice: Math.ceil(31 * 1.2) },
  { id: 'magic_stone',  name: '魔石細工',     category: 'craft',     ingredients: [{ materialId: 'magicstone', qty: 2 }],                                           baseCost: 10, sellPrice: Math.ceil(10 * 1.2) },
  { id: 'fang_deco',    name: '牙の装飾品',   category: 'craft',     ingredients: [{ materialId: 'monstertooth', qty: 2 }],                                         baseCost: 20, sellPrice: Math.ceil(20 * 1.2) },
  { id: 'leather_work', name: '革細工',       category: 'craft',     ingredients: [{ materialId: 'monsterhide', qty: 2 }],                                          baseCost: 20, sellPrice: Math.ceil(20 * 1.2) },
  { id: 'magic_orb',    name: '魔力の宝珠',   category: 'craft',     ingredients: [{ materialId: 'magiccrystal', qty: 2 }],                                         baseCost: 50, sellPrice: Math.ceil(50 * 1.2) },
  { id: 'gear_work',    name: '歯車仕掛け',   category: 'craft',     ingredients: [{ materialId: 'ancientgear', qty: 2 }],                                          baseCost: 50, sellPrice: Math.ceil(50 * 1.2) },
]

// 経済倍率を原価・売値に適用（売値 = ceil(原価 × 倍率 × 1.2)）
export const RECIPES: RecipeDef[] = RAW_RECIPES.map((r) => ({
  ...r,
  baseCost:  r.baseCost * MATERIAL_PRICE_MULTIPLIER,
  sellPrice: Math.ceil(r.baseCost * MATERIAL_PRICE_MULTIPLIER * 1.2),
}))

export const CATEGORY_LABEL: Record<RecipeDef['category'], string> = {
  food:      '食品',
  processed: '加工食品',
  drink:     '飲料',
  medicine:  '薬品',
  craft:     '工芸品',
}

export function getRecipe(id: string): RecipeDef | undefined {
  return RECIPES.find((r) => r.id === id)
}

// Medicine items usable in dungeon
export const DUNGEON_ITEMS = ['potion', 'stimulant', 'bubble_med', 'magic_med', 'panacea']
