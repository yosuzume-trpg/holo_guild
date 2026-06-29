import type {
    CharacterInstance,
    EnemyInstance,
    EquipmentInstance,
    Buff,
    StageType,
    Attribute,
    DungeonAttrMode,
} from "@/types/game";
import { getEquipment } from "@/data/equipment";
import { calcCharacterStats } from "@/utils/characterStats";
import {
    ATTR_ADVANTAGE,
    DUNGEON_ATTR,
    DUNGEON_ATTR_CYCLE,
    ENEMY_OFF_ATTR_CHANCE,
    BOSS_SECOND_ACTION_SPD_FACTOR,
    BOSS_EXTRA_ENEMY_DL_THRESHOLD,
    BOSS_EXTRA_ENEMY_COUNT,
    ATTR_ADVANTAGE_MULT,
    ATTR_DISADVANTAGE_MULT,
    ENEMY_BASE_STATS,
    ENEMY_EXP_BASE,
    STAGE2_BATTLE_CHANCE,
    STAGE4_RECOVERY_THRESHOLD,
    STAGE4_CHEST_THRESHOLD,
    STAGE5_ELITE_CHANCE,
    ENEMY_TYPE_THRESHOLD_STANDARD,
    ENEMY_TYPE_THRESHOLD_ATTACK,
    ENEMY_TYPE_THRESHOLD_MAGIC,
    ENEMY_COUNT_DL_THRESHOLD,
    ENEMY_COUNT_LOW_MIN,
    ENEMY_COUNT_LOW_MAX,
    ENEMY_COUNT_HIGH_MIN,
    ENEMY_COUNT_HIGH_MAX,
} from "@/data/constants";

export type EnemyTypeKey = "standard" | "attack" | "magic" | "defense" | "elite" | "boss";

// ─── Enemy stat / exp scaling ──────────────────────────────────────────────
function scaleStats(base: (typeof ENEMY_BASE_STATS)[keyof typeof ENEMY_BASE_STATS]) {
    return (d: number): EnemyInstance["stats"] => ({
        hp: base.hp * d,
        atk: base.atk * d,
        def: base.def * d,
        mag: base.mag * d,
        mdef: base.mdef * d,
        spd: base.spd * d,
    });
}
export const ENEMY_STATS: Record<EnemyTypeKey, (d: number) => EnemyInstance["stats"]> = {
    standard: scaleStats(ENEMY_BASE_STATS.standard),
    attack: scaleStats(ENEMY_BASE_STATS.attack),
    magic: scaleStats(ENEMY_BASE_STATS.magic),
    defense: scaleStats(ENEMY_BASE_STATS.defense),
    elite: scaleStats(ENEMY_BASE_STATS.elite),
    boss: scaleStats(ENEMY_BASE_STATS.boss),
};
export const ENEMY_EXP: Record<EnemyTypeKey, (d: number) => number> = Object.fromEntries(
    Object.entries(ENEMY_EXP_BASE).map(([k, v]) => [k, (d: number) => v * d]),
) as Record<EnemyTypeKey, (d: number) => number>;

// ─── Pure battle helpers ───────────────────────────────────────────────────
export function calcDmg(atk: number, def: number) {
    return Math.max(1, Math.floor((atk * atk) / (atk + def)));
}

export function attrMult(atkAttr: Attribute, defAttr: Attribute): number {
    if (!atkAttr || !defAttr) return 1;
    if (ATTR_ADVANTAGE[atkAttr] === defAttr) return ATTR_ADVANTAGE_MULT;
    if (ATTR_ADVANTAGE[defAttr] === atkAttr) return ATTR_DISADVANTAGE_MULT;
    return 1;
}

/** 属性相性のログ表記。有利/不利/中立で文字列を返す。 */
export function multStr(mult: number): string {
    return mult > 1 ? "【有利！】" : mult < 1 ? "【不利】" : "";
}

/** ダンジョンの属性モード（火→風→地→水→無→全 を DL mod 6 でループ）。 */
export function dungeonAttrMode(dl: number): DungeonAttrMode {
    return DUNGEON_ATTR_CYCLE[(dl - 1) % DUNGEON_ATTR_CYCLE.length];
}

// 火/風/地/水/無 の全候補（通常敵・全ダンジョンの抽選用）
const ALL_ATTRS: Attribute[] = ["fire", "wind", "earth", "water", null];
function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 通常敵（随伴含む）の属性を決める。
 * - all: 火/風/地/水/無からランダム
 * - none: 基本は無属性、稀に元素へ逸脱
 * - 元素: 基本はその属性、稀に別属性（他元素・無）へ逸脱
 */
export function rollEnemyAttr(mode: DungeonAttrMode): Attribute {
    if (mode === "all") return pickRandom(ALL_ATTRS);
    const base: Attribute = mode === "none" ? null : mode;
    if (Math.random() < ENEMY_OFF_ATTR_CHANCE) {
        return pickRandom(ALL_ATTRS.filter((a) => a !== base));
    }
    return base;
}

