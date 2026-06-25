"use client";

import { useState, useEffect } from "react";
import { MATERIALS } from "@/data/materials";
import { RECIPES } from "@/data/recipes";
import { getAutoProgress, getMerchantRate } from "@/data/production";
import { getCharacterMaster } from "@/data/characters";
import { GR_FACILITY_LEVEL_CAP, MANUAL_SELL_MS } from "@/data/constants";
import { useGameStore } from "@/store/gameStore";
import { useCharacterStore } from "@/store/characterStore";
import { useInventoryStore } from "@/store/inventoryStore";
import { useFacilityStore } from "@/store/facilityStore";
import { useManualProductionStore } from "@/store/manualProductionStore";
import { useProductionFracStore } from "@/store/productionFracStore";
import FacilityStatsBox from "@/app/_components/facility/FacilityStatsBox";
import AssignedSlotList from "@/app/_components/facility/AssignedSlotList";
import ItemTile from "@/app/_components/facility/ItemTile";
import Modal from "@/app/_components/ui/Modal";
import CharacterAvatar from "@/app/_components/ui/CharacterAvatar";

const SELL_CANDIDATES = [
    ...MATERIALS.filter((m) => m.facility !== "dungeon").map((m) => ({
        id: m.id,
        name: m.name,
        price: m.price,
    })),
    ...RECIPES.map((r) => ({
        id: r.id,
        name: r.name,
        price: r.sellPrice,
    })),
];

