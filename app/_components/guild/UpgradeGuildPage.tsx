"use client";

import { useState } from "react";
import type { EquipmentInstance, EquipmentSlot } from "@/types/game";
import { EQUIPMENT_MASTERS } from "@/data/equipment";
import { getMaterial } from "@/data/materials";
import { useGameStore } from "@/store/gameStore";
import { useInventoryStore } from "@/store/inventoryStore";
import { useCharacterStore } from "@/store/characterStore";
import { getCharacterMaster } from "@/data/characters";
import {
    EQUIP_UPGRADE_MAT_FACTOR,
    EQUIP_UPGRADE_GOLD_FACTOR,
} from "@/data/constants";
import ItemIcon from "@/app/_components/facility/ItemIcon";

interface Props {
    mode: "blacksmith" | "tailor";
}

const SLOTS_BY_MODE: Record<Props["mode"], EquipmentSlot[]> = {
    blacksmith: ["weapon", "tool"],
    tailor: ["armor", "accessory"],
};

const SLOT_LABEL: Record<EquipmentSlot, string> = {
    weapon: "武器",
    armor: "防具",
    accessory: "アクセサリー",
    tool: "道具",
};

const MATERIAL_BY_SLOT: Record<EquipmentSlot, string | null> = {
    weapon: "monstertooth",
    tool: "monstertooth",
    armor: "monsterhide",
    accessory: "monsterhide",
};

// 描画・選択用エントリ。未装備は (masterId, starRank) でまとめ、装備中は個別。
type Entry =
    | {
          kind: "group";
          key: string;
          masterId: string;
          starRank: number;
          count: number;
          instanceIds: string[];
      }
    | {
          kind: "equipped";
          key: string;
          masterId: string;
          starRank: number;
          instanceId: string;
          who: { name: string; starRank: number };
      };

// 1段階の合成コスト（入力★ランク基準）。手動合成と同じ係数。
const stepGold = (rank: number) => EQUIP_UPGRADE_GOLD_FACTOR * rank;
const stepMat = (rank: number) => EQUIP_UPGRADE_MAT_FACTOR * rank;

// 解体で得られる素材数。★1→1, ★2→2, ★3→4 …（1×2^(★-1)）。
const dismantleYield = (rank: number) => 2 ** (rank - 1);

type Plan = {
    // 消費する未装備ピースの「ランク → 個数」
    consumed: Record<number, number>;
    gold: number;
    mat: number;
};

/**
 * survivor（rank=survivorRank）を targetRank まで一括ランクアップする計画を立てる。
 * counts は未装備の重複ピースの「ランク → 個数」。
 * 途中の全合成ステップ（survivor のランクアップ＋パートナー生成）のコストを合算する
 * （＝手動でペア合成を繰り返したのと同額）。到達不能なら null。
 */
function planRankUp(
    survivorRank: number,
    counts: Record<number, number>,
    targetRank: number,
): Plan | null {
    if (targetRank <= survivorRank) return null;
    const working: Record<number, number> = { ...counts };
    const consumed: Record<number, number> = {};
    let gold = 0;
    let mat = 0;

    // rank のピースを1個確保する。在庫があれば消費、無ければ下位2個を合成して作る。
    const obtain = (r: number): boolean => {
        if (r < 1) return false;
        if ((working[r] ?? 0) > 0) {
            working[r]--;
            consumed[r] = (consumed[r] ?? 0) + 1;
            return true;
        }
        if (!obtain(r - 1) || !obtain(r - 1)) return false;
        gold += stepGold(r - 1);
        mat += stepMat(r - 1);
        return true;
    };

    // survivor を rS → rS+1 → … → targetRank へ。各段でパートナーを1個用意して合成。
    for (let r = survivorRank; r < targetRank; r++) {
        if (!obtain(r)) return null;
        gold += stepGold(r);
        mat += stepMat(r);
    }
    return { consumed, gold, mat };
}

// counts で到達できる最大★ランク。
function maxReachableRank(
    survivorRank: number,
    counts: Record<number, number>,
): number {
    let t = survivorRank;
    while (planRankUp(survivorRank, counts, t + 1)) t++;
    return t;
}

// ピース配列を「ランク → 個数」に集計。
function rankCounts(pieces: EquipmentInstance[]): Record<number, number> {
    const c: Record<number, number> = {};
    for (const e of pieces) c[e.starRank] = (c[e.starRank] ?? 0) + 1;
    return c;
}

