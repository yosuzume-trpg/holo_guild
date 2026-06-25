import { getEquipment } from '@/data/equipment'
import {
  COMBAT_STAR_BONUS_PER_RANK,
  EQUIP_WEAPON_ARMOR_STAR_BONUS,
  EQUIP_ACCESSORY_STAR_BONUS,
} from '@/data/constants'
import type { CharacterInstance, CharacterStats, EquipmentInstance } from '@/types/game'

export interface CalcedStats {
  base:  CharacterStats
  /** total - base（装備＋キャラ★の合算ボーナス） */
  bonus: CharacterStats
  /** キャラ★ランクぶんのボーナス（floor(base × ★倍率)） */
  starBonus: CharacterStats
  /** 装備ぶんのボーナス（bonus - starBonus。装備★ランクのスケーリングを含む） */
  equipBonus: CharacterStats
  total: CharacterStats
}

/**
 * キャラクターの基礎・ボーナス・合計ステータスを返す。
 * これは唯一のステータス計算ロジックであり、キャラ画面表示とダンジョン戦闘の
 * 両方がこの関数を参照する（表示と実戦の数値を一致させるため）。
 *
 * base  = 累積ステータス（各レベル上昇の合計。char.stats そのもの）
 * total = base に下記の倍率を乗じて切り捨てた値
 *   - キャラ★ボーナス: (★ランク-1) × COMBAT_STAR_BONUS_PER_RANK を全ステに加算
 *   - 装備3枠(武器/防具/アクセ)の %効果。★ランクで効果が増加する
 *       武器/防具: (基礎% + EQUIP_WEAPON_ARMOR_STAR_BONUS × (装備★-1)) / 100
 *       アクセ:    (基礎% + EQUIP_ACCESSORY_STAR_BONUS    × (装備★-1)) / 100
 *   倍率を加算してから最後に1回だけ floor する（戦闘ダメージ計算と完全一致させる）
 * bonus = total - base
 */
export function calcCharacterStats(
  char: CharacterInstance,
  invEquipment: EquipmentInstance[],
): CalcedStats {
  const base: CharacterStats = {
    hp:   char.stats.hp,
    atk:  char.stats.atk,
    def:  char.stats.def,
    mag:  char.stats.mag,
    mdef: char.stats.mdef,
    spd:  char.stats.spd,
  }

  const starBonus = (char.starRank - 1) * COMBAT_STAR_BONUS_PER_RANK
  let hpMult   = 1 + starBonus
  let atkMult  = 1 + starBonus
  let defMult  = 1 + starBonus
  let magMult  = 1 + starBonus
  let mdefMult = 1 + starBonus
  let spdMult  = 1 + starBonus

  for (const slot of ['weapon', 'armor', 'accessory'] as const) {
    const inst = invEquipment.find((e) => e.instanceId === char.equipment[slot])
    const master = inst ? getEquipment(inst.masterId) : null
    if (!master || !inst) continue
    const s = inst.starRank
    const scale = (basePct: number) => {
      if (basePct === 0) return 0
      return slot === 'accessory'
        ? (basePct + EQUIP_ACCESSORY_STAR_BONUS    * (s - 1)) / 100
        : (basePct + EQUIP_WEAPON_ARMOR_STAR_BONUS * (s - 1)) / 100
    }
    hpMult   += scale(master.effects.hpPercent   ?? 0)
    atkMult  += scale(master.effects.atkPercent  ?? 0)
    defMult  += scale(master.effects.defPercent  ?? 0)
    magMult  += scale(master.effects.magPercent  ?? 0)
    mdefMult += scale(master.effects.mdefPercent ?? 0)
    spdMult  += scale(master.effects.spdPercent  ?? 0)
  }

  const total: CharacterStats = {
    hp:   Math.floor(base.hp   * hpMult),
    atk:  Math.floor(base.atk  * atkMult),
    def:  Math.floor(base.def  * defMult),
    mag:  Math.floor(base.mag  * magMult),
    mdef: Math.floor(base.mdef * mdefMult),
    spd:  Math.floor(base.spd  * spdMult),
  }

  const bonus: CharacterStats = {
    hp:   total.hp   - base.hp,
    atk:  total.atk  - base.atk,
    def:  total.def  - base.def,
    mag:  total.mag  - base.mag,
    mdef: total.mdef - base.mdef,
    spd:  total.spd  - base.spd,
  }

  // キャラ★ぶんを単独で floor して切り出し、残りを装備ぶんとする
  // （starBonus + equipBonus = bonus、total = base + bonus を厳密に満たす）
  const starBonusStats: CharacterStats = {
    hp:   Math.floor(base.hp   * starBonus),
    atk:  Math.floor(base.atk  * starBonus),
    def:  Math.floor(base.def  * starBonus),
    mag:  Math.floor(base.mag  * starBonus),
    mdef: Math.floor(base.mdef * starBonus),
    spd:  Math.floor(base.spd  * starBonus),
  }

  const equipBonus: CharacterStats = {
    hp:   bonus.hp   - starBonusStats.hp,
    atk:  bonus.atk  - starBonusStats.atk,
    def:  bonus.def  - starBonusStats.def,
    mag:  bonus.mag  - starBonusStats.mag,
    mdef: bonus.mdef - starBonusStats.mdef,
    spd:  bonus.spd  - starBonusStats.spd,
  }

  return { base, bonus, starBonus: starBonusStats, equipBonus, total }
}

/**
 * 最大HP。HPに影響する全要素（基礎HP・戦闘Lv・キャラ★ランク・装備のHP%効果・
 * 装備★ランクによるスケーリング）を考慮した値を返す。
 * calcCharacterStats の total.hp と一致する（表示・回復・上限すべてで同じ値を使う）。
 */
export function calcMaxHp(char: CharacterInstance, invEquipment: EquipmentInstance[]): number {
  return calcCharacterStats(char, invEquipment).total.hp
}
