import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
    CharacterAssignment,
    CharacterInstance,
    CharacterStats,
    EquipmentSlot,
    Tendency,
} from "@/types/game";
import { useGameStore } from "./gameStore";
import { useInventoryStore } from "./inventoryStore";
import { calcMaxHp } from "@/utils/characterStats";
import {
    CHAR_BASE_STATS,
    CHAR_LEVEL_VARIANCE,
    CHAR_TENDENCY_BONUS,
    EXP_PER_LEVEL,
    AFFECTION_GAIN_MIN,
    AFFECTION_GAIN_RANGE,
    AFFECTION_POINTS_PER_LEVEL,
    GR_BATTLE_LEVEL_CAP,
    GR_FACILITY_LEVEL_CAP,
} from "@/data/constants";

const TENDENCIES: Tendency[] = ["standard", "attack", "magic", "defense", "speed"];

/**
 * 1レベル分のステータス上昇量を返す。
 * 上昇量 = 中央値 ± 対称ブレ + 得意ステの上方ボーナス(0〜max)。
 * レベルアップのたびにこれを加算して累積する（毎レベル独立に抽選）。
 */
function rollLevelGain(tendency: Tendency): CharacterStats {
    const bonus = CHAR_TENDENCY_BONUS[tendency];
    const gain = (key: keyof CharacterStats) =>
        CHAR_BASE_STATS[key] +
        Math.floor((Math.random() * 2 - 1) * CHAR_LEVEL_VARIANCE[key]) +
        Math.floor(Math.random() * ((bonus[key] ?? 0) + 1));
    return {
        hp: gain("hp"),
        atk: gain("atk"),
        def: gain("def"),
        mag: gain("mag"),
        mdef: gain("mdef"),
        spd: gain("spd"),
    };
}


interface CharacterState {
    characters: CharacterInstance[];

    addCharacter: (masterId: string) => string;
    addCertificate: (masterId: string, count?: number) => void;
    setAssignment: (id: string, assignment: CharacterAssignment | null) => void;
    equip: (id: string, slot: EquipmentSlot, equipInstanceId: string | null) => void;
    socialize: (id: string) => void;
    resetSocialFlag: () => void;
    gainBattleExp: (id: string, exp: number) => void;
    gainProductionExp: (
        id: string,
        facility: "farm" | "mining" | "fishing" | "alchemy",
        exp: number,
    ) => void;
    gainCraftExp: (id: string, exp: number) => void;
    gainMerchantExp: (id: string, exp: number) => void;
    updateCurrentHp: (id: string, hp: number) => void;
    upgradeStarRank: (id: string) => void;
}

function updateChar(
    chars: CharacterInstance[],
    id: string,
    update: Partial<CharacterInstance>,
): CharacterInstance[] {
    return chars.map((c) => (c.id === id ? { ...c, ...update } : c));
}

function expToLevel(exp: number): number {
    let level = 1;
    while (exp >= EXP_PER_LEVEL * level) {
        exp -= EXP_PER_LEVEL * level;
        level++;
    }
    return level;
}

