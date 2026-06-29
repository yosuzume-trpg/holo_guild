"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getDungeonMaterials, getMaterial } from "@/data/materials";
import { getCharacterMaster } from "@/data/characters";
import { getDungeonRate, getAutoProgress } from "@/data/production";
import { useGameStore } from "@/store/gameStore";
import { useCharacterStore } from "@/store/characterStore";
import { useDungeonStore } from "@/store/dungeonStore";
import { useFacilityStore } from "@/store/facilityStore";
import { useInventoryStore } from "@/store/inventoryStore";
import { useProductionFracStore } from "@/store/productionFracStore";
import AssignedSlotList from "@/app/_components/facility/AssignedSlotList";
import { dungeonAttrMode } from "@/utils/dungeonBattle";
import { DUNGEON_MODE_LABEL, DUNGEON_MODE_COLOR } from "@/app/_components/dungeon/labels";
import ItemTile from "@/app/_components/facility/ItemTile";
import ItemPickerGrid from "@/app/_components/facility/ItemPickerGrid";
import CharacterPicker from "@/app/_components/facility/CharacterPicker";
import {
    BATTLE_GOLD_BOSS_FACTOR,
    GR_FACILITY_LEVEL_CAP,
    PROD_DL_BONUS_PER_LEVEL,
} from "@/data/constants";

type DungeonAssignment = Extract<
    NonNullable<ReturnType<typeof useCharacterStore.getState>["characters"][number]["assignment"]>,
    { type: "dungeon" }
>;

