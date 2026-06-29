"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CharacterPortrait from "@/app/_components/ui/CharacterPortrait";
import EquipModal from "@/app/_components/ui/EquipModal";
import EquipSlot from "@/app/_components/ui/EquipSlot";
import CutinPopup from "@/app/_components/ui/CutinPopup";
import AffectionBadge from "@/app/_components/ui/AffectionBadge";
import RankBadge from "@/app/_components/ui/RankBadge";
import { useCharacterStore } from "@/store/characterStore";
import { useInventoryStore } from "@/store/inventoryStore";
import { useGameStore } from "@/store/gameStore";
import { getCharacterMaster } from "@/data/characters";
import { STAR_GOLD_COST_FACTOR } from "@/data/constants";
import { calcCharacterStats } from "@/utils/characterStats";
import ProgressBar from "@/app/_components/ui/ProgressBar";
import type { CharacterInstance, EquipmentInstance, EquipmentSlot } from "@/types/game";

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
    battle: "戦闘",
    affection: "親愛",
    production: "生産",
};

type SortKey =
    | "default"
    | "rankUpReady"
    | "battleLevel"
    | "affectionLevel"
    | "starRank"
    | "certificates"
    | "farm"
    | "mining"
    | "fishing"
    | "alchemy"
    | "craft"
    | "merchant";

// 各ソートの主キー(primary)と、同値時に参照する副キー(secondary)。
// 副キーは「○○レベル/○○経験値」のようにスラッシュの後ろの値に対応する。
type NumericSortKey = Exclude<SortKey, "default" | "rankUpReady">;

const SORT_CONFIG: Record<
    NumericSortKey,
    {
        label: string;
        primary: (c: CharacterInstance) => number;
        secondary?: (c: CharacterInstance) => number;
    }
> = {
    battleLevel: {
        label: "戦闘レベル / 戦闘経験値",
        primary: (c) => c.battleLevel,
        secondary: (c) => c.battleExp,
    },
    affectionLevel: {
        label: "親愛度 / 親愛ポイント",
        primary: (c) => c.affectionLevel,
        secondary: (c) => c.affectionPoints,
    },
    starRank: { label: "★ランク", primary: (c) => c.starRank },
    certificates: { label: "所持証書", primary: (c) => c.certificates },
    farm: {
        label: "農業レベル / 農業経験値",
        primary: (c) => c.farmLevel,
        secondary: (c) => c.farmExp,
    },
    mining: {
        label: "鉱業レベル / 鉱業経験値",
        primary: (c) => c.miningLevel,
        secondary: (c) => c.miningExp,
    },
    fishing: {
        label: "漁業レベル / 漁業経験値",
        primary: (c) => c.fishingLevel,
        secondary: (c) => c.fishingExp,
    },
    alchemy: {
        label: "錬金レベル / 錬金経験値",
        primary: (c) => c.alchemyLevel,
        secondary: (c) => c.alchemyExp,
    },
    craft: {
        label: "工芸レベル / 工芸経験値",
        primary: (c) => c.craftLevel,
        secondary: (c) => c.craftExp,
    },
    merchant: {
        label: "商人レベル / 商人経験値",
        primary: (c) => c.merchantLevel,
        secondary: (c) => c.merchantExp,
    },
};

// タブごとに表示する並び順の選択肢（先頭がそのタブのデフォルト）。
const TAB_SORT_OPTIONS: Record<TabKey, SortKey[]> = {
    battle: ["battleLevel", "starRank", "certificates"],
    affection: ["affectionLevel", "rankUpReady", "starRank", "certificates"],
    production: ["default", "farm", "mining", "fishing", "alchemy", "craft", "merchant"],
};

const SORT_LABELS: Record<SortKey, string> = {
    default: "デフォルト",
    rankUpReady: "ランクアップ可能順",
    ...Object.fromEntries(
        (Object.keys(SORT_CONFIG) as NumericSortKey[]).map((k) => [k, SORT_CONFIG[k].label]),
    ),
} as Record<SortKey, string>;

// キャラの所在地フィルター。
type LocationFilter = "all" | "production" | "guild" | "dungeon" | "idle";

const LOCATION_FILTER_LABELS: Record<LocationFilter, string> = {
    all: "すべての所在",
    production: "生産施設",
    guild: "ギルド",
    dungeon: "ダンジョン",
    idle: "待機中",
};

const PRODUCTION_ASSIGNMENTS = new Set(["farm", "mining", "fishing", "alchemy"]);
const GUILD_ASSIGNMENTS = new Set(["merchant", "craft"]);