export default function MerchantGuild() {
    const gold = useGameStore((s) => s.gold);
    const guildRank = useGameStore((s) => s.guildRank);
    const spendGold = useGameStore((s) => s.spendGold);
    const characters = useCharacterStore((s) => s.characters);
    const setAssignment = useCharacterStore((s) => s.setAssignment);
    const materials = useInventoryStore((s) => s.materials);
    const removeMaterial = useInventoryStore((s) => s.removeMaterial);
    const facilityData = useFacilityStore((s) => s.merchant);
    // 手動売却タスクは永続ストアに保持（画面遷移・リロード・オフラインをまたいで継続）
    const sellTasks = useManualProductionStore((s) => s.sellTasks);
    const startSellTask = useManualProductionStore((s) => s.startSellTask);
    const collectCompleted = useManualProductionStore((s) => s.collectCompleted);
    // 自動販売の進捗（次の1個まで）補間用
    const frac = useProductionFracStore((s) => s.frac);
    const lastTick = useProductionFracStore((s) => s.lastTick);
    const getSlotCount = useFacilityStore((s) => s.getSlotCount);
    const getResearchBonus = useFacilityStore((s) => s.getResearchBonus);
    const getUpgradeCost = useFacilityStore((s) => s.getUpgradeCost);
    const expandGuild = useFacilityStore((s) => s.expandGuild);
    const researchGuild = useFacilityStore((s) => s.researchGuild);

    const [assignOpen, setAssignOpen] = useState(false);
    const [editCharId, setEditCharId] = useState<string | null>(null);
    const [pickCharId, setPickCharId] = useState("");
    const [pickSellId, setPickSellId] = useState(SELL_CANDIDATES[0]?.id ?? "");
    const [pickMinStock, setPickMinStock] = useState(0);
    const [, setTick] = useState(0);

    function startManualSell(itemId: string, price: number) {
        if (sellTasks[itemId]) return; // 売却中は新規不可
        if ((materials[itemId] ?? 0) < 1) return;
        // 売却対象を先に在庫から引き、所要時間経過後にゴールドが入る
        if (!removeMaterial(itemId, 1)) return;
        startSellTask(itemId, price, MANUAL_SELL_MS);
    }

    // 進捗アニメーションと完了回収。手動タスク or 自動販売の配置がある間だけ動かす。
    const hasAssigned = characters.some((c) => c.assignment?.type === "merchant");
    useEffect(() => {
        if (Object.keys(sellTasks).length === 0 && !hasAssigned) return;
        const id = setInterval(() => {
            collectCompleted();
            setTick((x) => x + 1);
        }, 100);
        return () => clearInterval(id);
    }, [sellTasks, collectCompleted, hasAssigned]);

    const slotCount = getSlotCount("merchant");
    const researchBonus = getResearchBonus("merchant");
    const expandCost = getUpgradeCost(facilityData.expansionLevel + 1);
    const researchCost = getUpgradeCost(facilityData.researchLevel + 1);
    const maxLevel = guildRank * GR_FACILITY_LEVEL_CAP;

    const assignedMerchants = characters.filter((c) => c.assignment?.type === "merchant");
    const availableChars = characters.filter((c) => c.assignment === null);
    const slots = Array.from({ length: slotCount }, (_, i) => assignedMerchants[i] ?? null);

    // 現在の配置で商品ごとに1分あたり売れる合計個数
    const ratePerItem: Record<string, number> = {};
    for (const char of assignedMerchants) {
        const asgn = char.assignment as Extract<typeof char.assignment, { type: "merchant" }>;
        if (!asgn) continue;
        ratePerItem[asgn.sellMaterialId] =
            (ratePerItem[asgn.sellMaterialId] ?? 0) +
            getMerchantRate(char.merchantLevel, researchBonus);
    }

    const editing = editCharId !== null;
    const modalOpen = assignOpen || editing;
    const editChar = editing ? characters.find((c) => c.id === editCharId) : null;
    const editMaster = editChar ? getCharacterMaster(editChar.masterId) : null;

    function openAssign() {
        setPickCharId(availableChars[0]?.id ?? "");
        setPickSellId(SELL_CANDIDATES[0]?.id ?? "");
        setPickMinStock(0);
        setAssignOpen(true);
    }

    function openEdit(char: (typeof characters)[number]) {
        const asgn = char.assignment as Extract<typeof char.assignment, { type: "merchant" }>;
        setPickSellId(asgn?.sellMaterialId ?? SELL_CANDIDATES[0]?.id ?? "");
        setPickMinStock(asgn?.minStock ?? 0);
        setEditCharId(char.id);
    }

    function closeModal() {
        setAssignOpen(false);
        setEditCharId(null);
    }

    function confirmAssign() {
        const target = editCharId ?? pickCharId;
        if (!target || !pickSellId) return;
        setAssignment(target, {
            type: "merchant",
            sellMaterialId: pickSellId,
            minStock: pickMinStock,
        });
        closeModal();
    }

    return (
        <div className="p-4 space-y-4">
            <h1 className="text-lg font-bold text-ink">商人ギルド</h1>

            <FacilityStatsBox
                slotCount={slotCount}
                slotNote={`(上限 GR×10=${maxLevel})`}
                bonusLabel="販売速度ボーナス"
                bonusPct={researchBonus}
                gold={gold}
                expandCost={expandCost}
                researchCost={researchCost}
                onExpand={() => {
                    if (spendGold(expandCost)) expandGuild("merchant");
                }}
                onResearch={() => {
                    if (spendGold(researchCost)) researchGuild("merchant");
                }}
                expandAtMax={facilityData.expansionLevel >= maxLevel}
                researchAtMax={facilityData.researchLevel >= maxLevel}
            />

            <AssignedSlotList
                slots={slots}
                onAddSlot={openAssign}
                onUnassign={(id) => setAssignment(id, null)}
                slotProgress={(char) => {
                    const asgn = char.assignment as Extract<
                        typeof char.assignment,
                        { type: "merchant" }
                    >;
                    if (!asgn?.sellMaterialId) return null;
                    // 在庫が最低保有数以下で売れない間は待機表示（null）
                    const stock = materials[asgn.sellMaterialId] ?? 0;
                    if (stock <= asgn.minStock) return null;
                    const rate = getMerchantRate(char.merchantLevel, researchBonus);
                    return getAutoProgress(
                        frac[`merchant:${char.id}`] ?? 0,
                        rate,
                        lastTick,
                        Date.now(),
                    );
                }}
                slotInfo={(char) => {
                    const asgn = char.assignment as Extract<
                        typeof char.assignment,
                        { type: "merchant" }
                    >;
                    const item = SELL_CANDIDATES.find((s) => s.id === asgn?.sellMaterialId);
                    const stock = materials[asgn?.sellMaterialId ?? ""] ?? 0;
                    // 自動販売レート(個/分): 研究ボーナス＋キャラ商人レベルを反映（基準1個/分）
                    const rate = getMerchantRate(char.merchantLevel, researchBonus);
                    return {
                        level: `商人Lv.${char.merchantLevel}`,
                        itemName: item?.name ?? "",
                        rate: item ? `${rate.toFixed(2)}/分` : "",
                        minStock: item ? `最低${asgn.minStock}` : "",
                        stock: item ? `在庫${stock}` : "",
                    };
                }}
                renderActions={(char) => (
                    <button
                        onClick={() => openEdit(char)}
                        className="text-xs bg-surface-2 hover:bg-surface-3 border border-line-strong text-ink px-2 py-1 rounded transition-colors shrink-0"
                    >
                        変更
                    </button>
                )}
            />

            <div>
                <div className="text-sm text-ink-muted mb-2">手動販売（時間がかかります）</div>
                <div className="grid grid-cols-2 gap-2">
                    {SELL_CANDIDATES.filter(
                        (s) => (materials[s.id] ?? 0) > 0 || sellTasks[s.id],
                    ).map((item) => {
                        const task = sellTasks[item.id];
                        const selling = !!task;
                        const progress = selling
                            ? Math.min(1, (Date.now() - task.start) / task.duration)
                            : 0;
                        return (
                            <ItemTile
                                key={item.id}
                                name={item.name}
                                price={item.price}
                                stock={materials[item.id] ?? 0}
                                ratePerMin={ratePerItem[item.id] ?? 0}
                                onClick={() => startManualSell(item.id, item.price)}
                                disabled={selling}
                                progress={selling ? progress : null}
                            />
                        );
                    })}
                </div>
                {SELL_CANDIDATES.filter((s) => (materials[s.id] ?? 0) > 0 || sellTasks[s.id])
                    .length === 0 && (
                    <p className="text-sm text-ink-subtle text-center py-4">
                        販売できる素材がありません
                    </p>
                )}
            </div>

            {modalOpen && (
                <Modal onClose={closeModal} boxClassName="w-80 space-y-3">
                    <div className="font-bold text-ink">
                        {editing ? "販売設定の変更" : "配置設定"}
                    </div>
                    <div>
                        <div className="text-xs text-ink-muted mb-1">キャラクター</div>
                        {editing ? (
                            <div className="text-sm text-ink px-2 py-1.5">
                                {editMaster?.name ?? editCharId} (商人Lv.{editChar?.merchantLevel})
                            </div>
                        ) : availableChars.length === 0 ? (
                            <p className="text-sm text-ink-subtle text-center py-4">
                                配置可能なキャラクターがいません
                            </p>
                        ) : (
                            <div className="max-h-44 overflow-y-auto grid grid-cols-3 gap-2">
                                {availableChars.map((c) => {
                                    const m = getCharacterMaster(c.masterId);
                                    const sel = pickCharId === c.id;
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => setPickCharId(c.id)}
                                            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-colors ${
                                                sel
                                                    ? "border-accent-strong bg-surface-2"
                                                    : "border-line hover:border-accent-strong"
                                            }`}
                                        >
                                            <CharacterAvatar masterId={c.masterId} size="md" />
                                            <div className="text-[10px] text-ink leading-tight text-center w-full truncate">
                                                {m?.name ?? c.masterId}
                                            </div>
                                            <div className="text-[10px] text-ink-muted">
                                                Lv.{c.merchantLevel}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="text-xs text-ink-muted mb-1">販売する素材/商品</div>
                        <select
                            value={pickSellId}
                            onChange={(e) => setPickSellId(e.target.value)}
                            className="w-full bg-app border border-line rounded px-2 py-1.5 text-sm text-ink"
                        >
                            {SELL_CANDIDATES.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name} ({s.price}G)
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <div className="text-xs text-ink-muted mb-1">
                            最低保有数（この数を下回らないよう販売）
                        </div>
                        <input
                            type="number"
                            min={0}
                            value={pickMinStock}
                            onChange={(e) => setPickMinStock(Math.max(0, Number(e.target.value)))}
                            className="w-full bg-app border border-line rounded px-2 py-1.5 text-sm text-ink"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={closeModal}
                            className="flex-1 bg-surface-2 hover:bg-surface-3 text-ink py-2 rounded text-sm"
                        >
                            キャンセル
                        </button>
                        <button
                            onClick={confirmAssign}
                            disabled={!editing && !pickCharId}
                            className="flex-1 bg-accent hover:bg-accent-strong disabled:opacity-40 text-ink font-bold py-2 rounded text-sm"
                        >
                            {editing ? "変更" : "配置"}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
