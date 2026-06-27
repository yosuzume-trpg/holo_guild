"use client";

import { useState, useEffect } from "react";
import type { CharacterInstance, EnemyInstance, Buff, StageType } from "@/types/game";
import { getCharacterMaster } from "@/data/characters";
import { getEquipment, EQUIPMENT_MASTERS } from "@/data/equipment";
import { getDungeonMaterials } from "@/data/materials";
import { DUNGEON_ITEMS } from "@/data/recipes";
import { useGameStore } from "@/store/gameStore";
import { useCharacterStore } from "@/store/characterStore";
import { useInventoryStore } from "@/store/inventoryStore";
import { useDungeonStore } from "@/store/dungeonStore";
import type { StoredBattle } from "@/store/dungeonStore";
import { calcCharacterStats, calcMaxHp } from "@/utils/characterStats";
import {
    DUNGEON_STAGE_COUNT,
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
    ENEMY_TURN_DELAY_MS,
    DUNGEON_BRANCH_CHANCE,
} from "@/data/constants";
import {
    type EnemyTypeKey,
    ENEMY_EXP,
    calcDmg,
    attrMult,
    multStr,
    makeEnemies,
    buildTurnOrder,
    buffedStat,
    charEquipAttr,
    generateStageTypes,
} from "@/utils/dungeonBattle";

type BattleState = StoredBattle;

export type ActionMode = "menu" | "attack" | "magic" | "item" | "item-target";

