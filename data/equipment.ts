import type { Attribute, EquipmentSlot } from '@/types/game'

export interface EquipmentEffects {
  atkPercent?: number
  defPercent?: number
  magPercent?: number
  mdefPercent?: number
  hpPercent?: number
  spdPercent?: number
  farmPercent?: number
  miningPercent?: number
  fishingPercent?: number
  alchemyPercent?: number
}

export interface EquipmentMaster {
  id: string
  name: string
  slot: EquipmentSlot
  attribute: Attribute
  effects: EquipmentEffects
  baseEffectLabel: string
}

export const EQUIPMENT_MASTERS: EquipmentMaster[] = [
  // 武器 - 剣
  { id: 'weapon_iron_sword',  name: '鉄の剣', slot: 'weapon', attribute: null,    effects: { atkPercent: 50 }, baseEffectLabel: '攻撃力+50%' },
  { id: 'weapon_fire_sword',  name: '炎の剣', slot: 'weapon', attribute: 'fire',  effects: { atkPercent: 50 }, baseEffectLabel: '攻撃力+50%' },
  { id: 'weapon_wind_sword',  name: '風の剣', slot: 'weapon', attribute: 'wind',  effects: { atkPercent: 50 }, baseEffectLabel: '攻撃力+50%' },
  { id: 'weapon_earth_sword', name: '地の剣', slot: 'weapon', attribute: 'earth', effects: { atkPercent: 50 }, baseEffectLabel: '攻撃力+50%' },
  { id: 'weapon_water_sword', name: '水の剣', slot: 'weapon', attribute: 'water', effects: { atkPercent: 50 }, baseEffectLabel: '攻撃力+50%' },
  // 武器 - 杖
  { id: 'weapon_wood_staff',  name: '木の杖', slot: 'weapon', attribute: null,    effects: { magPercent: 50 }, baseEffectLabel: '魔力+50%' },
  { id: 'weapon_fire_staff',  name: '炎の杖', slot: 'weapon', attribute: 'fire',  effects: { magPercent: 50 }, baseEffectLabel: '魔力+50%' },
  { id: 'weapon_wind_staff',  name: '風の杖', slot: 'weapon', attribute: 'wind',  effects: { magPercent: 50 }, baseEffectLabel: '魔力+50%' },
  { id: 'weapon_earth_staff', name: '地の杖', slot: 'weapon', attribute: 'earth', effects: { magPercent: 50 }, baseEffectLabel: '魔力+50%' },
  { id: 'weapon_water_staff', name: '水の杖', slot: 'weapon', attribute: 'water', effects: { magPercent: 50 }, baseEffectLabel: '魔力+50%' },

  // 防具 - 鎧
  { id: 'armor_adventurer',   name: '冒険者の服', slot: 'armor', attribute: null,    effects: { defPercent: 50, mdefPercent: 25 }, baseEffectLabel: '防御+50% 魔防+25%' },
  { id: 'armor_fire',         name: '炎の鎧',     slot: 'armor', attribute: 'fire',  effects: { defPercent: 50, mdefPercent: 25 }, baseEffectLabel: '防御+50% 魔防+25%' },
  { id: 'armor_wind',         name: '風の鎧',     slot: 'armor', attribute: 'wind',  effects: { defPercent: 50, mdefPercent: 25 }, baseEffectLabel: '防御+50% 魔防+25%' },
  { id: 'armor_earth',        name: '地の鎧',     slot: 'armor', attribute: 'earth', effects: { defPercent: 50, mdefPercent: 25 }, baseEffectLabel: '防御+50% 魔防+25%' },
  { id: 'armor_water',        name: '水の鎧',     slot: 'armor', attribute: 'water', effects: { defPercent: 50, mdefPercent: 25 }, baseEffectLabel: '防御+50% 魔防+25%' },
  // 防具 - ローブ
  { id: 'armor_mage_robe',    name: '魔法使いの服', slot: 'armor', attribute: null,    effects: { defPercent: 25, mdefPercent: 50 }, baseEffectLabel: '防御+25% 魔防+50%' },
  { id: 'armor_fire_robe',    name: '炎のローブ',   slot: 'armor', attribute: 'fire',  effects: { defPercent: 25, mdefPercent: 50 }, baseEffectLabel: '防御+25% 魔防+50%' },
  { id: 'armor_wind_robe',    name: '風のローブ',   slot: 'armor', attribute: 'wind',  effects: { defPercent: 25, mdefPercent: 50 }, baseEffectLabel: '防御+25% 魔防+50%' },
  { id: 'armor_earth_robe',   name: '地のローブ',   slot: 'armor', attribute: 'earth', effects: { defPercent: 25, mdefPercent: 50 }, baseEffectLabel: '防御+25% 魔防+50%' },
  { id: 'armor_water_robe',   name: '水のローブ',   slot: 'armor', attribute: 'water', effects: { defPercent: 25, mdefPercent: 50 }, baseEffectLabel: '防御+25% 魔防+50%' },

  // アクセサリー
  { id: 'acc_speed',    name: '素早さの腕輪',   slot: 'accessory', attribute: null, effects: { spdPercent: 5 },  baseEffectLabel: '素早さ+5%' },
  { id: 'acc_hp',       name: '体力の腕輪',     slot: 'accessory', attribute: null, effects: { hpPercent: 10 },  baseEffectLabel: 'HP+10%' },
  { id: 'acc_atk',      name: '攻撃の腕輪',     slot: 'accessory', attribute: null, effects: { atkPercent: 10 }, baseEffectLabel: '攻撃力+10%' },
  { id: 'acc_mag',      name: '魔法の腕輪',     slot: 'accessory', attribute: null, effects: { magPercent: 10 }, baseEffectLabel: '魔力+10%' },
  { id: 'acc_def',      name: '防御の腕輪',     slot: 'accessory', attribute: null, effects: { defPercent: 10 }, baseEffectLabel: '防御+10%' },
  { id: 'acc_mdef',     name: '魔法防御の腕輪', slot: 'accessory', attribute: null, effects: { mdefPercent: 10 }, baseEffectLabel: '魔防+10%' },

  // 道具
  { id: 'tool_hoe',     name: 'クワ',     slot: 'tool', attribute: null, effects: { farmPercent: 1 },    baseEffectLabel: '農業生産量+1%' },
  { id: 'tool_pickaxe', name: 'ピッケル', slot: 'tool', attribute: null, effects: { miningPercent: 1 },  baseEffectLabel: '鉱業生産量+1%' },
  { id: 'tool_rod',     name: 'つりざお', slot: 'tool', attribute: null, effects: { fishingPercent: 1 }, baseEffectLabel: '漁業生産量+1%' },
  { id: 'tool_staff',   name: '錬金用杖', slot: 'tool', attribute: null, effects: { alchemyPercent: 1 }, baseEffectLabel: '錬金生産量+1%' },
]

export const WEAPON_POOL   = EQUIPMENT_MASTERS.filter((e) => e.slot === 'weapon')
export const ARMOR_POOL    = EQUIPMENT_MASTERS.filter((e) => e.slot === 'armor')
export const ACC_TOOL_POOL = EQUIPMENT_MASTERS.filter((e) => e.slot === 'accessory' || e.slot === 'tool')

export function getEquipment(id: string): EquipmentMaster | undefined {
  return EQUIPMENT_MASTERS.find((e) => e.id === id)
}

/** Returns combined stat multipliers for equipped items (starRank considered) */
export function calcEquipEffects(
  equippedIds: Array<{ masterId: string; starRank: number } | null>
): EquipmentEffects {
  const result: EquipmentEffects = {}
  for (const item of equippedIds) {
    if (!item) continue
    const master = getEquipment(item.masterId)
    if (!master) continue
    const rankBonus = (item.starRank - 1) * 0.25
    for (const [key, base] of Object.entries(master.effects) as [keyof EquipmentEffects, number][]) {
      result[key] = (result[key] ?? 0) + base + (base > 1 ? base * rankBonus : 0)
    }
  }
  return result
}