export default function DungeonPage() {
    const guildRank = useGameStore((s) => s.guildRank);
    const gold = useGameStore((s) => s.gold);
    const spendGold = useGameStore((s) => s.spendGold);
    const characters = useCharacterStore((s) => s.characters);
    const setAssignment = useCharacterStore((s) => s.setAssignment);
    const maxCleared = useDungeonStore((s) => s.maxClearedLevel);
    const clearedLevels = useDungeonStore((s) => s.clearedLevels);
    const inventoryMaterials = useInventoryStore((s) => s.materials);
    const dungeonFacility = useFacilityStore((s) => s.dungeon);
    const getSlotCount = useFacilityStore((s) => s.getSlotCount);
    const getUpgradeCost = useFacilityStore((s) => s.getUpgradeCost);
    const expandDungeon = useFacilityStore((s) => s.expandDungeon);

    const [tab, setTab] = useState<"challenge" | "auto">("challenge");
    // 配置モーダル: 新規は editChar=undefined、変更は対象キャラを保持
    const [modalOpen, setModalOpen] = useState(false);
    const [editCharId, setEditCharId] = useState<string | null>(null);

    // Levels unlocked: 1 always, then next after each clear.
    // 挑戦できるDLは GR×10 まで（GR1なら最大DL10）。
    const unlockedMax = Math.min(maxCleared + 1, guildRank * 10);
    const challengeLevels = Array.from({ length: unlockedMax }, (_, i) => i + 1);

    // Auto-grind: characters assigned to dungeon
    const autoChars = characters.filter((c) => c.assignment?.type === "dungeon");
    const availableChars = characters.filter((c) => c.assignment === null);

    // 自動周回の進捗（次の1個まで）補間用。配置がある間だけ100msで再描画。
    const frac = useProductionFracStore((s) => s.frac);
    const lastTick = useProductionFracStore((s) => s.lastTick);
    const [, setTick] = useState(0);
    const hasAuto = autoChars.length > 0;
    useEffect(() => {
        if (!hasAuto) return;
        const id = setInterval(() => setTick((x) => x + 1), 100);
        return () => clearInterval(id);
    }, [hasAuto]);

    // 自動周回の配置枠（初期3・拡張で+1・上限GR×10）
    const slotCount = getSlotCount("dungeon");
    const maxExpansion = guildRank * GR_FACILITY_LEVEL_CAP;
    const expandCost = getUpgradeCost(dungeonFacility.expansionLevel + 1);
    const expandAtMax = dungeonFacility.expansionLevel >= maxExpansion;

    // Available dungeon materials based on cleared level
    const availableMats = getDungeonMaterials(maxCleared);

    // 現在の配置で素材ごとに1分あたり得られる合計獲得量（DL・★ボーナス込み）
    const ratePerMaterial: Record<string, number> = {};
    for (const char of autoChars) {
        const asgn = char.assignment;
        if (asgn?.type !== "dungeon") continue;
        const mat = getMaterial(asgn.materialId);
        if (!mat) continue;
        ratePerMaterial[mat.id] =
            (ratePerMaterial[mat.id] ?? 0) + getDungeonRate(mat, asgn.level, char.starRank);
    }

    // 配置スロット: [char | null, ...]（生産施設と同じ並べ方）
    const slots: ((typeof characters)[number] | null)[] = Array.from(
        { length: slotCount },
        (_, i) => autoChars[i] ?? null,
    );

    const editChar = editCharId ? characters.find((c) => c.id === editCharId) : undefined;

    // GR upgrade check (every 10 DL)
    const nextGrDl = guildRank * 10;

    function openNew() {
        setEditCharId(null);
        setModalOpen(true);
    }
    function openEdit(charId: string) {
        setEditCharId(charId);
        setModalOpen(true);
    }
    function closeModal() {
        setModalOpen(false);
        setEditCharId(null);
    }

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
                                const mode = dungeonAttrMode(lv);
                                return (
                                    <Link
                                        key={lv}
                                        href={`/dungeon/${lv}`}
                                        className="flex w-80 h-24 items-center justify-between bg-surface border border-line hover:border-accent-strong rounded-xl p-4 transition-colors"
                                    >
                                        <div>
                                            <div className="font-semibold text-ink">
                                                ダンジョン Lv.{lv}
                                                <span className={`ml-1.5 text-sm ${DUNGEON_MODE_COLOR[mode]}`}>
                                                    [{DUNGEON_MODE_LABEL[mode]}]
                                                </span>
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

                                {/* 配置スロット（生産施設と共通のレイアウト） */}
                                <AssignedSlotList
                                    slots={slots}
                                    onAddSlot={openNew}
                                    onUnassign={(charId) => setAssignment(charId, null)}
                                    slotProgress={(char) => {
                                        const asgn = char.assignment as DungeonAssignment;
                                        const mat = getMaterial(asgn.materialId);
                                        if (!mat) return null;
                                        // 自動周回は素材消費が無いのでブロックせず常に進行
                                        const rate = getDungeonRate(mat, asgn.level, char.starRank);
                                        return getAutoProgress(
                                            frac[`dungeon:${char.id}:${mat.id}`] ?? 0,
                                            rate,
                                            lastTick,
                                            Date.now(),
                                        );
                                    }}
                                    slotInfo={(char) => {
                                        const asgn = char.assignment as DungeonAssignment;
                                        const mat = getMaterial(asgn.materialId);
                                        const rate = mat
                                            ? getDungeonRate(mat, asgn.level, char.starRank)
                                            : 0;
                                        return {
                                            level: `DL${asgn.level}`,
                                            itemName: mat?.name ?? "",
                                            icon: mat?.id,
                                            rate: mat ? `${rate.toFixed(2)}/分` : "",
                                            stock: mat
                                                ? `在庫${inventoryMaterials[mat.id] ?? 0}`
                                                : "",
                                        };
                                    }}
                                    sortKeys={(char) => {
                                        const asgn = char.assignment as DungeonAssignment;
                                        return {
                                            level: asgn.level,
                                            material: availableMats.findIndex(
                                                (m) => m.id === asgn.materialId,
                                            ),
                                        };
                                    }}
                                    renderActions={(char) => (
                                        <button
                                            onClick={() => openEdit(char.id)}
                                            className="text-xs bg-surface-2 hover:bg-surface-3 border border-line-strong text-ink px-2 py-1 rounded transition-colors shrink-0"
                                        >
                                            変更
                                        </button>
                                    )}
                                />

                                <div>
                                    <div className="text-sm text-ink-muted mb-2">素材在庫</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {availableMats.map((mat) => (
                                            <ItemTile
                                                key={mat.id}
                                                name={mat.name}
                                                icon={mat.id}
                                                price={mat.price}
                                                stock={inventoryMaterials[mat.id] ?? 0}
                                                ratePerMin={ratePerMaterial[mat.id] ?? 0}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {modalOpen && (
                <DungeonAssignModal
                    availableChars={availableChars}
                    maxCleared={maxCleared}
                    editChar={editChar}
                    onClose={closeModal}
                    onAssign={(charId, level, materialId) => {
                        setAssignment(charId, { type: "dungeon", level, materialId });
                        closeModal();
                    }}
                />
            )}
        </div>
    );
}

function DungeonAssignModal({
    availableChars,
    maxCleared,
    onAssign,
    onClose,
    editChar,
}: {
    availableChars: ReturnType<typeof useCharacterStore.getState>["characters"];
    maxCleared: number;
    onAssign: (charId: string, level: number, materialId: string) => void;
    onClose: () => void;
    /** 指定すると「変更」モードになり、そのキャラのDL・素材を解除せず変更できる */
    editChar?: ReturnType<typeof useCharacterStore.getState>["characters"][number];
}) {
    const isEdit = !!editChar;
    const initialAsgn = editChar?.assignment as DungeonAssignment | undefined;
    const [charId, setCharId] = useState(editChar?.id ?? availableChars[0]?.id ?? "");
    const [matId, setMatId] = useState(initialAsgn?.materialId ?? "");

    // 配置できるのは「そのDL以上の戦闘レベル」のキャラのみ。
    // → あるキャラが周回できる最大DL = min(クリア済み最大DL, そのキャラの戦闘レベル)
    // 低DLを選ぶ意味がない（高DLほど報酬率が高い）ため、常にこの最高率DLに固定する。
    const activeChar = editChar ?? availableChars.find((c) => c.id === charId);
    const activeMaster = activeChar ? getCharacterMaster(activeChar.masterId) : null;
    const battleLevel = activeChar?.battleLevel ?? 1;
    const maxAssignableDl = Math.max(1, Math.min(maxCleared, battleLevel));

    // 収集できる素材は周回DLのDL帯に従う
    const levelMats = getDungeonMaterials(maxAssignableDl);
    // 選択中の素材が現在のDL帯に無ければ先頭へ補正
    const effectiveMatId = levelMats.some((m) => m.id === matId)
        ? matId
        : (levelMats[0]?.id ?? "");

    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-surface border border-line rounded-2xl p-4 w-[92vw] max-w-xl max-h-[88vh] overflow-y-auto space-y-3"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="font-bold text-ink">
                    {isEdit ? "収集素材の変更" : "自動周回設定"}
                </div>
                <div>
                    <div className="text-xs text-ink-muted mb-1">キャラクター</div>
                    {isEdit ? (
                        <div className="text-sm text-ink px-2 py-1.5">
                            {activeMaster?.name ?? activeChar?.masterId} (戦闘Lv.{battleLevel})
                        </div>
                    ) : (
                        <CharacterPicker
                            chars={availableChars}
                            selectedId={charId}
                            onSelect={setCharId}
                            primaryKey="battleLevel"
                            className="max-h-[40vh] overflow-y-auto"
                        />
                    )}
                </div>
                <div>
                    <div className="text-xs text-ink-muted mb-1">周回DL</div>
                    <div className="text-sm text-ink bg-app border border-line rounded px-2 py-1.5">
                        DL {maxAssignableDl}
                        <span className="text-ink-subtle">
                            （戦闘Lv.{battleLevel} / 最大攻略DL {maxCleared} ・ +
                            {Math.round((maxAssignableDl - 1) * PROD_DL_BONUS_PER_LEVEL * 100)}%）
                        </span>
                    </div>
                </div>
                <div>
                    <div className="text-xs text-ink-muted mb-1">収集する素材</div>
                    <ItemPickerGrid
                        items={levelMats.map((m) => ({
                            id: m.id,
                            name: m.name,
                            sub: `${m.ratePerMin}/分`,
                        }))}
                        selectedId={effectiveMatId}
                        onSelect={setMatId}
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-surface-2 text-ink py-2 rounded text-sm"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={() => {
                            if (charId && effectiveMatId) {
                                onAssign(charId, maxAssignableDl, effectiveMatId);
                            }
                        }}
                        disabled={!charId || !effectiveMatId}
                        className="flex-1 bg-accent hover:bg-accent-strong disabled:opacity-40 text-ink font-bold py-2 rounded text-sm"
                    >
                        {isEdit ? "変更" : "配置"}
                    </button>
                </div>
            </div>
        </div>
    );
}
