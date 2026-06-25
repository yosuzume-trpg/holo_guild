"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useCharacterStore } from "@/store/characterStore";
import { useInventoryStore } from "@/store/inventoryStore";
import { useGameStore } from "@/store/gameStore";
import { getCharacterMaster } from "@/data/characters";
import { getEquipment } from "@/data/equipment";
import type { CharacterStats, EquipmentSlot } from "@/types/game";
import {
    STAR_GOLD_COST_FACTOR,
    AFFECTION_POINTS_PER_LEVEL,
    AFFECTION_GAIN_MIN,
    AFFECTION_GAIN_RANGE,
} from "@/data/constants";
import { calcCharacterStats } from "@/utils/characterStats";
import ProgressBar from "@/app/_components/ui/ProgressBar";
import CharacterAvatar from "@/app/_components/ui/CharacterAvatar";
import EquipModal from "@/app/_components/ui/EquipModal";
import AffectionBadge from "@/app/_components/ui/AffectionBadge";
import CutinPopup from "@/app/_components/ui/CutinPopup";
import RankBadge from "@/app/_components/ui/RankBadge";

const TENDENCY_LABEL: Record<string, string> = {
    standard: "標準",
    attack: "攻撃",
    magic: "魔法",
    defense: "防御",
    speed: "速度",
};

const TENDENCY_COLOR: Record<string, string> = {
    standard: "bg-surface-3",
    attack: "bg-red-600",
    magic: "bg-purple-600",
    defense: "bg-blue-600",
    speed: "bg-green-600",
};

const SLOT_LABEL: Record<string, string> = {
    weapon: "武器",
    armor: "防具",
    accessory: "アクセサリー",
    tool: "道具",
};

/** 累計経験値から現レベル内での経験値を求める（必要経験値 = 100×レベル） */
function expInLevel(totalExp: number, level: number): number {
    return totalExp - (100 * level * (level - 1)) / 2;
}

