"use client";

import { useState, useEffect } from "react";
import type { ProductionFacilityId } from "@/types/game";
import { MATERIALS_BY_FACILITY } from "@/data/materials";
import { getProductionRate, getAutoProgress } from "@/data/production";
import { getCharacterMaster } from "@/data/characters";
import {
    GR_FACILITY_LEVEL_CAP,
    MANUAL_PRODUCE_MS_PER_100G,
    MANUAL_PRODUCE_MIN_MS,
} from "@/data/constants";
import { useGameStore } from "@/store/gameStore";
import { useCharacterStore } from "@/store/characterStore";
import { useInventoryStore } from "@/store/inventoryStore";
import { useFacilityStore } from "@/store/facilityStore";
import { useManualProductionStore } from "@/store/manualProductionStore";
import { useProductionFracStore } from "@/store/productionFracStore";
import FacilityStatsBox from "@/app/_components/facility/FacilityStatsBox";
import AssignedSlotList from "@/app/_components/facility/AssignedSlotList";
import ItemTile from "@/app/_components/facility/ItemTile";
import ItemPickerGrid from "@/app/_components/facility/ItemPickerGrid";
import CharacterAvatar from "@/app/_components/ui/CharacterAvatar";
import Modal from "@/app/_components/ui/Modal";

const FACILITY_LABEL: Record<ProductionFacilityId, string> = {
    farm: "農業",
    mining: "鉱業",
    fishing: "漁業",
    alchemy: "錬金",
};

const SKILL_LABEL: Record<ProductionFacilityId, string> = {
    farm: "農業Lv",
    mining: "鉱業Lv",
    fishing: "漁業Lv",
    alchemy: "錬金Lv",
};

const SKILL_KEY_MAP: Record<
    ProductionFacilityId,
    "farmLevel" | "miningLevel" | "fishingLevel" | "alchemyLevel"
> = {
    farm: "farmLevel",
    mining: "miningLevel",
    fishing: "fishingLevel",
    alchemy: "alchemyLevel",
};

interface Props {
    facility: ProductionFacilityId;
}

