"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getCharacterMaster } from "@/data/characters";
import CharacterAvatar from "@/app/_components/ui/CharacterAvatar";
import EquipSlot from "@/app/_components/ui/EquipSlot";
import EquipModal from "@/app/_components/ui/EquipModal";
import { TENDENCY_LABEL, TENDENCY_COLOR } from "@/app/_components/dungeon/labels";
import type { DungeonBattle } from "@/app/_components/dungeon/useDungeonBattle";
import type { CharacterInstance, EquipmentSlot as EquipmentSlotId } from "@/types/game";

interface Props {
    battle: DungeonBattle;
}

type SortMode = "default" | "level" | "weapon" | "attack" | "magic";
const SORT_OPTIONS: { value: SortMode; label: string }[] = [
    { value: "default", label: "デフォルト" },
    { value: "level", label: "レベル順" },
    { value: "weapon", label: "武器名順" },
    { value: "attack", label: "攻撃力順" },
    { value: "magic", label: "魔力順" },
];

/** パーティ選択画面（未配置＋自動周回中のキャラから1〜5人を選んで挑戦）。 */
export default function PartySelectView({ battle }: Props) {
    const router = useRouter();
    const { dl, characters, partyIds, getEquipName, effectiveStats } = battle;
    const [sortMode, setSortMode] = useState<SortMode>("default");

    // 未配置キャラに加え、自動周回中（dungeon）のキャラも選択候補として表示する。
    // 周回配置は解除せずパーティに編成でき、攻略中だけ周回報酬が止まる。
    const eligible = characters.filter(
        (c) => c.assignment === null || c.assignment.type === "dungeon",
    );

    // デフォルトは「未配置を先・周回中を後」。他は各キー降順（武器名のみ昇順・未装備は末尾）。
    const sorted = [...eligible].sort((a, b) => {
        switch (sortMode) {
            case "level":
                return b.battleLevel - a.battleLevel;
            case "attack":
                return effectiveStats(b).atk - effectiveStats(a).atk;
            case "magic":
                return effectiveStats(b).mag - effectiveStats(a).mag;
            case "weapon": {
                const wa = getEquipName(a.equipment.weapon) ?? "";
                const wb = getEquipName(b.equipment.weapon) ?? "";
                if (!wa && !wb) return 0;
                if (!wa) return 1; // 未装備は末尾へ
                if (!wb) return -1;
                return wa.localeCompare(wb, "ja");
            }
            default:
                return (a.assignment === null ? 0 : 1) - (b.assignment === null ? 0 : 1);
        }
    });

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center gap-3 mb-4">
                <button
                    onClick={() => router.back()}
                    className="text-sm text-ink-muted hover:text-ink"
                >
                    ← 戻る
                </button>
                <h1 className="text-lg font-bold text-ink">DL{dl} パーティ選択</h1>
            </div>
            <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs text-ink-muted">1〜5人選択 ({partyIds.length}/5)</p>
                <label className="flex items-center gap-1 text-xs text-ink-muted">
                    並び替え
                    <select
                        value={sortMode}
                        onChange={(e) => setSortMode(e.target.value as SortMode)}
                        className="bg-surface border border-line rounded px-1.5 py-1 text-ink"
                    >
                        {SORT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            <div className="flex flex-wrap gap-2">
                {sorted.map((char) => (
                    <PartyMemberCard key={char.id} char={char} battle={battle} />
                ))}
            </div>
            </div>
            <div className="shrink-0 border-t border-line bg-surface p-3">
                <button
                    onClick={battle.startDungeon}
                    disabled={partyIds.length === 0}
                    className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl"
                >
                    挑戦する
                </button>
            </div>
        </div>
    );
}

/** パーティ選択の1枚のカード。装備変更モーダルの開閉状態を内部に持つ。 */
function PartyMemberCard({ char, battle }: { char: CharacterInstance; battle: DungeonBattle }) {
    const { characters, invEquipment, partyIds, toggleParty, equip, effectiveStats } = battle;
    const [equipSlot, setEquipSlot] = useState<EquipmentSlotId | null>(null);

    const master = getCharacterMaster(char.masterId);
    const sel = partyIds.includes(char.id);
    const isCycling = char.assignment?.type === "dungeon";
    const expCur = char.battleExp - (100 * char.battleLevel * (char.battleLevel - 1)) / 2;
    const expNeeded = 100 * char.battleLevel;
    const expPct = Math.min(100, Math.round((expCur / expNeeded) * 100));
    const st = effectiveStats(char);

    // 周回配置は解除せずパーティに加える（攻略中のみ周回報酬が止まる）。
    function handleSelect() {
        toggleParty(char.id);
    }

    return (
        <div
            className={`w-56 rounded-xl p-3 border ${
                sel ? "bg-surface-2 border-accent-strong" : "bg-surface border-line"
            }`}
        >
            <button onClick={handleSelect} className="w-full text-left">
                <div className="flex items-center gap-2 mb-1">
                    <CharacterAvatar masterId={char.masterId} size="md" />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                            <span
                                className={`text-sm font-semibold truncate ${sel ? "text-accent-strong" : "text-ink"}`}
                            >
                                {master?.name ?? char.masterId}
                            </span>
                            <span className={`text-xs shrink-0 ${TENDENCY_COLOR[char.tendency]}`}>
                                {TENDENCY_LABEL[char.tendency]}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                            <span>戦闘 Lv.{char.battleLevel}</span>
                            {isCycling && (
                                <span className="text-[10px] text-accent-strong bg-accent-strong/15 px-1 rounded">
                                    🔄 周回中
                                </span>
                            )}
                            {sel && (
                                <span className="text-[10px] text-accent-strong">✓ 選択中</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 戦闘ステータス（合計値・HP含む） */}
                <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 text-[11px] text-ink-muted">
                    <span>HP {st.hp}</span>
                    <span>攻 {st.atk}</span>
                    <span>防 {st.def}</span>
                    <span>魔 {st.mag}</span>
                    <span>魔防 {st.mdef}</span>
                    <span>速 {st.spd}</span>
                </div>

                <div className="mt-1.5">
                    <div className="flex justify-between text-xs text-ink-muted mb-0.5">
                        <span>EXP</span>
                        <span>
                            {expCur}/{expNeeded}
                        </span>
                    </div>
                    <div className="w-full h-1 bg-surface-2 rounded-full">
                        <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${expPct}%` }}
                        />
                    </div>
                </div>
            </button>

            {/* 装備スロット（武器・防具・アクセサリー、タップで変更） */}
            <div className="grid grid-cols-3 gap-1 mt-2">
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
        </div>
    );
}
