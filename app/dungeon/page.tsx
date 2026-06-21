"use client";

import { useState } from "react";
import Link from "next/link";
import { getDungeonMaterials, getMaterial } from "@/data/materials";
import { getCharacterMaster } from "@/data/characters";
import { useGameStore } from "@/store/gameStore";
import { useCharacterStore } from "@/store/characterStore";
import { useDungeonStore } from "@/store/dungeonStore";
import { useFacilityStore } from "@/store/facilityStore";
import {
    BATTLE_GOLD_BOSS_FACTOR,
    GR_FACILITY_LEVEL_CAP,
    PROD_DL_BONUS_PER_LEVEL,
} from "@/data/constants";

export default function DungeonPage() {
    const guildRank = useGameStore((s) => s.guildRank);
    const gold = useGameStore((s) => s.gold);
    const spendGold = useGameStore((s) => s.spendGold);
    const characters = useCharacterStore((s) => s.characters);
    const setAssignment = useCharacterStore((s) => s.setAssignment);
    const maxCleared = useDungeonStore((s) => s.maxClearedLevel);
    const clearedLevels = useDungeonStore((s) => s.clearedLevels);
    const dungeonFacility = useFacilityStore((s) => s.dungeon);
    const getSlotCount = useFacilityStore((s) => s.getSlotCount);
    const getUpgradeCost = useFacilityStore((s) => s.getUpgradeCost);
    const expandDungeon = useFacilityStore((s) => s.expandDungeon);

    const [tab, setTab] = useState<"challenge" | "auto">("challenge");

    // Levels unlocked: 1 always, then next after each clear.
    // 挑戦できるDLは GR×10 まで（GR1なら最大DL10）。
    const unlockedMax = Math.min(maxCleared + 1, guildRank * 10);
    const challengeLevels = Array.from({ length: unlockedMax }, (_, i) => i + 1);

    // Auto-grind: characters assigned to dungeon
    const autoChars = characters.filter((c) => c.assignment?.type === "dungeon");
    const availableChars = characters.filter((c) => c.assignment === null);

    // 自動周回の配置枠（初期3・拡張で+1・上限GR×10）
    const slotCount = getSlotCount("dungeon");
    const maxExpansion = guildRank * GR_FACILITY_LEVEL_CAP;
    const expandCost = getUpgradeCost(dungeonFacility.expansionLevel + 1);
    const expandAtMax = dungeonFacility.expansionLevel >= maxExpansion;
    const slotsFull = autoChars.length >= slotCount;

    // Available dungeon materials based on cleared level
    const availableMats = getDungeonMaterials(maxCleared);

    // GR upgrade check (every 10 DL)
    const nextGrDl = guildRank * 10;

    return (
        <div className="flex flex-col h-full">
            <div className="flex border-b border-line bg-surface shrink-0">
                <button
                    onClick={() => setTab("challenge")}
                    className={`flex-1 py-2 text-sm border-b-2 transition-colors ${tab === "challenge" ? "border-accent-strong text-accent-strong" : "border-transparent text-ink-muted"}`}
                >
                    ダンジョン攻略
                </button>
                <button
                    onClick={() => setTab("auto")}
                    className={`flex-1 py-2 text-sm border-b-2 transition-colors ${tab === "auto" ? "border-accent-strong text-accent-strong" : "border-transparent text-ink-muted"}`}
                >
                    自動周回
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {tab === "challenge" && (
                    <div className="flex flex-col items-center space-y-3">
                        <div className="text-xs text-ink-muted">
                            最高クリア: {maxCleared > 0 ? `DL ${maxCleared}` : "なし"} ／ GR
                            {guildRank} (次のGRはDL{nextGrDl}クリアで解放)
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {challengeLevels.reverse().map((lv) => {
                                const cleared = clearedLevels.includes(lv);
                                return (
                                    <Link
                                        key={lv}
                                        href={`/dungeon/${lv}`}
                                        className="flex w-80 h-24 items-center justify-between bg-surface border border-line hover:border-accent-strong rounded-xl p-4 transition-colors"
                                    >
                                        <div>
                                            <div className="font-semibold text-ink">
                                                ダンジョン Lv.{lv}
                                            </div>
                                            <div className="text-xs text-ink-muted mt-0.5">
                                                敵Lv: ~{lv * 10} ／ ボス撃破:{" "}
                                                {lv * BATTLE_GOLD_BOSS_FACTOR}G
                                                {cleared && (
                                                    <span className="ml-2 text-success">
                                                        ✓ クリア済み
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-accent-strong text-lg">→</div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {tab === "auto" && (
                    <div className="space-y-4">
                        <div className="text-xs text-ink-muted">
                            クリア済みダンジョンにキャラクターを配置すると、自動で素材を収集します。
                            {maxCleared === 0 && (
                                <span className="text-accent-strong ml-1">
                                    まずダンジョンをクリアしてください。
                                </span>
                            )}
                        </div>

                        {maxCleared > 0 && (
                            <>
                                {/* 配置枠の拡張 */}
                                <div className="bg-surface rounded-lg p-3 text-sm space-y-1">
                                    <div className="flex justify-between text-ink">
                                        <span>枠数</span>
                                        <span className="font-semibold">
                                            {slotCount}{" "}
                                            <span className="text-xs text-ink-subtle">
                                                (上限 GR×10={maxExpansion})
                                            </span>
                                        </span>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={() => {
                                                if (spendGold(expandCost)) expandDungeon();
                                            }}
                                            disabled={gold < expandCost || expandAtMax}
                                            className="flex-1 text-xs bg-surface-2 hover:bg-surface-3 disabled:opacity-40 disabled:cursor-not-allowed border border-line-strong rounded py-1.5 transition-colors"
                                        >
                                            {expandAtMax
                                                ? "拡張上限"
                                                : `拡張 (${expandCost.toLocaleString()}G)`}
                                        </button>
                                    </div>
                                </div>

                                <div className="text-sm text-ink-muted mb-1">
                                    配置中のキャラクター ({autoChars.length}/{slotCount}人)
                                </div>
                                <div className="space-y-2">
                                    {autoChars.map((char) => {
                                        const master = getCharacterMaster(char.masterId);
                                        const asgn = char.assignment as Extract<
                                            typeof char.assignment,
                                            { type: "dungeon" }
                                        >;
                                        const mat = getMaterial(asgn.materialId);
                                        return (
                                            <div
                                                key={char.id}
                                                className="bg-surface border border-line rounded-lg p-3 flex items-center gap-3"
                                            >
                                                <div className="w-9 h-9 rounded-full bg-surface-3 flex items-center justify-center text-sm font-bold text-ink shrink-0">
                                                    {master?.name.slice(0, 1) ?? "?"}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-semibold text-ink truncate">
                                                        {master?.name}
                                                    </div>
                                                    <div className="text-xs text-ink-muted">
                                                        DL{asgn.level} →{" "}
                                                        {mat?.name ?? asgn.materialId}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setAssignment(char.id, null)}
                                                    className="text-xs text-ink-subtle hover:text-danger shrink-0"
                                                >
                                                    解除
                                                </button>
                                            </div>
                                        );
                                    })}

                                    {slotsFull ? (
                                        <div className="w-full bg-surface border border-dashed border-line rounded-lg p-3 text-ink-subtle text-sm text-center">
                                            配置枠が上限です（拡張で増やせます）
                                        </div>
                                    ) : availableChars.length > 0 ? (
                                        <AutoAssignButton
                                            availableChars={availableChars}
                                            maxCleared={maxCleared}
                                            availableMats={availableMats}
                                            onAssign={(charId, level, materialId) =>
                                                setAssignment(charId, {
                                                    type: "dungeon",
                                                    level,
                                                    materialId,
                                                })
                                            }
                                        />
                                    ) : null}
                                </div>

                                <div className="text-sm text-ink-muted">入手可能な素材</div>
                                <div className="grid grid-cols-2 gap-2">
                                    {availableMats.map((mat) => (
                                        <div
                                            key={mat.id}
                                            className="bg-surface border border-line rounded-lg p-2 text-sm"
                                        >
                                            <div className="text-ink">{mat.name}</div>
                                            <div className="text-xs text-ink-muted">
                                                {mat.ratePerMin}/分・{mat.price}G
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function AutoAssignButton({
    availableChars,
    maxCleared,
    availableMats,
    onAssign,
}: {
    availableChars: ReturnType<typeof useCharacterStore.getState>["characters"];
    maxCleared: number;
    availableMats: ReturnType<typeof getDungeonMaterials>;
    onAssign: (charId: string, level: number, materialId: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [charId, setCharId] = useState(availableChars[0]?.id ?? "");
    const [level, setLevel] = useState(maxCleared);
    const [matId, setMatId] = useState(availableMats[0]?.id ?? "");

    // 配置できるのは「そのDL以上の戦闘レベル」のキャラのみ。
    // → あるキャラが周回できる最大DL = min(クリア済み最大DL, そのキャラの戦闘レベル)
    const selectedChar = availableChars.find((c) => c.id === charId);
    const battleLevel = selectedChar?.battleLevel ?? 1;
    const maxAssignableDl = Math.max(1, Math.min(maxCleared, battleLevel));
    const effectiveLevel = Math.min(Math.max(level, 1), maxAssignableDl);

    // 収集できる素材は配置するDLのDL帯に従う
    const levelMats = getDungeonMaterials(effectiveLevel);
    // 選択中の素材が現在のDL帯に無ければ先頭へ補正
    const effectiveMatId = levelMats.some((m) => m.id === matId) ? matId : (levelMats[0]?.id ?? "");

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="w-full bg-surface border border-dashed border-line hover:border-accent-strong rounded-lg p-3 text-ink-subtle hover:text-ink text-sm transition-colors text-center"
            >
                ＋ キャラクターを配置
            </button>
            {open && (
                <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="bg-surface border border-line rounded-2xl p-4 w-80 space-y-3"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="font-bold text-ink">自動周回設定</div>
                        <div>
                            <div className="text-xs text-ink-muted mb-1">キャラクター</div>
                            <select
                                value={charId}
                                onChange={(e) => setCharId(e.target.value)}
                                className="w-full bg-app border border-line rounded px-2 py-1.5 text-sm text-ink"
                            >
                                {availableChars.map((c) => {
                                    const m = getCharacterMaster(c.masterId);
                                    return (
                                        <option key={c.id} value={c.id}>
                                            {m?.name ?? c.masterId} (戦闘Lv.{c.battleLevel})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                        <div>
                            <div className="text-xs text-ink-muted mb-1">
                                ダンジョンレベル（戦闘Lv.{battleLevel} まで配置可）
                            </div>
                            <select
                                value={effectiveLevel}
                                onChange={(e) => setLevel(Number(e.target.value))}
                                className="w-full bg-app border border-line rounded px-2 py-1.5 text-sm text-ink"
                            >
                                {Array.from({ length: maxAssignableDl }, (_, i) => i + 1).map(
                                    (lv) => (
                                        <option key={lv} value={lv}>
                                            DL {lv} (+
                                            {Math.round((lv - 1) * PROD_DL_BONUS_PER_LEVEL * 100)}
                                            %ボーナス)
                                        </option>
                                    ),
                                )}
                            </select>
                        </div>
                        <div>
                            <div className="text-xs text-ink-muted mb-1">収集する素材</div>
                            <select
                                value={effectiveMatId}
                                onChange={(e) => setMatId(e.target.value)}
                                className="w-full bg-app border border-line rounded px-2 py-1.5 text-sm text-ink"
                            >
                                {levelMats.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name} ({m.ratePerMin}/分)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setOpen(false)}
                                className="flex-1 bg-surface-2 text-ink py-2 rounded text-sm"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={() => {
                                    if (charId && effectiveMatId) {
                                        onAssign(charId, effectiveLevel, effectiveMatId);
                                        setOpen(false);
                                    }
                                }}
                                className="flex-1 bg-accent text-ink font-bold py-2 rounded text-sm"
                            >
                                配置
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
