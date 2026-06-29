export type RegionId = 'region1' | 'region2' | 'region3' | 'region4' | 'region5' | 'region6'
export type Tendency = 'standard' | 'attack' | 'magic' | 'defense' | 'speed'
export type ProductionFacilityId = 'farm' | 'mining' | 'fishing' | 'alchemy'
export type GuildFacilityId = 'merchant' | 'craft'
export type Attribute = 'fire' | 'water' | 'wind' | 'earth' | null
/** ダンジョンの属性モード。火/風/地/水＝その属性、none＝無属性、all＝全属性混在 */
export type DungeonAttrMode = 'fire' | 'wind' | 'earth' | 'water' | 'none' | 'all'
export type EnemyType = 'standard' | 'attack' | 'magic' | 'defense' | 'elite' | 'boss'
export type EquipmentSlot = 'weapon' | 'armor' | 'accessory' | 'tool'

export interface CharacterStats {
  hp: number
  atk: number
  def: number
  mag: number
  mdef: number
  spd: number
}

export interface CharacterMaster {
  id: string
  name: string
  region: RegionId
  portrait: string
  cutin: string
  costumes: string[]
}

export type CharacterAssignment =
  | { type: ProductionFacilityId; materialId: string }
  | { type: 'merchant'; sellMaterialId: string; minStock: number }
  | { type: 'craft'; recipeId: string }
  | { type: 'dungeon'; level: number; materialId: string }

export interface CharacterInstance {
  id: string
  masterId: string
  starRank: number
  certificates: number
  stats: CharacterStats
  currentHp: number
  battleLevel: number
  battleExp: number
  farmLevel: number
  farmExp: number
  miningLevel: number
  miningExp: number
  fishingLevel: number
  fishingExp: number
  alchemyLevel: number
  alchemyExp: number
  craftLevel: number
  craftExp: number
  merchantLevel: number
  merchantExp: number
  affectionLevel: number
  affectionPoints: number
  equipment: Record<EquipmentSlot, string | null>
  assignment: CharacterAssignment | null
  tendency: Tendency
  socializedThisCycle: boolean
}

export interface EquipmentInstance {
  instanceId: string
  masterId: string
  starRank: number
}

export interface ProductionFacility {
  expansionLevel: number
  researchLevel: number
}

export interface GuildFacility {
  expansionLevel: number
  researchLevel: number
}

export interface Buff {
  type: 'atk' | 'def' | 'mag'
  percent: number
  turnsRemaining: number
}

export type StageType = 'battle' | 'chest' | 'recovery' | 'boss' | 'elite'

export interface EnemyInstance {
  id: string
  type: EnemyType
  hp: number
  maxHp: number
  stats: CharacterStats
  attribute: Attribute
}

export interface DungeonRun {
  dungeonLevel: number
  partyIds: string[]
  currentStage: number
  stageType: StageType
  enemies: EnemyInstance[]
  loot: {
    gold: number
    materials: Record<string, number>
    equipmentMasterIds: string[]
    exp: number
  }
  battlePhase: 'player-action' | 'enemy-action' | 'result' | null
  turnOrder: { id: string; isPlayer: boolean }[]
  currentTurnIndex: number
  buffs: Record<string, Buff[]>
  battleLog: string[]
}
