"use client";

import { useRouter } from "next/navigation";
import { getCharacterMaster } from "@/data/characters";
import CharacterAvatar from "@/app/_components/ui/CharacterAvatar";
import { TENDENCY_LABEL, TENDENCY_COLOR } from "@/app/_components/dungeon/labels";
import type { DungeonBattle } from "@/app/_components/dungeon/useDungeonBattle";

interface Props {
    battle: DungeonBattle;
}

/** パーティ選択画面（未配置キャラから1〜5人を選んで挑戦）。 */
export default function PartySelectView({ battle }: Props) {
    const router = useRouter();
    const { dl, characters, partyIds, toggleParty, startDungeon, getEquipName, effectiveStats } =
        battle;

    // 自動周回中など、何かに配置されているキャラはパーティーに選べない（未配置のみ）
    const eligible = characters.filter((c) => c.assignment === null);

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
                {eligible.map((char) => {
                    const master = getCharacterMaster(char.masterId);
                    const sel = partyIds.includes(char.id);
                    const expCur =
                        char.battleExp - (100 * char.battleLevel * (char.battleLevel - 1)) / 2;
                    const expNeeded = 100 * char.battleLevel;
                    const expPct = Math.min(100, Math.round((expCur / expNeeded) * 100));
                    const weaponName = getEquipName(char.equipment.weapon);
                    const armorName = getEquipName(char.equipment.armor);
                    const st = effectiveStats(char);
                    return (
                        <button
                            key={char.id}
                            onClick={() => toggleParty(char.id)}
                            className={`w-52 rounded-xl p-3 border text-left transition-colors ${
                                sel
                                    ? "bg-surface-2 border-accent-strong text-accent-strong"
                                    : "bg-surface border-line hover:border-line-strong text-ink"
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <CharacterAvatar masterId={char.masterId} size="md" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="text-sm font-semibold truncate">
                                            {master?.name ?? char.masterId}
                                        </span>
                                        <span
                                            className={`text-xs shrink-0 ${TENDENCY_COLOR[char.tendency]}`}
                                        >
                                            {TENDENCY_LABEL[char.tendency]}
                                        </span>
                                    </div>
                                    <div className="text-xs text-ink-muted">
                                        戦闘 Lv.{char.battleLevel}
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

                            {(weaponName || armorName) && (
                                <div className="text-xs text-ink-subtle mt-1 truncate">
                                    {weaponName && `⚔ ${weaponName}`}
                                    {weaponName && armorName ? "　" : ""}
                                    {armorName && `🛡 ${armorName}`}
                                </div>
                            )}

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
                    );
                })}
            </div>
            <button
                onClick={startDungeon}
                disabled={partyIds.length === 0}
                className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl"
            >
                挑戦する
            </button>
        </div>
    );
}
