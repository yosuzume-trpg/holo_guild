"use client";

import { useState } from "react";
import Link from "next/link";
import CharacterPortrait from "@/app/_components/ui/CharacterPortrait";
import { useCharacterStore } from "@/store/characterStore";
import { useInventoryStore } from "@/store/inventoryStore";
import { useGameStore } from "@/store/gameStore";
import { getCharacterMaster } from "@/data/characters";
import { getEquipment } from "@/data/equipment";
import { STAR_GOLD_COST_FACTOR } from "@/data/constants";
import { calcCharacterStats } from "@/utils/characterStats";
import ProgressBar from "@/app/_components/ui/ProgressBar";
import type { CharacterInstance, EquipmentInstance } from "@/types/game";

const TENDENCY_COLOR: Record<string, string> = {
    standard: "bg-surface-3",
    attack: "bg-red-600",
    magic: "bg-purple-600",
    defense: "bg-blue-600",
    speed: "bg-green-600",
};

const TENDENCY_LABEL: Record<string, string> = {
    standard: "標準",
    attack: "攻撃",
    magic: "魔法",
    defense: "防御",
    speed: "速度",
};

const ASSIGNMENT_LABEL: Record<string, string> = {
    farm: "農業",
    mining: "鉱業",
    fishing: "漁業",
    alchemy: "錬金",
    merchant: "商人",
    craft: "工芸",
    dungeon: "ダンジョン",
};

type TabKey = "affection" | "battle" | "production";

const TAB_LABELS: Record<TabKey, string> = {
    affection: "親愛",
    battle: "戦闘",
    production: "生産",
};

interface CardProps {
    char: CharacterInstance;
    invEquipment: EquipmentInstance[];
    gold: number;
    tab: TabKey;
    socializedThisCycle: boolean;
    socialize: (id: string) => void;
    upgradeStarRank: (id: string) => void;
    spendGold: (amount: number) => boolean;
}

function expInLevel(totalExp: number, level: number): number {
    return totalExp - (100 * level * (level - 1)) / 2;
}

function StatCell({ base, bonus }: { base: number; bonus: number }) {
    const total = base + bonus;
    return (
        <span className="text-ink text-sm leading-tight">
            {total}
            {bonus > 0 && (
                <span className="text-success text-[9px] ml-2">
                    ({base}+{bonus})
                </span>
            )}
        </span>
    );
}

function Level({
    level,
    expCur,
    expNeeded,
    color,
    textColor,
}: {
    level: number;
    expCur: number;
    expNeeded: number;
    color?: string;
    textColor?: string;
}) {
    return (
        <div className="flex justify-between">
            <div
                className={`flex w-10 h-10 m-1 justify-center items-center text-2xl font-extrabold ${textColor || "text-accent-strong"}`}
            >
                {level}
            </div>
            <div className="flex-1">
                <span className="text-xs">
                    {expCur} / {expNeeded}
                </span>
                <ProgressBar pct={(expCur / expNeeded) * 100} color={color ?? "bg-accent"} />
            </div>
        </div>
    );
}