export default function CharacterDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const characters = useCharacterStore((s) => s.characters);
    const socialize = useCharacterStore((s) => s.socialize);
    const equip = useCharacterStore((s) => s.equip);
    const upgradeStarRank = useCharacterStore((s) => s.upgradeStarRank);
    const gold = useGameStore((s) => s.gold);
    const spendGold = useGameStore((s) => s.spendGold);
    const socializedThisCycle = useGameStore((s) => s.socializedThisCycle);
    const safeMode = useGameStore((s) => s.safeMode);
    const equipment = useInventoryStore((s) => s.equipment);

    const [equipModal, setEquipModal] = useState<EquipmentSlot | null>(null);
    const [showCutin, setShowCutin] = useState(false);

    const char = characters.find((c) => c.id === id);
    if (!char) {
        return (
            <div className="p-4 text-ink-muted">
                <Link
                    href="/characters"
                    className="text-sm text-ink-muted hover:text-ink mb-4 block"
                >
                    ← 一覧に戻る
                </Link>
                キャラクターが見つかりません
            </div>
        );
    }

    const master = getCharacterMaster(char.masterId);
    const affPct = Math.round(
        (char.affectionPoints / (char.affectionLevel * AFFECTION_POINTS_PER_LEVEL)) * 100,
    );

    const cs = calcCharacterStats(char, equipment);

    const equippedItems = {
        weapon: char.equipment.weapon
            ? equipment.find((e) => e.instanceId === char.equipment.weapon)
            : null,
        armor: char.equipment.armor
            ? equipment.find((e) => e.instanceId === char.equipment.armor)
            : null,
        accessory: char.equipment.accessory
            ? equipment.find((e) => e.instanceId === char.equipment.accessory)
            : null,
        tool: char.equipment.tool
            ? equipment.find((e) => e.instanceId === char.equipment.tool)
            : null,
    };

    return (
        <div className="p-4 max-w-lg mx-auto">
            <Link href="/characters" className="text-sm text-ink-muted hover:text-ink mb-4 block">
                ← 一覧に戻る
            </Link>

            {/* Header */}
            <div className="bg-surface border border-line rounded-xl p-4 mb-4 text-center">
                <div className="relative inline-block">
                    <CharacterAvatar masterId={char.masterId} size="2xl" className="mx-auto mb-2" />
                    <RankBadge rank={char.starRank} className="absolute top-0 right-0 w-8 h-8 text-sm" />
                </div>
                <div className="text-xl font-bold text-ink mb-1">
                    {master?.name ?? char.masterId}
                </div>
                <div className="flex justify-center gap-2 mb-2">
                    <span
                        className={`text-xs px-2 py-0.5 rounded-full text-white ${TENDENCY_COLOR[char.tendency]}`}
                    >
                        {TENDENCY_LABEL[char.tendency]}タイプ
                    </span>
                </div>
                {(() => {
                    const certCost = Math.pow(2, char.starRank - 1);
                    const goldCost = STAR_GOLD_COST_FACTOR * char.starRank;
                    const canUpgrade = char.certificates >= certCost && gold >= goldCost;
                    return (
                        <div className="flex items-center justify-center gap-3 text-xs">
                            <span className="text-ink-muted">証書 {char.certificates}枚</span>
                            <button
                                onClick={() => {
                                    if (spendGold(goldCost)) upgradeStarRank(char.id);
                                }}
                                disabled={!canUpgrade}
                                className="bg-accent hover:bg-accent-strong disabled:opacity-40 disabled:cursor-not-allowed text-ink font-bold px-3 py-1 rounded-full transition-colors"
                            >
                                ★アップ（証書×{certCost} / {goldCost}G）
                            </button>
                        </div>
                    );
                })()}
            </div>

            {/* Affection */}
            <div className="bg-surface border border-line rounded-lg p-3 mb-3">
                <div className="flex items-center gap-3">
                    <AffectionBadge level={char.affectionLevel} className="w-12 h-12 text-lg shrink-0" />
                    <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-ink-muted">親愛度 Lv.{char.affectionLevel}</span>
                            <span className="text-ink">
                                {char.affectionPoints} /{" "}
                                {char.affectionLevel * AFFECTION_POINTS_PER_LEVEL}
                            </span>
                        </div>
                        <ProgressBar pct={affPct} color="bg-pink-500" barClassName="" />
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="bg-surface border border-line rounded-lg p-3 mb-3">
                <div className="text-sm font-semibold text-ink mb-2">ステータス</div>
                <div className="grid grid-cols-3 gap-2 text-xs text-center">
                    {(
                        [
                            ["HP", "hp"],
                            ["攻撃", "atk"],
                            ["防御", "def"],
                            ["魔力", "mag"],
                            ["魔防", "mdef"],
                            ["素早", "spd"],
                        ] as [string, keyof CharacterStats][]
                    ).map(([label, key]) => (
                        <div key={key} className="bg-surface-2 rounded p-2">
                            <div className="text-ink-muted">{label}</div>
                            <div className="text-ink font-bold text-base leading-tight">
                                {cs.total[key]}
                            </div>
                            <div className="mt-1 space-y-0.5 text-[10px] leading-tight">
                                <div className="text-ink-subtle">基礎 {cs.base[key]}</div>
                                <div className="text-success">装備 +{cs.equipBonus[key]}</div>
                                <div className="text-accent-strong">★ +{cs.starBonus[key]}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Levels */}
            <div className="bg-surface border border-line rounded-lg p-3 mb-3">
                <div className="text-sm font-semibold text-ink mb-2">レベル</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    {(
                        [
                            ["戦闘", char.battleLevel, char.battleExp, "bg-accent"],
                            ["農業", char.farmLevel, char.farmExp, "bg-emerald-500"],
                            ["鉱業", char.miningLevel, char.miningExp, "bg-emerald-500"],
                            ["漁業", char.fishingLevel, char.fishingExp, "bg-emerald-500"],
                            ["錬金", char.alchemyLevel, char.alchemyExp, "bg-emerald-500"],
                            ["工芸", char.craftLevel, char.craftExp, "bg-emerald-500"],
                            ["商人", char.merchantLevel, char.merchantExp, "bg-emerald-500"],
                        ] as [string, number, number, string][]
                    ).map(([label, lv, exp, color]) => {
                        const cur = expInLevel(exp, lv);
                        const need = 100 * lv;
                        return (
                            <div key={label}>
                                <div className="flex justify-between text-ink">
                                    <span className="text-ink-muted">{label}</span>
                                    <span>Lv.{lv}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-ink-subtle">
                                    <span />
                                    <span>
                                        {Math.floor(cur)} / {need}
                                    </span>
                                </div>
                                <ProgressBar pct={(cur / need) * 100} color={color} />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Equipment */}
            <div className="bg-surface border border-line rounded-lg p-3 mb-3">
                <div className="text-sm font-semibold text-ink mb-2">装備</div>
                <div className="space-y-1.5">
                    {(["weapon", "armor", "accessory", "tool"] as const).map((slot) => {
                        const inst = equippedItems[slot];
                        const mast = inst ? getEquipment(inst.masterId) : null;
                        return (
                            <button
                                key={slot}
                                onClick={() => setEquipModal(slot)}
                                className="w-full flex justify-between items-center text-sm bg-surface-2 hover:bg-surface-3 rounded px-3 py-2 transition-colors"
                            >
                                <span className="text-ink-muted w-20 text-left">
                                    {SLOT_LABEL[slot]}
                                </span>
                                {mast ? (
                                    <span className="text-ink">
                                        ★{inst!.starRank} {mast.name}
                                    </span>
                                ) : (
                                    <span className="text-ink-subtle">未装備（タップで変更）</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Equipment modal */}
            {equipModal && (
                <EquipModal
                    char={char}
                    slot={equipModal}
                    characters={characters}
                    equipment={equipment}
                    equip={equip}
                    onClose={() => setEquipModal(null)}
                />
            )}

            {/* Socialize */}
            <div className="bg-surface border border-line rounded-lg p-3 mb-4">
                <button
                    onClick={() => {
                        socialize(char.id);
                        if (!safeMode) setShowCutin(true);
                    }}
                    disabled={socializedThisCycle}
                    className="w-full bg-pink-700 hover:bg-pink-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                >
                    {char.socializedThisCycle
                        ? "このサイクルは交遊済み"
                        : socializedThisCycle
                          ? "今サイクルは別のキャラと交遊済み"
                          : `交遊する (+${AFFECTION_GAIN_MIN}〜${AFFECTION_GAIN_MIN + AFFECTION_GAIN_RANGE - 1} pt)`}
                </button>
            </div>

            {showCutin && (
                <CutinPopup masterId={char.masterId} onClose={() => setShowCutin(false)} />
            )}
        </div>
    );
}