function matchesLocation(char: CharacterInstance, filter: LocationFilter): boolean {
    if (filter === "all") return true;
    const type = char.assignment?.type;
    if (filter === "idle") return !type;
    if (!type) return false;
    if (filter === "production") return PRODUCTION_ASSIGNMENTS.has(type);
    if (filter === "guild") return GUILD_ASSIGNMENTS.has(type);
    return type === "dungeon";
}

// 証書とゴールドが揃って★ランクアップ可能か。CharacterCard の canUpgrade と同条件。
function canRankUp(char: CharacterInstance, gold: number): boolean {
    const certCost = Math.pow(2, char.starRank - 1);
    const goldCost = STAR_GOLD_COST_FACTOR * char.starRank;
    return char.certificates >= certCost && gold >= goldCost;
}

interface CardProps {
    char: CharacterInstance;
    characters: CharacterInstance[];
    invEquipment: EquipmentInstance[];
    gold: number;
    tab: TabKey;
    socializedThisCycle: boolean;
    socialize: (id: string) => void;
    upgradeStarRank: (id: string) => void;
    spendGold: (amount: number) => boolean;
    equip: (id: string, slot: EquipmentSlot, equipInstanceId: string | null) => void;
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
    heart,
}: {
    level: number;
    expCur: number;
    expNeeded: number;
    color?: string;
    textColor?: string;
    heart?: boolean;
}) {
    return (
        <div className="flex justify-between">
            {heart ? (
                <AffectionBadge level={level} className="w-10 h-10 m-1 text-2xl" />
            ) : (
                <div
                    className={`flex w-10 h-10 m-1 justify-center items-center text-2xl font-extrabold ${textColor || "text-accent-strong"}`}
                >
                    {level}
                </div>
            )}
            <div className="flex-1">
                <span className="text-xs">
                    {expCur} / {expNeeded}
                </span>
                <ProgressBar pct={(expCur / expNeeded) * 100} color={color ?? "bg-accent"} />
            </div>
        </div>
    );
}

// 装備スロット1枠。装備アイコンの上に★ランク・装備名を小さく重ねて表示。クリックで変更。
function CharacterCard({
    char,
    characters,
    invEquipment,
    gold,
    tab,
    socializedThisCycle,
    socialize,
    upgradeStarRank,
    spendGold,
    equip,
}: CardProps) {
    const master = getCharacterMaster(char.masterId);
    const [equipSlot, setEquipSlot] = useState<EquipmentSlot | null>(null);
    const [showCutin, setShowCutin] = useState(false);
    const [showPresentCutin, setShowPresentCutin] = useState(false);
    const safeMode = useGameStore((s) => s.safeMode);
    const presentGift = useCharacterStore((s) => s.presentGift);
    const magicpuffCount = useInventoryStore((s) => s.materials["magicpuff"] ?? 0);

    const certCost = Math.pow(2, char.starRank - 1);
    const goldCost = STAR_GOLD_COST_FACTOR * char.starRank;
    const canUpgrade = canRankUp(char, gold);

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
                        <RankBadge rank={char.starRank} className="w-6 h-6 text-xs shrink-0" />
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
                            heart
                        />
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={() => {
                                    socialize(char.id);
                                    if (!safeMode) setShowCutin(true);
                                }}
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
                            <button
                                onClick={() => {
                                    if (presentGift(char.id) && !safeMode)
                                        setShowPresentCutin(true);
                                }}
                                disabled={magicpuffCount <= 0}
                                className="px-1.5 py-0.5 rounded bg-purple-800 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                            >
                                プレゼント（マジックパフ {magicpuffCount}）
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

                        <div className="grid grid-cols-3 gap-1">
                            <EquipSlot
                                instanceId={char.equipment.weapon}
                                invEquipment={invEquipment}
                                onClick={() => setEquipSlot("weapon")}
                            />
                            <EquipSlot
                                instanceId={char.equipment.armor}
                                invEquipment={invEquipment}
                                onClick={() => setEquipSlot("armor")}
                            />
                            <EquipSlot
                                instanceId={char.equipment.accessory}
                                invEquipment={invEquipment}
                                onClick={() => setEquipSlot("accessory")}
                            />
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
                                {
                                    label: "商人",
                                    lv: char.merchantLevel,
                                    exp: char.merchantExp,
                                },
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
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-ink-muted">道具</span>
                            <div className="w-1/4">
                                <EquipSlot
                                    instanceId={char.equipment.tool}
                                    invEquipment={invEquipment}
                                    onClick={() => setEquipSlot("tool")}
                                />
                            </div>
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

            {equipSlot && (
                <EquipModal
                    char={char}
                    slot={equipSlot}
                    characters={characters}
                    equipment={invEquipment}
                    equip={equip}
                    onClose={() => setEquipSlot(null)}
                />
            )}

            {showCutin && (
                <CutinPopup masterId={char.masterId} onClose={() => setShowCutin(false)} />
            )}

            {showPresentCutin && (
                <CutinPopup
                    masterId={char.masterId}
                    variant="cutin_present"
                    onClose={() => setShowPresentCutin(false)}
                />
            )}
        </div>
    );
}