/**
 * ボス・強敵の属性（逸脱なし、基準属性を確実に持つ）。
 * - all: 火/風/地/水からランダム（無にはならない）
 * - none: 無属性
 * - 元素: その属性
 */
export function bossAttr(mode: DungeonAttrMode): Attribute {
    if (mode === "all") return pickRandom(DUNGEON_ATTR);
    if (mode === "none") return null;
    return mode;
}

export function randomEnemyType(): EnemyTypeKey {
    const r = Math.random();
    if (r < ENEMY_TYPE_THRESHOLD_STANDARD) return "standard";
    if (r < ENEMY_TYPE_THRESHOLD_ATTACK) return "attack";
    if (r < ENEMY_TYPE_THRESHOLD_MAGIC) return "magic";
    return "defense";
}

export function makeEnemy(type: EnemyTypeKey, dl: number, attr: Attribute): EnemyInstance {
    const s = ENEMY_STATS[type](dl);
    return { id: crypto.randomUUID(), type, hp: s.hp, maxHp: s.hp, stats: s, attribute: attr };
}

export function makeEnemies(stageType: StageType, dl: number): EnemyInstance[] {
    const mode = dungeonAttrMode(dl);
    if (stageType === "boss") {
        const boss = makeEnemy("boss", dl, bossAttr(mode));
        if (dl < BOSS_EXTRA_ENEMY_DL_THRESHOLD) return [boss];
        // DL11以上は随伴の通常敵を追加（通常敵の生成ルールに従う）
        const adds = Array.from({ length: BOSS_EXTRA_ENEMY_COUNT }, () =>
            makeEnemy(randomEnemyType(), dl, rollEnemyAttr(mode)),
        );
        return [boss, ...adds];
    }
    if (stageType === "elite") return [makeEnemy("elite", dl, bossAttr(mode))];
    const count =
        dl <= ENEMY_COUNT_DL_THRESHOLD
            ? ENEMY_COUNT_LOW_MIN +
              Math.floor(Math.random() * (ENEMY_COUNT_LOW_MAX - ENEMY_COUNT_LOW_MIN + 1))
            : ENEMY_COUNT_HIGH_MIN +
              Math.floor(Math.random() * (ENEMY_COUNT_HIGH_MAX - ENEMY_COUNT_HIGH_MIN + 1));
    // 通常敵は基準属性を中心に、稀に別属性へ逸脱
    return Array.from({ length: count }, () =>
        makeEnemy(randomEnemyType(), dl, rollEnemyAttr(mode)),
    );
}

export function buildTurnOrder(
    partyIds: string[],
    chars: CharacterInstance[],
    enemies: EnemyInstance[],
    invEquipment: EquipmentInstance[],
) {
    const all: { id: string; spd: number; isPlayer: boolean }[] = [
        ...partyIds.map((id) => {
            const c = chars.find((x) => x.id === id)!;
            // 行動順は★・装備込みの総合素早さで判定（calcCharacterStats に一本化）
            return { id, spd: calcCharacterStats(c, invEquipment).total.spd, isPlayer: true };
        }),
        ...enemies.flatMap((e) => {
            const slots = [{ id: e.id, spd: e.stats.spd, isPlayer: false }];
            // ボスは2回行動: 本来の素早さ + 素早さ×0.9 の2スロット
            if (e.type === "boss") {
                slots.push({
                    id: e.id,
                    spd: e.stats.spd * BOSS_SECOND_ACTION_SPD_FACTOR,
                    isPlayer: false,
                });
            }
            return slots;
        }),
    ];
    all.sort((a, b) => b.spd - a.spd);
    return all.map(({ id, isPlayer }) => ({ id, isPlayer }));
}

export function buffedStat(base: number, buffs: Buff[], type: "atk" | "def" | "mag") {
    const bonus = buffs
        .filter((b) => b.type === type && b.turnsRemaining > 0)
        .reduce((s, b) => s + b.percent / 100, 0);
    return Math.floor(base * (1 + bonus));
}

/** weapon/armor スロットの装備属性を取得する。装備なしや属性なしは null。 */
export function charEquipAttr(
    char: CharacterInstance,
    slot: "weapon" | "armor",
    invEquipment: EquipmentInstance[],
): Attribute {
    const id = char.equipment[slot];
    if (!id) return null;
    const inst = invEquipment.find((e) => e.instanceId === id);
    if (!inst) return null;
    return getEquipment(inst.masterId)?.attribute ?? null;
}

export function generateStageTypes(dl: number): StageType[] {
    return [
        "battle",
        Math.random() < STAGE2_BATTLE_CHANCE ? "battle" : "chest",
        dl >= 41 ? "elite" : "battle",
        (() => {
            const r = Math.random();
            return r < STAGE4_RECOVERY_THRESHOLD
                ? "recovery"
                : r < STAGE4_CHEST_THRESHOLD
                  ? "chest"
                  : "battle";
        })(),
        Math.random() < STAGE5_ELITE_CHANCE ? "elite" : "battle",
        "boss",
    ];
}