export function useDungeonBattle(dl: number) {
    const addGold = useGameStore((s) => s.addGold);
    const guildRank = useGameStore((s) => s.guildRank);
    const characters = useCharacterStore((s) => s.characters);
    const gainBattleExp = useCharacterStore((s) => s.gainBattleExp);
    const updateCurrentHp = useCharacterStore((s) => s.updateCurrentHp);
    const clearDungeon = useDungeonStore((s) => s.clearDungeon);
    const addRecruitPoints = useDungeonStore((s) => s.addRecruitPoints);
    const maxCleared = useDungeonStore((s) => s.maxClearedLevel);
    const storedBattle = useDungeonStore((s) => s.activeBattle);
    const setActiveBattle = useDungeonStore((s) => s.setActiveBattle);
    const invEquipment = useInventoryStore((s) => s.equipment);

    const [partyIds, setPartyIds] = useState<string[]>([]);
    const [dungeonItems, setDungeonItems] = useState<Record<string, number>>({});
    const [bs, setBs] = useState<BattleState | null>(() =>
        storedBattle?.dungeonLevel === dl ? storedBattle : null,
    );
    const [action, setAction] = useState<ActionMode>("menu");
    const [selectedItem, setSelectedItem] = useState("");
    const [result, setResult] = useState<"clear" | "wipe" | "retreat" | null>(null);
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

    // 攻略中に持ち込むアイテム在庫のスナップショット（各アイテム最大5個）
    function snapshotDungeonItems(): Record<string, number> {
        const inv = useInventoryStore.getState();
        const items: Record<string, number> = {};
        for (const id of DUNGEON_ITEMS) items[id] = Math.min(inv.materials[id] ?? 0, 5);
        return items;
    }

    // ダンジョン終了時（クリア・全滅・撤退）に対象パーティのHPを全快させる。
    // gainBattleExp 直後に呼ばれるため、レベルアップ後の最新ステータスをストアから読む
    // （クロージャの characters は更新前で、古い最大HPに巻き戻ってしまうため）。
    function restorePartyHp(ids: string[]) {
        const latest = useCharacterStore.getState().characters;
        const equip = useInventoryStore.getState().equipment;
        for (const id of ids) {
            const c = latest.find((x) => x.id === id);
            if (c) updateCurrentHp(id, calcMaxHp(c, equip));
        }
    }

    // Restore item inventory snapshot when resuming
    useEffect(() => {
        if (storedBattle?.dungeonLevel === dl && !result) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDungeonItems(snapshotDungeonItems());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync battle state to store on every change
    useEffect(() => {
        if (bs && !result) setActiveBattle(bs);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bs]);

    // 敵のターンを少し時間をかけて解決する。"enemy-action" の間は行動中の敵を表示し、
    // ENEMY_TURN_DELAY_MS 経過後に1体ぶんだけ処理する。処理後は advanceTurn で次のスロットへ
    // 進み、それが再び敵なら同じフローが繰り返される（1体ずつ順番に行動）。
    useEffect(() => {
        if (!bs || result || bs.battlePhase !== "enemy-action") return;
        const slot = bs.turnOrder[bs.currentTurnIndex];
        if (!slot || slot.isPlayer) return;
        const enemy = bs.enemies.find((e) => e.id === slot.id);
        if (!enemy || enemy.hp <= 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setBs(advanceTurn(bs));
            return;
        }
        const timer = setTimeout(() => {
            setBs(processEnemyTurn(bs, bs.currentTurnIndex, enemy));
        }, ENEMY_TURN_DELAY_MS);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bs, result]);

    // ── Party selection ─────────────────────────────────────────────────────
    function toggleParty(id: string) {
        setPartyIds((p) =>
            p.includes(id) ? p.filter((x) => x !== id) : p.length < 5 ? [...p, id] : p,
        );
    }

    // 挑戦できる最大DL: クリア済みの次のレベル、ただし GR×10 が上限（dungeon 一覧と同じ規則）。
    // 直接URL遷移などで上限を超えたDLを攻略・クリアできてしまう不具合の防止に使う。
    const unlockedMax = Math.min(maxCleared + 1, guildRank * 10);
    const isLocked = !Number.isFinite(dl) || dl < 1 || dl > unlockedMax;

    function startDungeon() {
        if (partyIds.length === 0 || isLocked) return;
        const stageTypes = generateStageTypes(dl);

        // Snapshot item inventory
        setDungeonItems(snapshotDungeonItems());

        // Snapshot party HP
        const partyHps: Record<string, number> = {};
        for (const id of partyIds) {
            const c = characters.find((x) => x.id === id)!;
            partyHps[id] = c.currentHp;
        }

        const stageType = stageTypes[0];
        const enemies = stageType === "battle" ? makeEnemies(stageType, dl) : [];
        const turnOrder =
            enemies.length > 0 ? buildTurnOrder(partyIds, characters, enemies, invEquipment) : [];
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
            turnOrder,
            currentTurnIndex: 0,
            // 先頭スロットが敵なら enemy-action として開始し、useEffect が処理する
            battlePhase:
                enemies.length === 0
                    ? "result"
                    : turnOrder[0]?.isPlayer
                      ? "player-action"
                      : "enemy-action",
            log: [`ダンジョン Lv.${dl} 開始！`],
        };
        setBs(initialBs);
    }

    // ── Stage advancement ───────────────────────────────────────────────────
    // NOTE: advanceStage must NOT call handleClear (Zustand set inside React setState updater)
    // The caller is responsible for checking currentStage + 1 >= DUNGEON_STAGE_COUNT and calling handleClear directly.
    function advanceStage(state: BattleState): BattleState {
        const nextStage = state.currentStage + 1;
        if (nextStage >= DUNGEON_STAGE_COUNT) return state; // safety guard; caller should not reach here

        const nextType = state.stageTypes[nextStage];
        const newLog = [...state.log];
        const newLoot = { ...state.loot, materials: { ...state.loot.materials } };
        const newHps = { ...state.partyHps };

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
        const turnOrder =
            enemies.length > 0
                ? buildTurnOrder(state.partyIds, characters, enemies, invEquipment)
                : [];

        const next: BattleState = {
            ...state,
            currentStage: nextStage,
            stageType: nextType,
            enemies,
            partyHps: newHps,
            loot: newLoot,
            turnOrder,
            currentTurnIndex: 0,
            // 先頭スロットが敵なら enemy-action として開始し、useEffect が処理する
            battlePhase:
                enemies.length === 0
                    ? "result"
                    : turnOrder[0]?.isPlayer
                      ? "player-action"
                      : "enemy-action",
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
        restorePartyHp(state.partyIds);
        clearDungeon(dl);
        // Recruit points: 1 per party member's region
        for (const id of state.partyIds) {
            const c = characters.find((x) => x.id === id)!;
            const master = getCharacterMaster(c.masterId);
            if (master) addRecruitPoints(master.region, 1);
        }
        setActiveBattle(null);
        setResult("clear");
        return state;
    }

    // ── Turn advancement ────────────────────────────────────────────────────
    // 次に行動する生存スロットへ進める。敵の番は即座に解決せず "enemy-action" に移行し、
    // 行動中の敵を可視化する。実際の処理は useEffect が ENEMY_TURN_DELAY_MS 後に行う。
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
                    return { ...state, currentTurnIndex: idx, battlePhase: "enemy-action" };
                }
            }
            idx = (idx + 1) % len;
            attempts++;
        }
        return state;
    }

    // パーティ全滅時の共通処理（HP全快 + 状態リセット + wipe 結果）
    function applyWipe(state: BattleState): BattleState {
        restorePartyHp(state.partyIds);
        setActiveBattle(null);
        setResult("wipe");
        return state;
    }

    function processEnemyTurn(state: BattleState, idx: number, enemy: EnemyInstance): BattleState {
        const aliveParty = state.partyIds.filter((id) => (state.partyHps[id] ?? 0) > 0);
        if (aliveParty.length === 0) {
            return applyWipe(state);
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
        const armorAttr = charEquipAttr(target, "armor", invEquipment);
        const mult = attrMult(enemy.attribute, armorAttr);
        const defBuff = buffs
            .filter((b) => b.type === "def" && b.turnsRemaining > 0)
            .reduce((s, b) => s + b.percent / 100, 0);
        const dmg = Math.max(1, Math.floor(dmgRaw * mult * (1 - defBuff)));

        const newHp = Math.max(0, (state.partyHps[targetId] ?? target.stats.hp) - dmg);
        const newHps = { ...state.partyHps, [targetId]: newHp };

        const tname = getCharacterMaster(target.masterId)?.name ?? targetId;
        const newLog = [
            ...state.log,
            `🔴 ${enemy.type} → ${tname} に${usesMag ? "魔法" : "物理"}${dmg}ダメージ${multStr(mult)}`,
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
            return applyWipe(newState);
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
        const wAttr = charEquipAttr(attacker, "weapon", invEquipment);
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
        const aname = getCharacterMaster(attacker.masterId)?.name ?? attacker.id;
        const newLog = [
            ...bs.log,
            `${aname} → ${enemy.type} に${usesMagic ? "魔法" : "物理"}${dmg}ダメージ${multStr(mult)}`,
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

        const newHps = { ...bs.partyHps };
        const newBuffs = { ...bs.partyBuffs };
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
        restorePartyHp(bs.partyIds);
        setActiveBattle(null);
        setResult("retreat");
    }

    function proceedToStage(bsState: BattleState) {
        // advanceStage が先頭が敵なら enemy-action を設定するので、敵ターンは useEffect が処理する
        setBs(advanceStage(bsState));
    }

    function handleNextStage() {
        if (!bs) return;
        const nextStage = bs.currentStage + 1;
        if (nextStage >= DUNGEON_STAGE_COUNT) return;

        // 最終ステージ（ボス）は分岐させず固定にする
        if (nextStage < DUNGEON_STAGE_COUNT - 1 && Math.random() < DUNGEON_BRANCH_CHANCE) {
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

    return {
        dl,
        guildRank,
        characters,
        invEquipment,
        partyIds,
        dungeonItems,
        bs,
        action,
        setAction,
        selectedItem,
        setSelectedItem,
        result,
        pendingBranch,
        unlockedMax,
        isLocked,
        getEquipName,
        effectiveStats,
        toggleParty,
        startDungeon,
        handleClear,
        handleAttack,
        handleUseItem,
        handleRetreat,
        handleNextStage,
        selectBranch,
    };
}

export type DungeonBattle = ReturnType<typeof useDungeonBattle>;