export const useCharacterStore = create<CharacterState>()(
    persist(
        (set, get) => ({
            characters: [],

            addCharacter: (masterId) => {
                const id = crypto.randomUUID();
                const tendency = TENDENCIES[Math.floor(Math.random() * TENDENCIES.length)];
                const stats = rollLevelGain(tendency);
                const instance: CharacterInstance = {
                    id,
                    masterId,
                    starRank: 1,
                    certificates: 0,
                    stats,
                    currentHp: stats.hp,
                    battleLevel: 1,
                    battleExp: 0,
                    farmLevel: 1,
                    farmExp: 0,
                    miningLevel: 1,
                    miningExp: 0,
                    fishingLevel: 1,
                    fishingExp: 0,
                    alchemyLevel: 1,
                    alchemyExp: 0,
                    craftLevel: 1,
                    craftExp: 0,
                    merchantLevel: 1,
                    merchantExp: 0,
                    affectionLevel: 1,
                    affectionPoints: 0,
                    equipment: { weapon: null, armor: null, accessory: null, tool: null },
                    assignment: null,
                    tendency,
                    socializedThisCycle: false,
                };
                set((s) => ({ characters: [...s.characters, instance] }));
                return id;
            },

            addCertificate: (masterId, count = 1) =>
                set((s) => ({
                    characters: s.characters.map((c) =>
                        c.masterId === masterId
                            ? { ...c, certificates: c.certificates + count }
                            : c,
                    ),
                })),

            setAssignment: (id, assignment) =>
                set((s) => ({ characters: updateChar(s.characters, id, { assignment }) })),

            equip: (id, slot, equipInstanceId) =>
                set((s) => ({
                    characters: updateChar(s.characters, id, {
                        equipment: {
                            ...s.characters.find((c) => c.id === id)!.equipment,
                            [slot]: equipInstanceId,
                        },
                    }),
                })),

            socialize: (id) => {
                const char = get().characters.find((c) => c.id === id);
                if (!char || char.socializedThisCycle) return;
                // 交遊はギルド全体で1サイクル1回まで
                if (useGameStore.getState().socializedThisCycle) return;
                const gain = AFFECTION_GAIN_MIN + Math.floor(Math.random() * AFFECTION_GAIN_RANGE);
                const newPoints = char.affectionPoints + gain;
                const pointsNeeded = char.affectionLevel * AFFECTION_POINTS_PER_LEVEL;
                const leveled = newPoints >= pointsNeeded;
                set((s) => ({
                    characters: updateChar(s.characters, id, {
                        socializedThisCycle: true,
                        affectionPoints: leveled ? newPoints - pointsNeeded : newPoints,
                        affectionLevel: leveled ? char.affectionLevel + 1 : char.affectionLevel,
                    }),
                }));
                useGameStore.getState().markSocialized();
            },

            resetSocialFlag: () =>
                set((s) => ({
                    characters: s.characters.map((c) => ({ ...c, socializedThisCycle: false })),
                })),

            gainBattleExp: (id, exp) =>
                set((s) => {
                    const char = s.characters.find((c) => c.id === id);
                    if (!char) return s;
                    const maxLevel = useGameStore.getState().guildRank * GR_BATTLE_LEVEL_CAP;
                    if (char.battleLevel >= maxLevel) return s;
                    const newExp = char.battleExp + exp;
                    const newLevel = Math.min(expToLevel(newExp), maxLevel);
                    const update: Partial<CharacterInstance> = {
                        battleExp: newExp,
                        battleLevel: newLevel,
                    };
                    if (newLevel > char.battleLevel) {
                        // 上がったレベルぶんだけ毎レベル独立に上昇量を抽選して累積
                        let stats = char.stats;
                        for (let lv = char.battleLevel; lv < newLevel; lv++) {
                            const g = rollLevelGain(char.tendency);
                            stats = {
                                hp: stats.hp + g.hp,
                                atk: stats.atk + g.atk,
                                def: stats.def + g.def,
                                mag: stats.mag + g.mag,
                                mdef: stats.mdef + g.mdef,
                                spd: stats.spd + g.spd,
                            };
                        }
                        update.stats = stats;
                        // レベルアップで全回復。HP上限は新ステータス・装備等を含めた最大HPに合わせる
                        update.currentHp = calcMaxHp(
                            { ...char, stats, battleLevel: newLevel },
                            useInventoryStore.getState().equipment,
                        );
                    }
                    return { characters: updateChar(s.characters, id, update) };
                }),

            gainProductionExp: (id, facility, exp) => {
                const levelKey = `${facility}Level` as keyof CharacterInstance;
                const expKey = `${facility}Exp` as keyof CharacterInstance;
                set((s) => {
                    const char = s.characters.find((c) => c.id === id);
                    if (!char) return s;
                    const maxLevel = useGameStore.getState().guildRank * GR_FACILITY_LEVEL_CAP;
                    if ((char[levelKey] as number) >= maxLevel) return s;
                    const newExp = (char[expKey] as number) + exp;
                    const newLevel = Math.min(expToLevel(newExp), maxLevel);
                    return {
                        characters: updateChar(s.characters, id, {
                            [expKey]: newExp,
                            [levelKey]: newLevel,
                        }),
                    };
                });
            },

            gainCraftExp: (id, exp) =>
                set((s) => {
                    const char = s.characters.find((c) => c.id === id);
                    if (!char) return s;
                    const newExp = char.craftExp + exp;
                    return {
                        characters: updateChar(s.characters, id, {
                            craftExp: newExp,
                            craftLevel: expToLevel(newExp),
                        }),
                    };
                }),

            gainMerchantExp: (id, exp) =>
                set((s) => {
                    const char = s.characters.find((c) => c.id === id);
                    if (!char) return s;
                    const newExp = char.merchantExp + exp;
                    return {
                        characters: updateChar(s.characters, id, {
                            merchantExp: newExp,
                            merchantLevel: expToLevel(newExp),
                        }),
                    };
                }),

            updateCurrentHp: (id, hp) =>
                set((s) => ({ characters: updateChar(s.characters, id, { currentHp: hp }) })),

            upgradeStarRank: (id) =>
                set((s) => {
                    const char = s.characters.find((c) => c.id === id);
                    if (!char) return s;
                    // Cost doubles each rank: ★1→★2: 1, ★2→★3: 2, ★3→★4: 4, ...
                    const certCost = Math.pow(2, char.starRank - 1);
                    if (char.certificates < certCost) return s;
                    return {
                        characters: updateChar(s.characters, id, {
                            starRank: char.starRank + 1,
                            certificates: char.certificates - certCost,
                        }),
                    };
                }),
        }),
        {
            name: "holo-guild-characters",
            version: 1,
            // v0 では char.stats は「1レベルあたりの値」だった。
            // v1 で「累積ステータス」に変更したため、stats × battleLevel で移行し現行パワーを維持する。
            migrate: (persisted: unknown, version: number) => {
                const state = persisted as { characters?: CharacterInstance[] };
                if (version < 1 && state?.characters) {
                    state.characters = state.characters.map((c) => ({
                        ...c,
                        stats: {
                            hp: c.stats.hp * c.battleLevel,
                            atk: c.stats.atk * c.battleLevel,
                            def: c.stats.def * c.battleLevel,
                            mag: c.stats.mag * c.battleLevel,
                            mdef: c.stats.mdef * c.battleLevel,
                            spd: c.stats.spd * c.battleLevel,
                        },
                    }));
                }
                return state;
            },
        },
    ),
);
