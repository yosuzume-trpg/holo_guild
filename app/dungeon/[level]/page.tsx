"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CharacterInstance, EnemyInstance, Buff, StageType, Attribute } from "@/types/game";
import { getCharacterMaster, REGIONS } from "@/data/characters";
import { getEquipment, EQUIPMENT_MASTERS } from "@/data/equipment";
import { getDungeonMaterials, getMaterial } from "@/data/materials";
import { DUNGEON_ITEMS, getRecipe } from "@/data/recipes";
import { useGameStore } from "@/store/gameStore";
import { useCharacterStore } from "@/store/characterStore";
import { useInventoryStore } from "@/store/inventoryStore";
import { useDungeonStore } from "@/store/dungeonStore";
import type { StoredBattle } from "@/store/dungeonStore";
import { calcCharacterStats, calcMaxHp } from "@/utils/characterStats";
import {
    ATTR_ADVANTAGE,
    DUNGEON_ATTR,
    ENEMY_NEUTRAL_CHANCE,
    ATTR_ADVANTAGE_MULT,
    ATTR_DISADVANTAGE_MULT,
    ENEMY_BASE_STATS,
    ENEMY_EXP_BASE,
    ITEM_EFFECTS,
    RECOVERY_HEAL_PERCENT,
    CHEST_GOLD_FACTOR,
    CHEST_MATERIAL_THRESHOLD,
    CHEST_POTION_THRESHOLD,
    CHEST_EQUIP_THRESHOLD,
    CHEST_MAT_MIN,
    CHEST_MAT_RANGE,
    BATTLE_GOLD_NORMAL_FACTOR,
    BATTLE_GOLD_ELITE_FACTOR,
    BATTLE_GOLD_BOSS_FACTOR,
    BATTLE_MAT_NORMAL_MIN,
    BATTLE_MAT_NORMAL_RANGE,
    BATTLE_MAT_ELITE_MIN,
    BATTLE_MAT_ELITE_RANGE,
    RETREAT_REWARD_RATE,
    BUFF_DURATION_TURNS,
    STAGE2_BATTLE_CHANCE,
    STAGE4_RECOVERY_THRESHOLD,
    STAGE4_CHEST_THRESHOLD,
    STAGE5_ELITE_CHANCE,
    DUNGEON_BRANCH_CHANCE,
    ENEMY_TYPE_THRESHOLD_STANDARD,
    ENEMY_TYPE_THRESHOLD_ATTACK,
    ENEMY_TYPE_THRESHOLD_MAGIC,
    ENEMY_COUNT_DL_THRESHOLD,
    ENEMY_COUNT_LOW_MIN,
    ENEMY_COUNT_LOW_MAX,
    ENEMY_COUNT_HIGH_MIN,
    ENEMY_COUNT_HIGH_MAX,
    GR_UPGRADE_MAT_COST,
} from "@/data/constants";

type BattleState = StoredBattle;

// ─── Constants ─────────────────────────────────────────────────────────────
const ATTR_LABEL: Record<string, string> = { fire: "火", wind: "風", earth: "地", water: "水" };
const ATTR_COLOR: Record<string, string> = {
    fire: "text-red-400",
    wind: "text-green-400",
    earth: "text-yellow-600",
    water: "text-blue-400",
};

type EnemyTypeKey = "standard" | "attack" | "magic" | "defense" | "elite" | "boss";
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
const ENEMY_STATS: Record<EnemyTypeKey, (d: number) => EnemyInstance["stats"]> = {
    standard: scaleStats(ENEMY_BASE_STATS.standard),
    attack: scaleStats(ENEMY_BASE_STATS.attack),
    magic: scaleStats(ENEMY_BASE_STATS.magic),
    defense: scaleStats(ENEMY_BASE_STATS.defense),
    elite: scaleStats(ENEMY_BASE_STATS.elite),
    boss: scaleStats(ENEMY_BASE_STATS.boss),
};
const ENEMY_EXP: Record<EnemyTypeKey, (d: number) => number> = Object.fromEntries(
    Object.entries(ENEMY_EXP_BASE).map(([k, v]) => [k, (d: number) => v * d]),
) as Record<EnemyTypeKey, (d: number) => number>;

const TENDENCY_LABEL: Record<string, string> = {
    standard: "標準",
    attack: "攻撃型",
    magic: "魔法型",
    defense: "防御型",
    speed: "速度型",
};
const TENDENCY_COLOR: Record<string, string> = {
    standard: "text-slate-400",
    attack: "text-red-400",
    magic: "text-purple-400",
    defense: "text-blue-400",
    speed: "text-green-400",
};