function CharacterCard({
    char,
    invEquipment,
    gold,
    tab,
    socializedThisCycle,
    socialize,
    upgradeStarRank,
    spendGold,
}: CardProps) {
    const master = getCharacterMaster(char.masterId);

    function getEquipName(instanceId: string | null): string | null {
        if (!instanceId) return null;
        const inst = invEquipment.find((e) => e.instanceId === instanceId);
        return inst ? (getEquipment(inst.masterId)?.name ?? null) : null;
    }

    const certCost = Math.pow(2, char.starRank - 1);
    const goldCost = STAR_GOLD_COST_FACTOR * char.starRank;
    const canUpgrade = char.certificates >= certCost && gold >= goldCost;

    const stats = calcCharacterStats(char, invEquipment);
    const expCur = expInLevel(char.battleExp, char.battleLevel);
    const expNeeded = 100 * char.battleLevel;

    return (
        <div className="h-80 w-100 bg-surface border border-line rounded-xl overflow-hidden flex flex-row">
            {/* Portrait */}
            <div className="relative w-40 shrink-0 self-stretch block">
                <CharacterPortrait masterId={char.masterId} priority />
            </div>

            {/* Info panel */}
            <div className="w-60 p-2 flex flex-col gap-1 min-w-0">
                {/* Name + tendency + affection lv */}
                <div className="w-full">
                    <div className="w-full flex items-center gap-1 pb-1 mb-2 border-b">
                        <Link
                            href={`./characters/${char.id}/`}
                            className="flex-1 truncate text-md font-extrabold text-ink"
                        >
                            {master?.name ?? char.masterId}
                        </Link>
                        <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full text-white shrink-0 ${TENDENCY_COLOR[char.tendency]}`}
                        >
                            {TENDENCY_LABEL[char.tendency]}
                        </span>
                        <span className="bg-accent text-ink text-xs font-bold px-1 py-0.5 rounded leading-none shrink-0">
                            ★{char.starRank}
                        </span>
                    </div>
                </div>

                {/* Tab: 親愛 */}
                {tab === "affection" && (
                    <div className="space-y-1">
                        <Level
                            level={char.affectionLevel}
                            expCur={char.affectionPoints}
                            expNeeded={char.affectionLevel * 100}
                            color="bg-pink-500"
                            textColor="text-affection"
                        />
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={() => socialize(char.id)}
                                disabled={socializedThisCycle || char.socializedThisCycle}
                                className="px-1.5 py-0.5 rounded bg-pink-800 hover:bg-pink-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                            >
                                {socializedThisCycle
                                    ? "サイクル済み"
                                    : char.socializedThisCycle
                                      ? "交遊済み"
                                      : "交遊"}
                            </button>
                            <button
                                onClick={() => {
                                    spendGold(goldCost);
                                    upgradeStarRank(char.id);
                                }}
                                disabled={!canUpgrade}
                                className="flex flex-col px-1.5 py-0.5 rounded bg-surface-2 hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed text-ink transition-colors"
                            >
                                <span>ランクアップ</span>
                                <span>
                                    {goldCost}G+証書{certCost}枚 ({char.certificates})
                                </span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Tab: 戦闘 */}
                {tab === "battle" && (
                    <div className="space-y-1">
                        <Level
                            level={char.battleLevel}
                            expCur={expCur}
                            expNeeded={expNeeded}
                            color="bg-accent"
                            textColor="text-accent-strong"
                        />

                        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 items-baseline">
                            <span className="text-ink-muted text-sm">HP</span>
                            <StatCell base={stats.base.hp} bonus={stats.bonus.hp} />
                            <span className="text-ink-muted text-sm">攻撃力</span>
                            <StatCell base={stats.base.atk} bonus={stats.bonus.atk} />

                            <span className="text-ink-muted text-sm">防御力</span>
                            <StatCell base={stats.base.def} bonus={stats.bonus.def} />
                            <span className="text-ink-muted text-sm">魔力</span>
                            <StatCell base={stats.base.mag} bonus={stats.bonus.mag} />

                            <span className="text-ink-muted text-sm">魔法防</span>
                            <StatCell base={stats.base.mdef} bonus={stats.bonus.mdef} />
                            <span className="text-ink-muted text-sm">素早さ</span>
                            <StatCell base={stats.base.spd} bonus={stats.bonus.spd} />
                        </div>

                        <div className="text-xs space-y-0.5">
                            <div>⚔ {getEquipName(char.equipment.weapon) ?? "未装備"}</div>
                            <div>🛡 {getEquipName(char.equipment.armor) ?? "未装備"}</div>
                            <div>💍 {getEquipName(char.equipment.accessory) ?? "未装備"}</div>
                        </div>
                    </div>
                )}

                {/* Tab: 生産 */}
                {tab === "production" && (
                    <div className="space-y-2 overflow-y-auto">
                        {(
                            [
                                { label: "農業", lv: char.farmLevel, exp: char.farmExp },
                                { label: "鉱業", lv: char.miningLevel, exp: char.miningExp },
                                { label: "漁業", lv: char.fishingLevel, exp: char.fishingExp },
                                { label: "錬金", lv: char.alchemyLevel, exp: char.alchemyExp },
                                { label: "工芸", lv: char.craftLevel, exp: char.craftExp },
                                { label: "商人", lv: char.merchantLevel, exp: char.merchantExp },
                            ] as const
                        ).map(({ label, lv, exp }) => {
                            const cur = expInLevel(exp, lv);
                            const need = 100 * lv;
                            return (
                                <div key={label}>
                                    <div className="flex justify-between text-xs">
                                        <span>
                                            {label} <span className="">Lv.{lv}</span>
                                        </span>
                                        <span>
                                            {Math.floor(cur)} / {need}
                                        </span>
                                    </div>
                                    <ProgressBar pct={(cur / need) * 100} color="bg-emerald-500" />
                                </div>
                            );
                        })}
                        <div className="text-[10px] text-ink-muted pt-0.5">
                            道具: {getEquipName(char.equipment.tool) ?? "未装備"}
                        </div>
                    </div>
                )}

                {/* Assignment footer */}
                <div className="text-[10px] text-ink-subtle border-t border-line pt-1 mt-auto">
                    {char.assignment ? (
                        <span className="text-ink">
                            {ASSIGNMENT_LABEL[char.assignment.type] ?? char.assignment.type}
                        </span>
                    ) : (
                        <span>待機中</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function CharactersPage() {
    const [tab, setTab] = useState<TabKey>("affection");

    const characters = useCharacterStore((s) => s.characters);
    const socialize = useCharacterStore((s) => s.socialize);
    const upgradeStarRank = useCharacterStore((s) => s.upgradeStarRank);
    const invEquipment = useInventoryStore((s) => s.equipment);
    const gold = useGameStore((s) => s.gold);
    const socializedThisCycle = useGameStore((s) => s.socializedThisCycle);
    const spendGold = useGameStore((s) => s.spendGold);

    if (characters.length === 0) {
        return (
            <div className="p-4 text-center text-ink-muted mt-12">キャラクターがまだいません</div>
        );
    }

    return (
        <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <h1 className="text-lg font-bold text-ink">キャラクター一覧</h1>
                <span className="text-sm text-ink-muted">{characters.length}人</span>
            </div>

            {/* Sticky tab bar */}
            <div className="sticky top-0 z-10 -mx-4 px-4 py-2 mb-3 bg-app border-b border-line-strong">
                <div className="flex gap-2">
                    {(Object.keys(TAB_LABELS) as TabKey[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                                tab === t
                                    ? "bg-accent border-accent-strong text-ink"
                                    : "border-line text-ink-muted hover:border-line-strong hover:text-ink"
                            }`}
                        >
                            {TAB_LABELS[t]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Cards */}
            <div className="flex flex-wrap gap-3">
                {characters.map((char) => (
                    <CharacterCard
                        key={char.id}
                        char={char}
                        invEquipment={invEquipment}
                        gold={gold}
                        tab={tab}
                        socializedThisCycle={socializedThisCycle}
                        socialize={socialize}
                        upgradeStarRank={upgradeStarRank}
                        spendGold={spendGold}
                    />
                ))}
            </div>
        </div>
    );
}