export default function ProductionFacilityPage({ facility }: Props) {
    const materials = MATERIALS_BY_FACILITY[facility];

    const gold = useGameStore((s) => s.gold);
    const guildRank = useGameStore((s) => s.guildRank);
    const spendGold = useGameStore((s) => s.spendGold);
    const harvestBonuses = useGameStore((s) => s.harvestBonuses);
    const characters = useCharacterStore((s) => s.characters);
    const setAssignment = useCharacterStore((s) => s.setAssignment);
    const inventoryMaterials = useInventoryStore((s) => s.materials);
    const equipment = useInventoryStore((s) => s.equipment);
    const facilityData = useFacilityStore((s) => s[facility]);
    const getSlotCount = useFacilityStore((s) => s.getSlotCount);
    const getResearchBonus = useFacilityStore((s) => s.getResearchBonus);
    const getUpgradeCost = useFacilityStore((s) => s.getUpgradeCost);
    const expandProduction = useFacilityStore((s) => s.expandProduction);
    const researchProduction = useFacilityStore((s) => s.researchProduction);
    // 手動生産タスクは永続ストアに保持（画面遷移・リロード・オフラインをまたいで継続）
    const manualTasks = useManualProductionStore((s) => s.tasks);
    const startTask = useManualProductionStore((s) => s.startTask);
    const collectCompleted = useManualProductionStore((s) => s.collectCompleted);
    const cancelTask = useManualProductionStore((s) => s.cancelTask);
    // 自動生産の進捗（次の1個まで）を補間描画するための端数とティック時刻
    const frac = useProductionFracStore((s) => s.frac);
    const lastTick = useProductionFracStore((s) => s.lastTick);

    const [assigningSlot, setAssigningSlot] = useState<number | null>(null);
    const [editCharId, setEditCharId] = useState<string | null>(null);
    const [selectedMaterial, setSelectedMaterial] = useState<string>(materials[0]?.id ?? "");
    const [, setTick] = useState(0);

    const maxLevel = guildRank * GR_FACILITY_LEVEL_CAP;

    function startManualProduce(charId: string, matId: string, matPrice: number) {
        if (manualTasks[charId]) return; // 生産中はクリック不可
        // matPrice は経済倍率適用後の実価格。100Gあたり MANUAL_PRODUCE_MS_PER_100G ミリ秒、最低 MANUAL_PRODUCE_MIN_MS。
        const duration = Math.max(
            MANUAL_PRODUCE_MIN_MS,
            (matPrice / 100) * MANUAL_PRODUCE_MS_PER_100G,
        );
        startTask(charId, matId, duration);
    }

    // 進捗バーのアニメーションと完了回収。手動タスク or 自動生産の配置がある間だけ動かす。
    const hasAssigned = characters.some((c) => c.assignment?.type === facility);
    useEffect(() => {
        if (Object.keys(manualTasks).length === 0 && !hasAssigned) return;
        const id = setInterval(() => {
            collectCompleted();
            setTick((x) => x + 1); // プログレスバー再描画
        }, 100);
        return () => clearInterval(id);
    }, [manualTasks, collectCompleted, hasAssigned]);

    const slotCount = getSlotCount(facility);
    const researchBonus = getResearchBonus(facility);
    const expandCost = getUpgradeCost(facilityData.expansionLevel + 1);
    const researchCost = getUpgradeCost(facilityData.researchLevel + 1);

    // Characters assigned to this facility
    const assignedChars = characters.filter((c) => c.assignment?.type === facility);
    // Characters unassigned (available to assign)
    const availableChars = characters.filter((c) => c.assignment === null);

    // 現在の配置で素材ごとに1分あたり得られる合計生産量（豊作は含まない）
    const ratePerMaterial: Record<string, number> = {};
    for (const char of assignedChars) {
        const asgn = char.assignment;
        if (asgn?.type !== facility) continue;
        const mat = materials.find((m) => m.id === asgn.materialId);
        if (!mat) continue;
        ratePerMaterial[mat.id] =
            (ratePerMaterial[mat.id] ?? 0) +
            getProductionRate(char, mat, facility, researchBonus, equipment);
    }

    // Build slot list: [char | null, ...]
    const slots: ((typeof characters)[0] | null)[] = Array.from(
        { length: slotCount },
        (_, i) => assignedChars[i] ?? null,
    );

    const editing = editCharId !== null;
    const editChar = editing ? characters.find((c) => c.id === editCharId) : null;
    const editMaster = editChar ? getCharacterMaster(editChar.masterId) : null;
    const modalOpen = assigningSlot !== null || editing;

    function handleAssign(charId: string) {
        if (assigningSlot === null) return;
        setAssignment(charId, { type: facility, materialId: selectedMaterial });
        setAssigningSlot(null);
    }

    function openEdit(char: (typeof characters)[number]) {
        const asgn = char.assignment;
        const matId = asgn?.type === facility ? asgn.materialId : (materials[0]?.id ?? "");
        setSelectedMaterial(matId);
        setEditCharId(char.id);
    }

    function confirmEdit() {
        if (!editCharId) return;
        // 生産素材が変わるので進行中の手動生産は破棄
        cancelTask(editCharId);
        setAssignment(editCharId, { type: facility, materialId: selectedMaterial });
        setEditCharId(null);
    }

    function closeModal() {
        setAssigningSlot(null);
        setEditCharId(null);
    }

    function handleUnassign(charId: string) {
        cancelTask(charId);
        setAssignment(charId, null);
    }

    return (
        <div className="p-4 space-y-5">
            <h1 className="text-lg font-bold text-ink">{FACILITY_LABEL[facility]}施設</h1>

            {/* 今サイクルの豊作ボーナス（この施設の素材が対象のときだけ表示） */}
            {materials.some((m) => (harvestBonuses[m.id] ?? 0) > 0) && (
                <div className="bg-surface border border-success rounded-lg px-3 py-2 text-sm text-success flex items-center gap-2">
                    <span>🌾</span>
                    <span>
                        今サイクルの豊作:{" "}
                        {materials
                            .filter((m) => (harvestBonuses[m.id] ?? 0) > 0)
                            .map((m) => `${m.name} +${harvestBonuses[m.id]}%`)
                            .join(" / ")}
                    </span>
                </div>
            )}

            {/* Facility stats */}
            <FacilityStatsBox
                slotCount={slotCount}
                slotNote={`(上限 GR×10=${maxLevel})`}
                bonusLabel="研究ボーナス"
                bonusPct={researchBonus}
                gold={gold}
                expandCost={expandCost}
                researchCost={researchCost}
                onExpand={() => {
                    if (spendGold(expandCost)) expandProduction(facility);
                }}
                onResearch={() => {
                    if (spendGold(researchCost)) researchProduction(facility);
                }}
                expandAtMax={facilityData.expansionLevel >= maxLevel}
                researchAtMax={facilityData.researchLevel >= maxLevel}
            />

            {/* Slots */}
            <AssignedSlotList
                slots={slots}
                onAddSlot={(i) => setAssigningSlot(i)}
                onUnassign={handleUnassign}
                slotProgress={(char) => {
                    const asgn = char.assignment;
                    const matId = asgn?.type === facility ? asgn.materialId : "";
                    const mat = materials.find((m) => m.id === matId);
                    if (!mat) return null;
                    // 生産は素材消費が無いのでブロックせず常に進行
                    const rate = getProductionRate(char, mat, facility, researchBonus, equipment);
                    return getAutoProgress(
                        frac[`${char.id}:${mat.id}`] ?? 0,
                        rate,
                        lastTick,
                        Date.now(),
                    );
                }}
                slotInfo={(char) => {
                    const asgn = char.assignment;
                    const matId = asgn?.type === facility ? asgn.materialId : "";
                    const mat = materials.find((m) => m.id === matId);
                    // 研究ボーナス・キャラ生産レベル・凸・装備道具を反映した実レート（豊作は含まない）
                    const rate = mat
                        ? getProductionRate(char, mat, facility, researchBonus, equipment)
                        : 0;
                    return {
                        level: `${SKILL_LABEL[facility]}.${char[SKILL_KEY_MAP[facility]]}`,
                        itemName: mat?.name ?? "",
                        icon: mat?.id,
                        rate: mat ? `${rate.toFixed(2)}/分` : "",
                        stock: mat ? `在庫${inventoryMaterials[mat.id] ?? 0}` : "",
                    };
                }}
                sortKeys={(char) => {
                    const asgn = char.assignment;
                    const matId = asgn?.type === facility ? asgn.materialId : "";
                    return {
                        level: char[SKILL_KEY_MAP[facility]],
                        material: materials.findIndex((m) => m.id === matId),
                    };
                }}
                renderActions={(char) => {
                    const asgn = char.assignment;
                    const matId = asgn?.type === facility ? asgn.materialId : "";
                    const mat = materials.find((m) => m.id === matId);
                    if (!mat) return null;
                    const task = manualTasks[char.id];
                    const progress = task
                        ? Math.min(1, (Date.now() - task.start) / task.duration)
                        : 0;
                    return (
                        <>
                            <button
                                onClick={() => openEdit(char)}
                                className="text-xs bg-surface-2 hover:bg-surface-3 border border-line-strong text-ink px-2 py-1 rounded transition-colors shrink-0"
                            >
                                変更
                            </button>
                            {task ? (
                                <div className="relative w-14 text-center text-xs px-2 py-1 rounded border border-line-strong overflow-hidden shrink-0 text-ink">
                                    <div
                                        className="absolute inset-y-0 left-0 bg-accent/40"
                                        style={{ width: `${progress * 100}%` }}
                                    />
                                    <span className="relative">{Math.floor(progress * 100)}%</span>
                                </div>
                            ) : (
                                <button
                                    onClick={() => startManualProduce(char.id, mat.id, mat.price)}
                                    className="text-xs bg-surface-3 hover:bg-surface-3 border border-line-strong text-ink px-2 py-1 rounded transition-colors shrink-0"
                                >
                                    手動
                                </button>
                            )}
                        </>
                    );
                }}
            />

            {/* Materials inventory */}
            <div>
                <div className="text-sm text-ink-muted mb-2">素材在庫</div>
                <div className="grid grid-cols-2 gap-2">
                    {materials.map((mat) => {
                        const harvest = harvestBonuses[mat.id] ?? 0;
                        return (
                            <ItemTile
                                key={mat.id}
                                name={mat.name}
                                icon={mat.id}
                                price={mat.price}
                                stock={inventoryMaterials[mat.id] ?? 0}
                                ratePerMin={ratePerMaterial[mat.id] ?? 0}
                                highlight={harvest > 0}
                                badge={
                                    harvest > 0 ? (
                                        <span className="ml-1 text-[10px] text-success">
                                            🌾+{harvest}%
                                        </span>
                                    ) : undefined
                                }
                            />
                        );
                    })}
                </div>
            </div>

            {/* Assignment / edit modal */}
            {modalOpen && (
                <Modal onClose={closeModal} boxClassName="w-[92vw] max-w-xl max-h-[88vh] flex flex-col">
                    <div className="text-base font-bold text-ink mb-3">
                        {editing
                            ? `生産物の変更（${editMaster?.name ?? ""} ${SKILL_LABEL[facility]}.${editChar?.[SKILL_KEY_MAP[facility]]}）`
                            : "配置するキャラクターを選択"}
                    </div>

                    {/* Material selection */}
                    <div className="mb-3">
                        <div className="text-xs text-ink-muted mb-1">生産する素材</div>
                        <ItemPickerGrid
                            items={materials.map((mat) => ({
                                id: mat.id,
                                name: mat.name,
                                highlight: (harvestBonuses[mat.id] ?? 0) > 0,
                                sub: (
                                    <>
                                        {mat.ratePerMin}/分
                                        {(harvestBonuses[mat.id] ?? 0) > 0 && (
                                            <span className="text-success">
                                                {" "}
                                                🌾+{harvestBonuses[mat.id]}%
                                            </span>
                                        )}
                                    </>
                                ),
                            }))}
                            selectedId={selectedMaterial}
                            onSelect={setSelectedMaterial}
                            columns={2}
                        />
                    </div>

                    {/* Available characters (新規配置のみ) */}
                    {!editing && (
                        <>
                            <div className="text-xs text-ink-muted mb-2">
                                配置可能なキャラクター
                            </div>
                            <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {availableChars.length === 0 ? (
                                    <p className="text-sm text-ink-subtle text-center py-4 sm:col-span-2">
                                        配置可能なキャラクターがいません
                                    </p>
                                ) : (
                                    availableChars.map((char) => {
                                        const master = getCharacterMaster(char.masterId);
                                        const skillLv = char[SKILL_KEY_MAP[facility]];
                                        return (
                                            <button
                                                key={char.id}
                                                onClick={() => handleAssign(char.id)}
                                                className="w-full flex items-center gap-3 bg-surface-2 hover:bg-surface-3 border border-line hover:border-accent-strong rounded-lg p-2 text-left transition-colors"
                                            >
                                                <CharacterAvatar
                                                    masterId={char.masterId}
                                                    size="xs"
                                                />
                                                <div>
                                                    <div className="text-sm text-ink">
                                                        {master?.name ?? char.masterId}
                                                    </div>
                                                    <div className="text-xs text-ink-muted">
                                                        {SKILL_LABEL[facility]}.{skillLv}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}

                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={closeModal}
                            className="flex-1 bg-surface-2 hover:bg-surface-3 text-ink py-2 rounded-lg text-sm"
                        >
                            キャンセル
                        </button>
                        {editing && (
                            <button
                                onClick={confirmEdit}
                                className="flex-1 bg-accent hover:bg-accent-strong text-ink font-bold py-2 rounded-lg text-sm"
                            >
                                変更
                            </button>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
}