// ─── Pure helpers ──────────────────────────────────────────────────────────
function calcDmg(atk: number, def: number) {
    return Math.max(1, Math.floor((atk * atk) / (atk + def)));
}
function attrMult(atkAttr: Attribute, defAttr: Attribute): number {
    if (!atkAttr || !defAttr) return 1;
    if (ATTR_ADVANTAGE[atkAttr] === defAttr) return ATTR_ADVANTAGE_MULT;
    if (ATTR_ADVANTAGE[defAttr] === atkAttr) return ATTR_DISADVANTAGE_MULT;
    return 1;
}
function dungeonAttr(dl: number): Attribute {
    return DUNGEON_ATTR[(dl - 1) % 4];
}
function randomEnemyType(): EnemyTypeKey {
    const r = Math.random();
    if (r < ENEMY_TYPE_THRESHOLD_STANDARD) return "standard";
    if (r < ENEMY_TYPE_THRESHOLD_ATTACK) return "attack";
    if (r < ENEMY_TYPE_THRESHOLD_MAGIC) return "magic";
    return "defense";
}
function makeEnemy(type: EnemyTypeKey, dl: number, attr: Attribute): EnemyInstance {
    const s = ENEMY_STATS[type](dl);
    return { id: crypto.randomUUID(), type, hp: s.hp, maxHp: s.hp, stats: s, attribute: attr };
}
function makeEnemies(stageType: StageType, dl: number): EnemyInstance[] {
    const attr = dungeonAttr(dl);
    if (stageType === "boss") return [makeEnemy("boss", dl, attr)];
    if (stageType === "elite") return [makeEnemy("elite", dl, attr)];
    const count =
        dl <= ENEMY_COUNT_DL_THRESHOLD
            ? ENEMY_COUNT_LOW_MIN +
              Math.floor(Math.random() * (ENEMY_COUNT_LOW_MAX - ENEMY_COUNT_LOW_MIN + 1))
            : ENEMY_COUNT_HIGH_MIN +
              Math.floor(Math.random() * (ENEMY_COUNT_HIGH_MAX - ENEMY_COUNT_HIGH_MIN + 1));
    // 通常敵はDL属性を持つが、一部は無属性のまま
    return Array.from({ length: count }, () =>
        makeEnemy(randomEnemyType(), dl, Math.random() < ENEMY_NEUTRAL_CHANCE ? null : attr),
    );
}
function buildTurnOrder(partyIds: string[], chars: CharacterInstance[], enemies: EnemyInstance[]) {
    const all: { id: string; spd: number; isPlayer: boolean }[] = [
        ...partyIds.map((id) => {
            const c = chars.find((x) => x.id === id)!;
            return { id, spd: c.stats.spd * c.battleLevel, isPlayer: true };
        }),
        ...enemies.map((e) => ({ id: e.id, spd: e.stats.spd, isPlayer: false })),
    ];
    all.sort((a, b) => b.spd - a.spd);
    return all.map(({ id, isPlayer }) => ({ id, isPlayer }));
}
function buffedStat(base: number, buffs: Buff[], type: "atk" | "def" | "mag") {
    const bonus = buffs
        .filter((b) => b.type === type && b.turnsRemaining > 0)
        .reduce((s, b) => s + b.percent / 100, 0);
    return Math.floor(base * (1 + bonus));
}
function charWeaponAttr(char: CharacterInstance): Attribute {
    const wid = char.equipment.weapon;
    if (!wid) return null;
    const inv = useInventoryStore.getState();
    const inst = inv.equipment.find((e) => e.instanceId === wid);
    if (!inst) return null;
    return getEquipment(inst.masterId)?.attribute ?? null;
}
function charArmorAttr(char: CharacterInstance): Attribute {
    const aid = char.equipment.armor;
    if (!aid) return null;
    const inv = useInventoryStore.getState();
    const inst = inv.equipment.find((e) => e.instanceId === aid);
    if (!inst) return null;
    return getEquipment(inst.masterId)?.attribute ?? null;
}
function generateStageTypes(dl: number): StageType[] {
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

// ─── Component ─────────────────────────────────────────────────────────────
export default function DungeonBattlePage({ params }: { params: Promise<{ level: string }> }) {
    const { level: lvStr } = use(params);
    const dl = parseInt(lvStr, 10);
    const router = useRouter();

    const addGold = useGameStore((s) => s.addGold);
    const upgradeGuildRank = useGameStore((s) => s.upgradeGuildRank);
    const unlockRegion = useGameStore((s) => s.unlockRegion);
    const guildRank = useGameStore((s) => s.guildRank);
    const unlockedRegions = useGameStore((s) => s.unlockedRegions);
    const characters = useCharacterStore((s) => s.characters);
    const gainBattleExp = useCharacterStore((s) => s.gainBattleExp);
    const updateCurrentHp = useCharacterStore((s) => s.updateCurrentHp);
    const clearDungeon = useDungeonStore((s) => s.clearDungeon);
    const addRecruitPoints = useDungeonStore((s) => s.addRecruitPoints);
    const storedBattle = useDungeonStore((s) => s.activeBattle);
    const setActiveBattle = useDungeonStore((s) => s.setActiveBattle);
    const invEquipment = useInventoryStore((s) => s.equipment);

    const [partyIds, setPartyIds] = useState<string[]>([]);
    const [dungeonItems, setDungeonItems] = useState<Record<string, number>>({});
    const [bs, setBs] = useState<BattleState | null>(() =>
        storedBattle?.dungeonLevel === dl ? storedBattle : null,
    );
    const [action, setAction] = useState<"menu" | "attack" | "magic" | "item" | "item-target">(
        "menu",
    );
    const [selectedItem, setSelectedItem] = useState("");
    const [result, setResult] = useState<"clear" | "wipe" | "retreat" | null>(null);
    const [grUpgraded, setGrUpgraded] = useState(false);
    const [regionPicked, setRegionPicked] = useState(false);
    const [pendingBranch, setPendingBranch] = useState<{
        stage: number;
        options: [StageType, StageType];
    } | null>(null);

    function getEquipName(instanceId: string | null): string | null {
        if (!instanceId) return null;
        const inst = invEquipment.find((e) => e.instanceId === instanceId);
        return inst ? (getEquipment(inst.masterId)?.name ?? null) : null;
    }

    // ステータスは唯一の真実の源 calcCharacterStats に委譲（表示=実戦を保証）
    function effectiveStats(char: CharacterInstance) {
        return calcCharacterStats(char, invEquipment).total;
    }

    // Restore item inventory snapshot when resuming
    useEffect(() => {
        if (storedBattle?.dungeonLevel === dl && !result) {
            const inv = useInventoryStore.getState();
            const items: Record<string, number> = {};
            for (const id of DUNGEON_ITEMS) items[id] = Math.min(inv.materials[id] ?? 0, 5);
            setDungeonItems(items);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync battle state to store on every change
    useEffect(() => {
        if (bs && !result) setActiveBattle(bs);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bs]);

    // ── Party selection ─────────────────────────────────────────────────────
    function toggleParty(id: string) {
        setPartyIds((p) =>
            p.includes(id) ? p.filter((x) => x !== id) : p.length < 5 ? [...p, id] : p,
        );
    }

    function startDungeon() {
        if (partyIds.length === 0) return;
        const stageTypes = generateStageTypes(dl);

        // Snapshot item inventory
        const inv = useInventoryStore.getState();
        const items: Record<string, number> = {};
        for (const id of DUNGEON_ITEMS) items[id] = Math.min(inv.materials[id] ?? 0, 5);
        setDungeonItems(items);

        // Snapshot party HP
        const partyHps: Record<string, number> = {};
        for (const id of partyIds) {
            const c = characters.find((x) => x.id === id)!;
            partyHps[id] = c.currentHp;
        }

        const stageType = stageTypes[0];
        const enemies = stageType === "battle" ? makeEnemies(stageType, dl) : [];
        const initialBs: BattleState = {
            dungeonLevel: dl,
            stageTypes,
            currentStage: 0,
            stageType,
            enemies,
            partyIds,
            partyHps,
            partyBuffs: {},
            loot: { gold: 0, materials: {}, equipmentMasterIds: [], exp: 0 },
            turnOrder: enemies.length > 0 ? buildTurnOrder(partyIds, characters, enemies) : [],
            currentTurnIndex: 0,
            battlePhase: enemies.length > 0 ? "player-action" : "result",
            log: [`ダンジョン Lv.${dl} 開始！`],
        };
        const firstSlot = initialBs.turnOrder[initialBs.currentTurnIndex];
        if (firstSlot && !firstSlot.isPlayer) {
            const firstEnemy = initialBs.enemies.find((e) => e.id === firstSlot.id);
            if (firstEnemy) {
                setBs(processEnemyTurn(initialBs, initialBs.currentTurnIndex, firstEnemy));
                return;
            }
        }
        setBs(initialBs);
    }

    // ── Stage advancement ───────────────────────────────────────────────────
    // NOTE: advanceStage must NOT call handleClear (Zustand set inside React setState updater)
    // The caller is responsible for checking currentStage + 1 >= 6 and calling handleClear directly.
    function advanceStage(state: BattleState): BattleState {
        const nextStage = state.currentStage + 1;
        if (nextStage >= 6) return state; // safety guard; caller should not reach here

        const nextType = state.stageTypes[nextStage];
        const newLog = [...state.log];
        let newLoot = { ...state.loot, materials: { ...state.loot.materials } };
        let newHps = { ...state.partyHps };

        if (nextType === "recovery") {
            for (const id of state.partyIds) {
                const c = characters.find((x) => x.id === id)!;
                const maxHp = calcMaxHp(c, invEquipment);
                const heal = Math.floor(maxHp * RECOVERY_HEAL_PERCENT);
                newHps[id] = Math.min(maxHp, (newHps[id] ?? maxHp) + heal);
                newLog.push(`💚 ${getCharacterMaster(c.masterId)?.name} HP +${heal}`);
            }
        } else if (nextType === "chest") {
            const gold = CHEST_GOLD_FACTOR * dl;
            newLoot.gold += gold;
            const r = Math.random();
            const mats = getDungeonMaterials(dl);
            if (r < CHEST_MATERIAL_THRESHOLD) {
                if (mats.length > 0) {
                    const mat = mats[Math.floor(Math.random() * mats.length)];
                    const qty = CHEST_MAT_MIN + Math.floor(Math.random() * CHEST_MAT_RANGE);
                    newLoot.materials[mat.id] = (newLoot.materials[mat.id] ?? 0) + qty;
                    newLog.push(`📦 宝箱: ${gold}G・${mat.name}×${qty}`);
                } else {
                    newLog.push(`📦 宝箱: ${gold}G`);
                }
            } else if (r < CHEST_POTION_THRESHOLD) {
                newLoot.materials["potion"] = (newLoot.materials["potion"] ?? 0) + 1;
                newLog.push(`📦 宝箱: ${gold}G・回復ポーション×1`);
            } else if (r < CHEST_EQUIP_THRESHOLD) {
                const picked =
                    EQUIPMENT_MASTERS[Math.floor(Math.random() * EQUIPMENT_MASTERS.length)];
                newLoot.equipmentMasterIds = [...newLoot.equipmentMasterIds, picked.id];
                newLog.push(`📦 宝箱: ${gold}G・${picked.name}`);
            } else {
                newLog.push(`📦 宝箱: ${gold}G`);
            }
        }

        const enemies =
            nextType === "battle" || nextType === "boss" || nextType === "elite"
                ? makeEnemies(nextType, dl)
                : [];

        const next: BattleState = {
            ...state,
            currentStage: nextStage,
            stageType: nextType,
            enemies,
            partyHps: newHps,
            loot: newLoot,
            turnOrder:
                enemies.length > 0 ? buildTurnOrder(state.partyIds, characters, enemies) : [],
            currentTurnIndex: 0,
            battlePhase: enemies.length > 0 ? "player-action" : "result",
            log: newLog,
        };
        return next;
    }

    function handleClear(state: BattleState): BattleState {
        addGold(state.loot.gold);
        const inv = useInventoryStore.getState();
        for (const [matId, qty] of Object.entries(state.loot.materials)) {
            inv.addMaterial(matId, qty);
        }
        for (const eqMasterId of state.loot.equipmentMasterIds) {
            inv.addEquipment(eqMasterId);
        }
        for (const id of state.partyIds) gainBattleExp(id, state.loot.exp);
        for (const id of state.partyIds) {
            const c = characters.find((x) => x.id === id)!;
            updateCurrentHp(id, calcMaxHp(c, invEquipment));
        }
        clearDungeon(dl);
        // Recruit points: 1 per party member's region
        for (const id of state.partyIds) {
            const c = characters.find((x) => x.id === id)!;
            const master = getCharacterMaster(c.masterId);
            if (master) addRecruitPoints(master.region, 1);
        }
        if (dl % 10 === 0 && dl / 10 === guildRank) setGrUpgraded(upgradeGuildRank());
        setActiveBattle(null);
        setResult("clear");
        return state;
    }

    // ── Turn advancement ────────────────────────────────────────────────────
    function advanceTurn(state: BattleState): BattleState {
        const len = state.turnOrder.length;
        if (len === 0) return state;

        let idx = (state.currentTurnIndex + 1) % len;
        let attempts = 0;

        while (attempts < len) {
            const slot = state.turnOrder[idx];
            if (slot.isPlayer) {
                if ((state.partyHps[slot.id] ?? 0) > 0) {
                    return { ...state, currentTurnIndex: idx, battlePhase: "player-action" };
                }
            } else {
                const enemy = state.enemies.find((e) => e.id === slot.id);
                if (enemy && enemy.hp > 0) {
                    // Process enemy turn
                    return processEnemyTurn(state, idx, enemy);
                }
            }
            idx = (idx + 1) % len;
            attempts++;
        }
        return state;
    }

    function processEnemyTurn(state: BattleState, idx: number, enemy: EnemyInstance): BattleState {
        const aliveParty = state.partyIds.filter((id) => (state.partyHps[id] ?? 0) > 0);
        if (aliveParty.length === 0) {
            for (const id of state.partyIds) {
                const c = characters.find((x) => x.id === id);
                if (c) updateCurrentHp(id, calcMaxHp(c, invEquipment));
            }
            setActiveBattle(null);
            setResult("wipe");
            return state;
        }

        const usesMag =
            enemy.type === "magic" ||
            ((enemy.type === "elite" || enemy.type === "boss") &&
                enemy.stats.mag >= enemy.stats.atk);

        // Target selection
        let targetId: string;
        if (enemy.type === "defense") {
            targetId = aliveParty.reduce((a, b) =>
                (state.partyHps[a] ?? 0) < (state.partyHps[b] ?? 0) ? a : b,
            );
        } else if (enemy.type === "elite" || enemy.type === "boss") {
            // Weighted by 1/defStat: lower defense = higher probability of being targeted
            const weights = aliveParty.map((id) => {
                const c = characters.find((x) => x.id === id)!;
                const eff = effectiveStats(c);
                const stat = usesMag ? eff.mdef : eff.def;
                return 1 / Math.max(1, stat);
            });
            const total = weights.reduce((s, w) => s + w, 0);
            let r = Math.random() * total;
            let ti = aliveParty.length - 1;
            for (let i = 0; i < weights.length; i++) {
                r -= weights[i];
                if (r <= 0) {
                    ti = i;
                    break;
                }
            }
            targetId = aliveParty[ti];
        } else {
            targetId = aliveParty[Math.floor(Math.random() * aliveParty.length)];
        }

        const target = characters.find((c) => c.id === targetId)!;
        const buffs = state.partyBuffs[targetId] ?? [];
        const effDef = effectiveStats(target);
        const defStat = usesMag ? effDef.mdef : effDef.def;
        const dmgRaw = usesMag
            ? calcDmg(enemy.stats.mag, defStat)
            : calcDmg(enemy.stats.atk, defStat);
        const armorAttr = charArmorAttr(target);
        const mult = attrMult(enemy.attribute, armorAttr);
        const defBuff = buffs
            .filter((b) => b.type === "def" && b.turnsRemaining > 0)
            .reduce((s, b) => s + b.percent / 100, 0);
        const dmg = Math.max(1, Math.floor(dmgRaw * mult * (1 - defBuff)));

        const newHp = Math.max(0, (state.partyHps[targetId] ?? target.stats.hp) - dmg);
        const newHps = { ...state.partyHps, [targetId]: newHp };

        const multStr = mult > 1 ? "【有利！】" : mult < 1 ? "【不利】" : "";
        const tname = getCharacterMaster(target.masterId)?.name ?? targetId;
        const newLog = [
            ...state.log,
            `🔴 ${enemy.type} → ${tname} に${usesMag ? "魔法" : "物理"}${dmg}ダメージ${multStr}`,
        ];

        // Tick buffs for target
        const newBuffs = { ...state.partyBuffs };
        if (newBuffs[targetId]) {
            newBuffs[targetId] = newBuffs[targetId]
                .map((b) => ({ ...b, turnsRemaining: b.turnsRemaining - 1 }))
                .filter((b) => b.turnsRemaining > 0);
        }

        const newState = {
            ...state,
            partyHps: newHps,
            partyBuffs: newBuffs,
            currentTurnIndex: idx,
            log: newLog,
        };

        // Check wipe
        if (Object.values(newHps).every((hp) => hp <= 0)) {
            for (const id of state.partyIds) {
                const c = characters.find((x) => x.id === id);
                if (c) updateCurrentHp(id, calcMaxHp(c, invEquipment));
            }
            setActiveBattle(null);
            setResult("wipe");
            return newState;
        }

        return advanceTurn(newState);
    }

    // ── Player actions ──────────────────────────────────────────────────────
    function handleAttack(targetEnemyId: string, usesMagic: boolean) {
        if (!bs || bs.battlePhase !== "player-action") return;
        const slot = bs.turnOrder[bs.currentTurnIndex];
        if (!slot?.isPlayer) return;

        const attacker = characters.find((c) => c.id === slot.id)!;
        const enemy = bs.enemies.find((e) => e.id === targetEnemyId)!;
        if (!attacker || !enemy || enemy.hp <= 0) return;

        const buffs = bs.partyBuffs[attacker.id] ?? [];
        const effAtk = effectiveStats(attacker);
        const atkStat = usesMagic
            ? buffedStat(effAtk.mag, buffs, "mag")
            : buffedStat(effAtk.atk, buffs, "atk");
        const defStat = usesMagic ? enemy.stats.mdef : enemy.stats.def;
        const wAttr = charWeaponAttr(attacker);
        const mult = attrMult(wAttr, enemy.attribute);
        const dmg = Math.max(1, Math.floor(calcDmg(atkStat, defStat) * mult));

        // Tick attacker buffs
        const newBuffs = { ...bs.partyBuffs };
        newBuffs[attacker.id] = (newBuffs[attacker.id] ?? [])
            .map((b) => ({ ...b, turnsRemaining: b.turnsRemaining - 1 }))
            .filter((b) => b.turnsRemaining > 0);

        const newEnemies = bs.enemies.map((e) =>
            e.id === targetEnemyId ? { ...e, hp: Math.max(0, e.hp - dmg) } : e,
        );
        const multStr = mult > 1 ? "【有利！】" : mult < 1 ? "【不利】" : "";
        const aname = getCharacterMaster(attacker.masterId)?.name ?? attacker.id;
        const newLog = [
            ...bs.log,
            `${aname} → ${enemy.type} に${usesMagic ? "魔法" : "物理"}${dmg}ダメージ${multStr}`,
        ];

        const allDead = newEnemies.every((e) => e.hp <= 0);
        if (allDead) {
            const expGain = bs.enemies.reduce(
                (s, e) => s + ENEMY_EXP[e.type as EnemyTypeKey](dl),
                0,
            );
            const goldGain =
                bs.stageType === "boss"
                    ? BATTLE_GOLD_BOSS_FACTOR * dl
                    : bs.stageType === "elite"
                      ? BATTLE_GOLD_ELITE_FACTOR * dl
                      : BATTLE_GOLD_NORMAL_FACTOR * dl;
            const mats = getDungeonMaterials(dl);
            const mat = mats.length > 0 ? mats[Math.floor(Math.random() * mats.length)] : null;
            const isEliteOrBoss = bs.stageType === "elite" || bs.stageType === "boss";
            const matQty = mat
                ? isEliteOrBoss
                    ? BATTLE_MAT_ELITE_MIN + Math.floor(Math.random() * BATTLE_MAT_ELITE_RANGE)
                    : BATTLE_MAT_NORMAL_MIN + Math.floor(Math.random() * BATTLE_MAT_NORMAL_RANGE)
                : 0;
            let newEquipIds = [...bs.loot.equipmentMasterIds];
            let winMsg = `✨ 勝利！ +${goldGain}G`;
            if (mat && matQty > 0) winMsg += `・${mat.name}×${matQty}`;
            if (bs.stageType === "elite") {
                const picked =
                    EQUIPMENT_MASTERS[Math.floor(Math.random() * EQUIPMENT_MASTERS.length)];
                newEquipIds = [...newEquipIds, picked.id];
                winMsg += `・${picked.name}`;
            }
            const newLoot = {
                gold: bs.loot.gold + goldGain,
                exp: bs.loot.exp + expGain,
                equipmentMasterIds: newEquipIds,
                materials: mat
                    ? { ...bs.loot.materials, [mat.id]: (bs.loot.materials[mat.id] ?? 0) + matQty }
                    : { ...bs.loot.materials },
            };
            const winLog = [...newLog, winMsg];
            setBs({
                ...bs,
                enemies: newEnemies,
                partyBuffs: newBuffs,
                loot: newLoot,
                battlePhase: "result",
                log: winLog,
            });
        } else {
            const mid = { ...bs, enemies: newEnemies, partyBuffs: newBuffs, log: newLog };
            setBs(advanceTurn(mid));
        }
        setAction("menu");
    }

    function handleUseItem(targetCharId: string) {
        if (!bs || !selectedItem) return;
        const eff = ITEM_EFFECTS[selectedItem];
        if (!eff) return;

        const target = characters.find((c) => c.id === targetCharId)!;
        if (!target) return;

        // Identify the acting character for the log
        const actingSlot = bs.turnOrder[bs.currentTurnIndex];
        const actingChar = actingSlot ? characters.find((c) => c.id === actingSlot.id) : null;
        const aname = actingChar
            ? (getCharacterMaster(actingChar.masterId)?.name ?? actingSlot.id)
            : "???";

        let newHps = { ...bs.partyHps };
        let newBuffs = { ...bs.partyBuffs };
        const newLog = [...bs.log];

        if (eff.type === "heal") {
            const maxHp = calcMaxHp(target, invEquipment);
            const heal = Math.floor((maxHp * eff.percent) / 100);
            newHps[targetCharId] = Math.min(maxHp, (newHps[targetCharId] ?? maxHp) + heal);
            const tname = getCharacterMaster(target.masterId)?.name ?? targetCharId;
            newLog.push(`🧪 ${aname} → ${tname} HP +${heal}回復`);
        } else if (eff.type === "buff" && eff.buffType) {
            const buff: Buff = {
                type: eff.buffType,
                percent: eff.percent,
                turnsRemaining: BUFF_DURATION_TURNS,
            };
            newBuffs[targetCharId] = [
                ...(newBuffs[targetCharId] ?? []).filter((b) => b.type !== eff.buffType),
                buff,
            ];
            const tname = getCharacterMaster(target.masterId)?.name ?? targetCharId;
            newLog.push(
                `🧪 ${aname} → ${tname} ${eff.buffType}+${eff.percent}%（${BUFF_DURATION_TURNS}ターン）`,
            );
        }

        setDungeonItems((prev) => ({ ...prev, [selectedItem]: (prev[selectedItem] ?? 0) - 1 }));
        useInventoryStore.getState().removeMaterial(selectedItem, 1);
        setSelectedItem("");

        const mid = { ...bs, partyHps: newHps, partyBuffs: newBuffs, log: newLog };
        setBs(advanceTurn(mid));
        setAction("menu");
    }

    function handleRetreat() {
        if (!bs) return;
        const gold = Math.floor(bs.loot.gold * RETREAT_REWARD_RATE);
        addGold(gold);
        const inv = useInventoryStore.getState();
        for (const [matId, qty] of Object.entries(bs.loot.materials)) {
            inv.addMaterial(matId, Math.floor(qty * RETREAT_REWARD_RATE));
        }
        for (const eqMasterId of bs.loot.equipmentMasterIds) {
            inv.addEquipment(eqMasterId);
        }
        for (const id of bs.partyIds)
            gainBattleExp(id, Math.floor(bs.loot.exp * RETREAT_REWARD_RATE));
        for (const id of bs.partyIds) {
            const c = characters.find((x) => x.id === id);
            if (c) updateCurrentHp(id, calcMaxHp(c, invEquipment));
        }
        setActiveBattle(null);
        setResult("retreat");
    }

    function proceedToStage(bsState: BattleState) {
        const next = advanceStage(bsState);
        if (next.battlePhase === "player-action") {
            const slot = next.turnOrder[next.currentTurnIndex];
            if (slot && !slot.isPlayer) {
                const enemy = next.enemies.find((e) => e.id === slot.id);
                if (enemy && enemy.hp > 0) {
                    setBs(processEnemyTurn(next, next.currentTurnIndex, enemy));
                    return;
                }
            }
        }
        setBs(next);
    }

    function handleNextStage() {
        if (!bs) return;
        const nextStage = bs.currentStage + 1;
        if (nextStage >= 6) return;

        if (Math.random() < DUNGEON_BRANCH_CHANCE) {
            const baseType = bs.stageTypes[nextStage];
            const options: [StageType, StageType] =
                baseType === "recovery" || baseType === "chest"
                    ? ["recovery", "chest"]
                    : ["battle", "elite"];
            setPendingBranch({ stage: nextStage, options });
            return;
        }

        proceedToStage(bs);
    }

    function selectBranch(type: StageType) {
        if (!bs || !pendingBranch) return;
        const newStageTypes = [...bs.stageTypes];
        newStageTypes[pendingBranch.stage] = type;
        setPendingBranch(null);
        proceedToStage({ ...bs, stageTypes: newStageTypes });
    }

    // ─── Render: party select ─────────────────────────────────────────────
    if (!bs && result === null) {
        const eligible = characters.filter(
            (c) => c.assignment === null || c.assignment.type === "dungeon",
        );
        return (
            <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                    <button
                        onClick={() => router.back()}
                        className="text-sm text-slate-400 hover:text-white"
                    >
                        ← 戻る
                    </button>
                    <h1 className="text-lg font-bold text-slate-200">DL{dl} パーティ選択</h1>
                </div>
                <p className="text-xs text-slate-400 mb-3">1〜5人選択 ({partyIds.length}/5)</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                    {eligible.map((char) => {
                        const master = getCharacterMaster(char.masterId);
                        const sel = partyIds.includes(char.id);
                        const expCur =
                            char.battleExp - (100 * char.battleLevel * (char.battleLevel - 1)) / 2;
                        const expNeeded = 100 * char.battleLevel;
                        const expPct = Math.min(100, Math.round((expCur / expNeeded) * 100));
                        const weaponName = getEquipName(char.equipment.weapon);
                        const armorName = getEquipName(char.equipment.armor);
                        return (
                            <button
                                key={char.id}
                                onClick={() => toggleParty(char.id)}
                                className={`rounded-xl p-3 border text-left transition-colors ${
                                    sel
                                        ? "bg-yellow-900 border-yellow-400 text-yellow-100"
                                        : "bg-slate-800 border-slate-700 hover:border-slate-500 text-slate-200"
                                }`}
                            >
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                    <div className="text-sm font-semibold truncate">
                                        {master?.name ?? char.masterId}
                                    </div>
                                    <span
                                        className={`text-xs shrink-0 ${TENDENCY_COLOR[char.tendency]}`}
                                    >
                                        {TENDENCY_LABEL[char.tendency]}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-400">
                                    HP: {char.currentHp}/{calcMaxHp(char, invEquipment)}
                                </div>
                                {(weaponName || armorName) && (
                                    <div className="text-xs text-slate-500 mt-0.5 truncate">
                                        {weaponName && `⚔ ${weaponName}`}
                                        {weaponName && armorName ? "　" : ""}
                                        {armorName && `🛡 ${armorName}`}
                                    </div>
                                )}
                                <div className="mt-1.5">
                                    <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                                        <span>戦闘 Lv.{char.battleLevel}</span>
                                        <span>
                                            {expCur}/{expNeeded}
                                        </span>
                                    </div>
                                    <div className="w-full h-1 bg-slate-700 rounded-full">
                                        <div
                                            className="h-full bg-blue-500 rounded-full"
                                            style={{ width: `${expPct}%` }}
                                        />
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
                <button
                    onClick={startDungeon}
                    disabled={partyIds.length === 0}
                    className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl"
                >
                    挑戦する
                </button>
            </div>
        );
    }

    // ─── Render: result ───────────────────────────────────────────────────
    if (result) {
        const loot = bs?.loot;
        return (
            <div className="p-4 text-center">
                <div
                    className={`text-3xl font-bold mb-6 ${
                        result === "clear"
                            ? "text-yellow-300"
                            : result === "wipe"
                              ? "text-red-400"
                              : "text-slate-300"
                    }`}
                >
                    {result === "clear" ? "🎉 クリア！" : result === "wipe" ? "全滅..." : "撤退"}
                </div>
                {loot && (
                    <div className="bg-slate-800 rounded-xl p-4 mb-6 text-sm text-left space-y-1.5">
                        <div className="text-slate-400 font-semibold mb-2">獲得報酬</div>
                        <div className="flex justify-between">
                            <span className="text-slate-300">ゴールド</span>
                            <span className="text-yellow-300 font-bold">
                                {result === "retreat"
                                    ? Math.floor(loot.gold * RETREAT_REWARD_RATE)
                                    : loot.gold}
                                G
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-300">経験値</span>
                            <span className="text-blue-300 font-bold">
                                {result === "retreat"
                                    ? Math.floor(loot.exp * RETREAT_REWARD_RATE)
                                    : loot.exp}
                            </span>
                        </div>
                        {Object.entries(loot.materials).map(([matId, qty]) => {
                            const m = getDungeonMaterials(dl).find((x) => x.id === matId) ??
                                getMaterial(matId) ?? { name: getRecipe(matId)?.name ?? matId };
                            const actual =
                                result === "retreat" ? Math.floor(qty * RETREAT_REWARD_RATE) : qty;
                            return (
                                <div key={matId} className="flex justify-between">
                                    <span className="text-slate-300">{m.name}</span>
                                    <span className="text-green-300">×{actual}</span>
                                </div>
                            );
                        })}
                        {loot.equipmentMasterIds.map((eqId, i) => {
                            const eq = getEquipment(eqId);
                            return (
                                <div key={i} className="flex justify-between">
                                    <span className="text-slate-300">{eq?.name ?? eqId}</span>
                                    <span className="text-yellow-300">★1 入手</span>
                                </div>
                            );
                        })}
                    </div>
                )}
                {result === "clear" && dl % 10 === 0 && (
                    <div className="mb-4">
                        {!grUpgraded && (
                            <div className="rounded-xl p-3 text-sm font-semibold bg-slate-800 border border-slate-600 text-slate-400">
                                ⚠️ GRアップには魔力結晶×{guildRank * GR_UPGRADE_MAT_COST} /
                                古代歯車×{guildRank * GR_UPGRADE_MAT_COST} が必要です
                            </div>
                        )}
                        {grUpgraded &&
                            (() => {
                                const lockable = REGIONS.filter(
                                    (r) => !unlockedRegions.includes(r.id),
                                );
                                if (lockable.length === 0 || regionPicked) {
                                    return (
                                        <div className="rounded-xl p-3 text-sm font-semibold bg-yellow-900 border border-yellow-500 text-yellow-200">
                                            🏆 ギルドランクが {guildRank} に上昇しました！
                                        </div>
                                    );
                                }
                                return (
                                    <div className="bg-yellow-900 border border-yellow-500 rounded-xl p-3 space-y-2">
                                        <div className="text-sm font-semibold text-yellow-200">
                                            🏆 GR{guildRank} に上昇！解放する地域を1つ選んでください
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {lockable.map((r) => (
                                                <button
                                                    key={r.id}
                                                    onClick={() => {
                                                        unlockRegion(r.id);
                                                        setRegionPicked(true);
                                                    }}
                                                    className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-2 rounded text-sm transition-colors"
                                                >
                                                    {r.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                    </div>
                )}
                <button
                    onClick={() => router.push("/dungeon")}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl"
                >
                    ダンジョン一覧へ
                </button>
            </div>
        );
    }

    // ─── Render: branch selection ─────────────────────────────────────────
    if (pendingBranch) {
        const BRANCH_LABEL: Record<string, string> = {
            battle: "通常戦闘",
            elite: "強敵",
            recovery: "回復",
            chest: "宝箱",
        };
        const BRANCH_ICON: Record<string, string> = {
            battle: "⚔️",
            elite: "🟠",
            recovery: "💚",
            chest: "📦",
        };
        return (
            <div className="flex flex-col h-full items-center justify-center p-6 gap-6">
                <div className="text-center">
                    <div className="text-xl font-bold text-yellow-300 mb-1">⚡ 分岐！</div>
                    <div className="text-sm text-slate-400">
                        ステージ{pendingBranch.stage + 1} — どちらに進みますか？
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                    {pendingBranch.options.map((opt) => (
                        <button
                            key={opt}
                            onClick={() => selectBranch(opt)}
                            className="bg-slate-700 hover:bg-slate-600 border border-slate-500 hover:border-yellow-400 rounded-2xl p-6 text-center transition-colors"
                        >
                            <div className="text-3xl mb-2">{BRANCH_ICON[opt]}</div>
                            <div className="text-sm font-bold text-slate-200">
                                {BRANCH_LABEL[opt]}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // ─── Render: dungeon battle ───────────────────────────────────────────
    if (!bs) return null;
    const slot = bs.turnOrder[bs.currentTurnIndex];
    const isPlayerTurn = slot?.isPlayer && bs.battlePhase === "player-action";
    const actingChar = isPlayerTurn ? characters.find((c) => c.id === slot.id) : null;
    const actingEffStats = actingChar ? effectiveStats(actingChar) : null;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 shrink-0">
                <div className="text-sm font-semibold text-slate-200">
                    DL{dl} — {bs.currentStage + 1}/6ステージ
                    <span className="ml-2 text-xs text-slate-400">
                        {bs.stageType === "boss"
                            ? "🔴 BOSS"
                            : bs.stageType === "elite"
                              ? "🟠 強敵"
                              : bs.stageType === "recovery"
                                ? "💚 回復"
                                : bs.stageType === "chest"
                                  ? "📦 宝箱"
                                  : "⚔️ 戦闘"}
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                {/* Enemies */}
                {bs.enemies.length > 0 && (
                    <div>
                        <div className="text-xs text-slate-500 mb-1">敵</div>
                        <div className="flex gap-2 flex-wrap">
                            {bs.enemies.map((e) => {
                                const isTarget = action === "attack" || action === "magic";
                                return (
                                    <button
                                        key={e.id}
                                        onClick={() =>
                                            isTarget &&
                                            e.hp > 0 &&
                                            handleAttack(e.id, action === "magic")
                                        }
                                        disabled={e.hp <= 0 || !isTarget}
                                        className={`rounded-lg p-2 text-center min-w-20 border transition-colors ${
                                            e.hp <= 0
                                                ? "opacity-30 border-slate-700 bg-slate-800"
                                                : isTarget
                                                  ? "border-yellow-400 bg-slate-700 hover:bg-slate-600 cursor-pointer"
                                                  : "border-slate-700 bg-slate-800"
                                        }`}
                                    >
                                        <div className="text-xs text-slate-300">
                                            {e.type}
                                            {e.attribute && (
                                                <span className={`ml-1 ${ATTR_COLOR[e.attribute]}`}>
                                                    [{ATTR_LABEL[e.attribute]}]
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-0.5">
                                            {e.hp}/{e.maxHp}
                                        </div>
                                        <div className="w-full h-1 bg-slate-700 rounded mt-1">
                                            <div
                                                className="h-full bg-red-500 rounded"
                                                style={{ width: `${(e.hp / e.maxHp) * 100}%` }}
                                            />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Party */}
                <div>
                    <div className="text-xs text-slate-500 mb-1">パーティ</div>
                    <div className="space-y-1.5">
                        {bs.partyIds.map((charId) => {
                            const char = characters.find((c) => c.id === charId)!;
                            if (!char) return null;
                            const master = getCharacterMaster(char.masterId);
                            const maxHp = calcMaxHp(char, invEquipment);
                            const hp = bs.partyHps[charId] ?? maxHp;
                            const hpPct = (hp / maxHp) * 100;
                            const isActing =
                                slot?.id === charId && bs.battlePhase === "player-action";
                            const buffs = bs.partyBuffs[charId] ?? [];
                            const isItemTarget = action === "item-target";
                            const weaponName = getEquipName(char.equipment.weapon);
                            const armorName = getEquipName(char.equipment.armor);
                            return (
                                <button
                                    key={charId}
                                    onClick={() => isItemTarget && hp > 0 && handleUseItem(charId)}
                                    disabled={hp <= 0 || !isItemTarget}
                                    className={`w-full rounded-lg p-2.5 border text-left transition-colors ${
                                        hp <= 0
                                            ? "opacity-30 border-slate-700 bg-slate-800"
                                            : isItemTarget
                                              ? "border-yellow-400 bg-slate-700 hover:bg-slate-600 cursor-pointer"
                                              : isActing
                                                ? "border-yellow-300 bg-slate-700"
                                                : "border-slate-700 bg-slate-800"
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-sm font-semibold text-slate-100 truncate">
                                                {master?.name}
                                            </span>
                                            <span
                                                className={`text-xs shrink-0 ${TENDENCY_COLOR[char.tendency]}`}
                                            >
                                                {TENDENCY_LABEL[char.tendency]}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-400 shrink-0 ml-1">
                                            {hp}/{maxHp}
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-700 rounded mb-1">
                                        <div
                                            className={`h-full rounded transition-all ${hpPct > 50 ? "bg-green-500" : hpPct > 25 ? "bg-yellow-500" : "bg-red-500"}`}
                                            style={{ width: `${hpPct}%` }}
                                        />
                                    </div>
                                    {(weaponName || armorName) && (
                                        <div className="text-xs text-slate-500 mb-1 truncate">
                                            {weaponName && `⚔ ${weaponName}`}
                                            {weaponName && armorName ? "　" : ""}
                                            {armorName && `🛡 ${armorName}`}
                                        </div>
                                    )}
                                    {buffs.length > 0 && (
                                        <div className="flex gap-1 flex-wrap">
                                            {buffs.map((b, i) => (
                                                <span
                                                    key={i}
                                                    className="text-xs bg-blue-900 text-blue-200 px-1 rounded"
                                                >
                                                    {b.type}+{b.percent}%({b.turnsRemaining}T)
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Battle log */}
                <div className="bg-slate-900 rounded-lg p-2 max-h-28 overflow-y-auto">
                    {bs.log
                        .slice(-10)
                        .reverse()
                        .map((line, i) => (
                            <div key={i} className="text-xs text-slate-400 leading-5">
                                {line}
                            </div>
                        ))}
                </div>
            </div>

            {/* Action bar */}
            <div className="border-t border-slate-700 bg-slate-800 p-3 shrink-0">
                {bs.battlePhase === "result" ? (
                    bs.currentStage + 1 >= 6 ? (
                        // Final stage cleared: call handleClear directly (must NOT be inside setBs updater)
                        <button
                            onClick={() => handleClear(bs)}
                            className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-2.5 rounded-lg"
                        >
                            🎉 ダンジョンクリア！
                        </button>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={handleRetreat}
                                className="bg-slate-700 hover:bg-slate-600 border border-slate-500 text-slate-200 font-bold py-2.5 rounded-lg text-sm"
                            >
                                撤退 (50%)
                            </button>
                            <button
                                onClick={handleNextStage}
                                className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-2.5 rounded-lg text-sm"
                            >
                                次のステージへ →
                            </button>
                        </div>
                    )
                ) : isPlayerTurn && actingChar ? (
                    <div>
                        <div className="text-xs text-slate-400 mb-2">
                            ⚡ {getCharacterMaster(actingChar.masterId)?.name} のターン
                        </div>
                        {action === "menu" && (
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => setAction("attack")}
                                    className="bg-red-800 hover:bg-red-700 text-white py-2 rounded text-sm font-bold leading-tight"
                                >
                                    <div>攻撃</div>
                                    <div className="text-xs font-normal opacity-80">
                                        ATK {actingEffStats?.atk}
                                    </div>
                                </button>
                                <button
                                    onClick={() => setAction("magic")}
                                    className="bg-purple-800 hover:bg-purple-700 text-white py-2 rounded text-sm font-bold leading-tight"
                                >
                                    <div>魔法</div>
                                    <div className="text-xs font-normal opacity-80">
                                        MAG {actingEffStats?.mag}
                                    </div>
                                </button>
                                <button
                                    onClick={() => setAction("item")}
                                    className="bg-slate-600 hover:bg-slate-500 text-white py-2 rounded text-sm font-bold"
                                >
                                    アイテム
                                </button>
                            </div>
                        )}
                        {(action === "attack" || action === "magic") && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setAction("menu")}
                                    className="text-xs text-slate-400 hover:text-white border border-slate-600 px-2 py-1 rounded"
                                >
                                    ← 戻る
                                </button>
                                <span className="text-xs text-slate-400">↑ 攻撃する敵を選択</span>
                            </div>
                        )}
                        {action === "item" && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <button
                                        onClick={() => setAction("menu")}
                                        className="text-xs text-slate-400 hover:text-white border border-slate-600 px-2 py-1 rounded"
                                    >
                                        ← 戻る
                                    </button>
                                    <span className="text-xs text-slate-400">アイテムを選択</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {DUNGEON_ITEMS.map((itemId) => {
                                        const qty = dungeonItems[itemId] ?? 0;
                                        const recipe = getRecipe(itemId);
                                        return (
                                            <button
                                                key={itemId}
                                                disabled={qty <= 0}
                                                onClick={() => {
                                                    setSelectedItem(itemId);
                                                    setAction("item-target");
                                                }}
                                                className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 border border-slate-600 rounded p-2 text-left text-xs"
                                            >
                                                <div className="text-slate-200 font-medium">
                                                    {recipe?.name}
                                                </div>
                                                <div className="text-slate-400">残り{qty}個</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {action === "item-target" && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setAction("item")}
                                    className="text-xs text-slate-400 hover:text-white border border-slate-600 px-2 py-1 rounded"
                                >
                                    ← 戻る
                                </button>
                                <span className="text-xs text-slate-400">
                                    ↑ 対象キャラクターを選択
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center text-sm text-slate-500 py-1">敵のターン...</div>
                )}
            </div>
        </div>
    );
}