// 計画の consumed（ランク別個数）を実際の instanceId 配列へ割り当てる。
function pickConsumedIds(
    pieces: EquipmentInstance[],
    consumed: Record<number, number>,
): string[] {
    const byRank = new Map<number, string[]>();
    for (const e of pieces) {
        const arr = byRank.get(e.starRank);
        if (arr) arr.push(e.instanceId);
        else byRank.set(e.starRank, [e.instanceId]);
    }
    const ids: string[] = [];
    for (const [r, n] of Object.entries(consumed)) {
        const arr = byRank.get(Number(r)) ?? [];
        ids.push(...arr.slice(0, n));
    }
    return ids;
}

export default function UpgradeGuildPage({ mode }: Props) {
    const slots = SLOTS_BY_MODE[mode];
    const [activeSlot, setActiveSlot] = useState<EquipmentSlot>(slots[0]);
    // 選択キー: 'grp:<masterId>:<starRank>' | 'inst:<instanceId>' | ''
    const [sel, setSel] = useState<string>("");
    // 目標★ランク。選択時は大きな値にして実効値を最大に張り付け、ステッパーで下げる。
    const [targetRank, setTargetRank] = useState<number>(99);

    const gold = useGameStore((s) => s.gold);
    const spendGold = useGameStore((s) => s.spendGold);
    const equipment = useInventoryStore((s) => s.equipment);
    const materials = useInventoryStore((s) => s.materials);
    const removeMaterial = useInventoryStore((s) => s.removeMaterial);
    const addMaterial = useInventoryStore((s) => s.addMaterial);
    const removeEquipment = useInventoryStore((s) => s.removeEquipment);
    const mergeEquipmentTo = useInventoryStore((s) => s.mergeEquipmentTo);
    const characters = useCharacterStore((s) => s.characters);

    // instanceId → 装備中キャラ情報
    const equippedBy = new Map<string, { name: string; starRank: number }>();
    for (const char of characters) {
        for (const iid of Object.values(char.equipment)) {
            if (iid)
                equippedBy.set(iid, {
                    name: getCharacterMaster(char.masterId)?.name ?? "?",
                    starRank: char.starRank,
                });
        }
    }

    const slotEquip = equipment.filter(
        (e) =>
            EQUIPMENT_MASTERS.find((m) => m.id === e.masterId)?.slot ===
            activeSlot,
    );

    // 未装備をグループ化
    const groupMap = new Map<string, Extract<Entry, { kind: "group" }>>();
    for (const e of slotEquip) {
        if (equippedBy.has(e.instanceId)) continue;
        const key = `grp:${e.masterId}:${e.starRank}`;
        const g = groupMap.get(key) ?? {
            kind: "group" as const,
            key,
            masterId: e.masterId,
            starRank: e.starRank,
            count: 0,
            instanceIds: [],
        };
        g.count++;
        g.instanceIds.push(e.instanceId);
        groupMap.set(key, g);
    }

    // 装備中（個別）
    const equippedEntries: Entry[] = slotEquip
        .filter((e) => equippedBy.has(e.instanceId))
        .map((e) => ({
            kind: "equipped",
            key: `inst:${e.instanceId}`,
            masterId: e.masterId,
            starRank: e.starRank,
            instanceId: e.instanceId,
            who: equippedBy.get(e.instanceId)!,
        }));

    const entries: Entry[] = [...groupMap.values(), ...equippedEntries].sort(
        (a, b) => {
            const na =
                EQUIPMENT_MASTERS.find((m) => m.id === a.masterId)?.name ?? "";
            const nb =
                EQUIPMENT_MASTERS.find((m) => m.id === b.masterId)?.name ?? "";
            return na.localeCompare(nb, "ja") || a.starRank - b.starRank;
        },
    );

    // エントリを survivor とみなしたときの分析（消費プール・到達可能ランク等）。
    function analyze(entry: Entry) {
        const survivorId =
            entry.kind === "group" ? entry.instanceIds[0] : entry.instanceId;
        const survivorRank = entry.starRank;
        // 消費できるのは「未装備・同 masterId・survivor 以外」のピース。
        const freePieces = slotEquip.filter(
            (e) =>
                !equippedBy.has(e.instanceId) &&
                e.masterId === entry.masterId &&
                e.instanceId !== survivorId,
        );
        const counts = rankCounts(freePieces);
        const reachable = maxReachableRank(survivorRank, counts);
        // 装備中 survivor は装備キャラの★ランクまでに制限（それ以上は装備できなくなるため）。
        const charCap =
            entry.kind === "equipped" ? entry.who.starRank : Infinity;
        const maxTarget = Math.min(reachable, charCap);
        return {
            survivorId,
            survivorRank,
            freePieces,
            counts,
            reachable,
            charCap,
            maxTarget,
        };
    }

    const selectedEntry = entries.find((e) => e.key === sel) ?? null;
    const matId = MATERIAL_BY_SLOT[activeSlot];
    const matHave = matId ? (materials[matId] ?? 0) : 0;

    const a = selectedEntry ? analyze(selectedEntry) : null;
    // 実効目標★：選択中の範囲 [survivorRank+1, maxTarget] にクランプ。
    const effectiveTarget = a ? Math.min(targetRank, a.maxTarget) : 0;
    const plan =
        a && matId && effectiveTarget > a.survivorRank
            ? planRankUp(a.survivorRank, a.counts, effectiveTarget)
            : null;
    const canRankUp = !!(plan && gold >= plan.gold && matHave >= plan.mat);

    function selectEntry(entry: Entry) {
        if (entry.key === sel) {
            setSel("");
            return;
        }
        setSel(entry.key);
        setTargetRank(99); // 実効値を最大に張り付ける
    }

    function handleRankUp() {
        if (!selectedEntry || !a || !plan || !matId) return;
        if (gold < plan.gold || matHave < plan.mat) return;
        const consumedIds = pickConsumedIds(a.freePieces, plan.consumed);
        if (!spendGold(plan.gold)) return;
        if (!removeMaterial(matId, plan.mat)) return;
        mergeEquipmentTo(a.survivorId, consumedIds, effectiveTarget);
        // 選択は維持。まだランクアップ可能なら続行でき、不可になれば自動的に閉じる。
    }

    // 未装備の重複から1個を解体し、★ランクに応じた素材を取得する。
    function handleDismantle() {
        if (!selectedEntry || selectedEntry.kind !== "group" || !matId) return;
        const pieceId = selectedEntry.instanceIds[0];
        if (!pieceId) return;
        removeEquipment(pieceId);
        addMaterial(matId, dismantleYield(selectedEntry.starRank));
        // 在庫が尽きてグループが消えたら、selectedEntry が null になりパネルは自動で閉じる。
    }

    return (
        <div className="p-4 space-y-4">
            <h1 className="text-lg font-bold text-ink">
                {mode === "blacksmith" ? "鍛冶ギルド" : "仕立屋ギルド"}
            </h1>

            {/* Slot tabs */}
            <div className="flex gap-2">
                {slots.map((s) => (
                    <button
                        key={s}
                        onClick={() => {
                            setActiveSlot(s);
                            setSel("");
                        }}
                        className={`flex-1 text-sm py-2 rounded border transition-colors ${
                            activeSlot === s
                                ? "border-accent-strong text-accent-strong bg-surface"
                                : "border-line text-ink-muted hover:border-line-strong"
                        }`}
                    >
                        {SLOT_LABEL[s]}
                    </button>
                ))}
            </div>

            <div className="text-sm text-ink-muted">
                強化したい装備をタップし、目標★ランクを選んで一括ランクアップします（未装備の同名の重複を消費します）。
            </div>

            {/* Equipment cards */}
            {entries.length === 0 ? (
                <p className="text-sm text-ink-subtle text-center py-6">
                    装備がありません
                </p>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    {entries.map((entry) => {
                        const master = EQUIPMENT_MASTERS.find(
                            (m) => m.id === entry.masterId,
                        );
                        const info = analyze(entry);
                        const canRank = info.maxTarget > entry.starRank;
                        // 未装備グループは解体できるので常に選択可。装備中はランクアップ可能時のみ。
                        const selectable = entry.kind === "group" || canRank;
                        const isSelected = entry.key === sel;
                        // 装備キャラ★で頭打ちか（重複は足りるが装備上限で不可）。
                        const cappedByChar =
                            entry.kind === "equipped" &&
                            info.reachable > entry.starRank &&
                            !canRank;
                        return (
                            <button
                                key={entry.key}
                                type="button"
                                disabled={!selectable}
                                onClick={() => selectEntry(entry)}
                                className={`flex items-center gap-2 h-20 text-left rounded-lg p-2 border transition-colors ${
                                    !selectable
                                        ? "border-line bg-surface opacity-40 cursor-not-allowed"
                                        : isSelected
                                          ? "border-accent-strong bg-surface-2"
                                          : "border-line bg-surface hover:border-accent-strong"
                                }`}
                            >
                                <div className="relative w-12 aspect-5/4 shrink-0 self-center">
                                    <ItemIcon
                                        id={entry.masterId}
                                        alt={master?.name ?? ""}
                                    />
                                    {entry.kind === "group" &&
                                        entry.count > 1 && (
                                            <span className="absolute -top-1 -right-1 bg-accent-strong text-ink text-[10px] font-bold rounded-full px-1 leading-tight">
                                                ×{entry.count}
                                            </span>
                                        )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-semibold text-ink truncate">
                                        ★{entry.starRank} {master?.name}
                                    </div>
                                    <div className="text-[10px] text-success truncate">
                                        {master?.baseEffectLabel}
                                    </div>
                                    {entry.kind === "equipped" && (
                                        <div className="text-[10px] text-accent-strong truncate">
                                            {entry.who.name}（★
                                            {entry.who.starRank}）装備中
                                        </div>
                                    )}
                                    <div className="text-[10px] text-ink-subtle">
                                        {canRank
                                            ? `最大 ★${info.maxTarget} まで`
                                            : entry.kind === "group"
                                              ? "解体のみ可"
                                              : cappedByChar
                                                ? "装備★上限に到達"
                                                : "重複なし（合成不可）"}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Action panel（下部固定バー） */}
            {selectedEntry && a && (
                <div className="sticky bottom-0 z-10 -mx-4 -mb-4 px-4 pt-3 pb-4 bg-app border-t border-line space-y-2">
                    <button
                        type="button"
                        onClick={() => setSel("")}
                        aria-label="閉じる"
                        className="absolute top-2 right-3 w-6 h-6 flex items-center justify-center rounded text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors"
                    >
                        ✕
                    </button>
                    <div className="text-sm text-ink pr-8">
                        ★{a.survivorRank}{" "}
                        {
                            EQUIPMENT_MASTERS.find(
                                (m) => m.id === selectedEntry.masterId,
                            )?.name
                        }
                    </div>

                    {plan && (
                        <>
                            {/* 目標★ステッパー */}
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-ink-muted">
                                    目標★
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setTargetRank(
                                                Math.max(
                                                    a.survivorRank + 1,
                                                    effectiveTarget - 1,
                                                ),
                                            )
                                        }
                                        disabled={
                                            effectiveTarget <=
                                            a.survivorRank + 1
                                        }
                                        className="w-7 h-7 flex items-center justify-center rounded border border-line text-ink disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-2"
                                    >
                                        −
                                    </button>
                                    <span className="text-base font-bold text-ink w-12 text-center">
                                        ★{effectiveTarget}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setTargetRank(
                                                Math.min(
                                                    a.maxTarget,
                                                    effectiveTarget + 1,
                                                ),
                                            )
                                        }
                                        disabled={
                                            effectiveTarget >= a.maxTarget
                                        }
                                        className="w-7 h-7 flex items-center justify-center rounded border border-line text-ink disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-2"
                                    >
                                        ＋
                                    </button>
                                </div>
                                <span className="text-[11px] text-ink-subtle">
                                    最大 ★{a.maxTarget}
                                    {selectedEntry.kind === "equipped" &&
                                        a.reachable > a.charCap && (
                                            <>（装備★上限）</>
                                        )}
                                </span>
                            </div>

                            <div className="text-xs text-ink-muted space-y-0.5">
                                <div>
                                    消費:{" "}
                                    {Object.entries(plan.consumed)
                                        .sort(
                                            ([r1], [r2]) =>
                                                Number(r1) - Number(r2),
                                        )
                                        .map(([r, n]) => `★${r}×${n}`)
                                        .join(" ") || "なし"}
                                </div>
                                <div>
                                    必要素材: {getMaterial(matId ?? "")?.name} ×{" "}
                                    <span
                                        className={
                                            matHave < plan.mat
                                                ? "text-danger"
                                                : ""
                                        }
                                    >
                                        {plan.mat}
                                    </span>
                                    <span className="text-ink-subtle">
                                        （所持: {matHave}）
                                    </span>
                                </div>
                                <div>
                                    費用:{" "}
                                    <span
                                        className={
                                            gold < plan.gold
                                                ? "text-danger"
                                                : ""
                                        }
                                    >
                                        {plan.gold.toLocaleString()}G
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={handleRankUp}
                                disabled={!canRankUp}
                                className="w-full bg-accent hover:bg-accent-strong disabled:opacity-40 disabled:cursor-not-allowed text-ink font-bold py-2 rounded-lg text-sm transition-colors"
                            >
                                ★{effectiveTarget} にランクアップ
                            </button>
                        </>
                    )}

                    {/* 解体（未装備の重複から1個ずつ）。★に応じて素材を取得。 */}
                    {selectedEntry.kind === "group" && matId && (
                        <button
                            onClick={handleDismantle}
                            className="w-full bg-surface-2 hover:bg-surface-3 border border-line-strong text-ink font-bold py-2 rounded-lg text-sm transition-colors"
                        >
                            解体（1個）→ {getMaterial(matId)?.name} ×
                            {dismantleYield(selectedEntry.starRank)}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