export default function CharactersPage() {
    const [tab, setTab] = useState<TabKey>("battle");
    // タブごとの並び順を保持（タブ切替で前回の選択を維持）。
    const [sortByTab, setSortByTab] = useState<Record<TabKey, SortKey>>({
        battle: "battleLevel",
        affection: "affectionLevel",
        production: "default",
    });
    const sortKey = sortByTab[tab];
    // 所在地フィルター（タブ横断で共通）。
    const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");

    const characters = useCharacterStore((s) => s.characters);
    const socialize = useCharacterStore((s) => s.socialize);
    const upgradeStarRank = useCharacterStore((s) => s.upgradeStarRank);
    const equip = useCharacterStore((s) => s.equip);
    const invEquipment = useInventoryStore((s) => s.equipment);
    const gold = useGameStore((s) => s.gold);
    const socializedThisCycle = useGameStore((s) => s.socializedThisCycle);
    const spendGold = useGameStore((s) => s.spendGold);

    // 所在地で絞り込み → 選択された並び順で降順ソート。同値の場合は副キー（スラッシュの後の値）を参照。
    const visibleCharacters = useMemo(() => {
        const filtered =
            locationFilter === "all"
                ? characters
                : characters.filter((c) => matchesLocation(c, locationFilter));
        if (sortKey === "default") return filtered;
        if (sortKey === "rankUpReady") {
            // ランクアップ可能なキャラを先頭へ。同値は所持証書の多い順。
            return [...filtered].sort((a, b) => {
                const diff = Number(canRankUp(b, gold)) - Number(canRankUp(a, gold));
                if (diff !== 0) return diff;
                return b.certificates - a.certificates;
            });
        }
        const cfg = SORT_CONFIG[sortKey];
        return [...filtered].sort((a, b) => {
            const diff = cfg.primary(b) - cfg.primary(a);
            if (diff !== 0) return diff;
            return cfg.secondary ? cfg.secondary(b) - cfg.secondary(a) : 0;
        });
    }, [characters, sortKey, locationFilter, gold]);

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
                <span className="text-sm text-ink-muted">
                    {locationFilter === "all"
                        ? `${characters.length}人`
                        : `${visibleCharacters.length} / ${characters.length}人`}
                </span>
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

                {/* Sort / filter selectors */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                    <div className="flex items-center gap-2">
                        <label htmlFor="character-sort" className="text-xs text-ink-muted shrink-0">
                            並び替え
                        </label>
                        <select
                            id="character-sort"
                            value={sortKey}
                            onChange={(e) =>
                                setSortByTab((prev) => ({
                                    ...prev,
                                    [tab]: e.target.value as SortKey,
                                }))
                            }
                            className="bg-app border border-line rounded px-2 py-1 text-sm text-ink"
                        >
                            {TAB_SORT_OPTIONS[tab].map((key) => (
                                <option key={key} value={key}>
                                    {SORT_LABELS[key]}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label
                            htmlFor="character-location"
                            className="text-xs text-ink-muted shrink-0"
                        >
                            所在地
                        </label>
                        <select
                            id="character-location"
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value as LocationFilter)}
                            className="bg-app border border-line rounded px-2 py-1 text-sm text-ink"
                        >
                            {(Object.keys(LOCATION_FILTER_LABELS) as LocationFilter[]).map(
                                (key) => (
                                    <option key={key} value={key}>
                                        {LOCATION_FILTER_LABELS[key]}
                                    </option>
                                ),
                            )}
                        </select>
                    </div>
                </div>
            </div>

            {/* Cards */}
            {visibleCharacters.length === 0 ? (
                <div className="p-4 text-center text-ink-muted mt-8">
                    該当するキャラクターがいません
                </div>
            ) : (
                <div className="flex flex-wrap gap-3">
                    {visibleCharacters.map((char) => (
                        <CharacterCard
                            key={char.id}
                            char={char}
                            characters={characters}
                            invEquipment={invEquipment}
                            gold={gold}
                            tab={tab}
                            socializedThisCycle={socializedThisCycle}
                            socialize={socialize}
                            upgradeStarRank={upgradeStarRank}
                            spendGold={spendGold}
                            equip={equip}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
