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

/** パーティ選択画面（未配置＋自動周回中のキャラから1〜5人を選んで挑戦）。 */
export default function PartySelectView({ battle }: Props) {
    const router = useRouter();
    const { dl, characters, partyIds } = battle;

    // 未配置キャラに加え、自動周回中（dungeon）のキャラも選択候補として表示する。
    // 未配置を先・周回中を後に並べる。
    const eligible = characters
        .filter((c) => c.assignment === null || c.assignment.type === "dungeon")
        .sort((a, b) => (a.assignment === null ? 0 : 1) - (b.assignment === null ? 0 : 1));

    return (
        <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
                <button
                    onClick={() => router.back()}
                    className="text-sm text-ink-muted hover:text-ink"
                >
                    ← 戻る
                </button>
                <h1 className="text-lg font-bold text-ink">DL{dl} パーティ選択</h1>
            </div>
            <p className="text-xs text-ink-muted mb-3">1〜5人選択 ({partyIds.length}/5)</p>
            <div className="flex flex-wrap gap-2 mb-4">
                {eligible.map((char) => (
                    <PartyMemberCard key={char.id} char={char} battle={battle} />
                ))}
            </div>
            <button
                onClick={battle.startDungeon}
                disabled={partyIds.length === 0}
                className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl"
            >
                挑戦する
            </button>
        </div>
    );
}

/** パーティ選択の1枚のカード。装備変更モーダルの開閉状態を内部に持つ。 */
function PartyMemberCard({ char, battle }: { char: CharacterInstance; battle: DungeonBattle }) {
    const {
        characters,
        invEquipment,
        partyIds,
        toggleParty,
        setAssignment,
        equip,
        effectiveStats,
    } = battle;
    const [equipSlot, setEquipSlot] = useState<EquipmentSlotId | null>(null);

    const master = getCharacterMaster(char.masterId);
    const sel = partyIds.includes(char.id);
    const isCycling = char.assignment?.type === "dungeon";
    const expCur = char.battleExp - (100 * char.battleLevel * (char.battleLevel - 1)) / 2;
    const expNeeded = 100 * char.battleLevel;
    const expPct = Math.min(100, Math.round((expCur / expNeeded) * 100));
    const st = effectiveStats(char);

    // 周回中のキャラは選択時に配置を解除してからパーティへ加える。
    function handleSelect() {
        if (isCycling) setAssignment(char.id, null);
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
                            {isCycling && !sel && (
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
