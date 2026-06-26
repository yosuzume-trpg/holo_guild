"use client";

import type { CharacterInstance, EquipmentInstance } from "@/types/game";
import type { StoredBattle } from "@/store/dungeonStore";
import { getCharacterMaster } from "@/data/characters";
import { calcMaxHp } from "@/utils/characterStats";
import { charEquipAttr } from "@/utils/dungeonBattle";
import CharacterAvatar from "@/app/_components/ui/CharacterAvatar";
import { ATTR_LABEL, ATTR_COLOR, BUFF_SHORT } from "@/app/_components/dungeon/labels";

interface Props {
    bs: StoredBattle;
    characters: CharacterInstance[];
    invEquipment: EquipmentInstance[];
    /** 行動中の味方キャラID（player-action フェーズで強調表示）。 */
    actingCharId: string | null;
    /** アイテムの対象選択中か。 */
    isItemTarget: boolean;
    onUseItem: (charId: string) => void;
}

/** パーティ（味方）カードの一覧。アイテム対象選択中はクリックで使用対象を選べる。 */
export default function PartyPanel({
    bs,
    characters,
    invEquipment,
    actingCharId,
    isItemTarget,
    onUseItem,
}: Props) {
    return (
        <div className="rounded-xl border border-line-strong bg-surface/60 overflow-hidden">
            <div className="flex items-center gap-1 px-2.5 py-1 bg-accent-strong/15 border-b border-line-strong text-xs font-bold text-accent-strong">
                🛡 パーティ
            </div>
            <div className="flex flex-wrap gap-2 p-2 justify-center">
                {bs.partyIds.map((charId) => {
                    const char = characters.find((c) => c.id === charId)!;
                    if (!char) return null;
                    const master = getCharacterMaster(char.masterId);
                    const maxHp = calcMaxHp(char, invEquipment);
                    const hp = bs.partyHps[charId] ?? maxHp;
                    const hpPct = (hp / maxHp) * 100;
                    const isActing = actingCharId === charId;
                    const buffs = bs.partyBuffs[charId] ?? [];
                    const atkAttr = charEquipAttr(char, "weapon", invEquipment);
                    const defAttr = charEquipAttr(char, "armor", invEquipment);
                    return (
                        <button
                            key={charId}
                            onClick={() => isItemTarget && hp > 0 && onUseItem(charId)}
                            disabled={hp <= 0 || !isItemTarget}
                            className={`relative flex flex-col items-center gap-1 w-28 rounded-lg border p-2 transition-all ${
                                hp <= 0
                                    ? "opacity-40 border-line bg-surface"
                                    : isItemTarget
                                      ? "border-accent-strong bg-surface-2 hover:bg-surface-3 cursor-pointer"
                                      : isActing
                                        ? "border-accent-strong bg-accent-soft ring-2 ring-accent-strong shadow-md scale-[1.03]"
                                        : "border-line bg-surface"
                            }`}
                        >
                            {isActing && (
                                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-white bg-accent-strong px-1 rounded-full shadow">
                                    ⚡
                                </span>
                            )}
                            <div className="text-xs font-semibold text-ink truncate max-w-full">
                                {master?.name}
                            </div>
                            <div className="relative">
                                <CharacterAvatar
                                    masterId={char.masterId}
                                    size="xl"
                                    className={hp <= 0 ? "grayscale" : ""}
                                />
                                <div className="absolute -bottom-1 -right-1 flex flex-col gap-0.5 items-end">
                                    <span className="text-[9px] leading-none px-1 py-0.5 rounded bg-app/90 border border-line shadow-sm">
                                        ⚔
                                        <span
                                            className={
                                                atkAttr ? ATTR_COLOR[atkAttr] : "text-ink-subtle"
                                            }
                                        >
                                            {atkAttr ? ATTR_LABEL[atkAttr] : "無"}
                                        </span>
                                    </span>
                                    <span className="text-[9px] leading-none px-1 py-0.5 rounded bg-app/90 border border-line shadow-sm">
                                        🛡
                                        <span
                                            className={
                                                defAttr ? ATTR_COLOR[defAttr] : "text-ink-subtle"
                                            }
                                        >
                                            {defAttr ? ATTR_LABEL[defAttr] : "無"}
                                        </span>
                                    </span>
                                </div>
                            </div>
                            <div className="relative w-full h-4 rounded bg-surface-2 overflow-hidden">
                                <div
                                    className={`absolute inset-y-0 left-0 rounded transition-all ${hpPct > 50 ? "bg-green-500" : hpPct > 25 ? "bg-accent" : "bg-red-500"}`}
                                    style={{ width: `${hpPct}%` }}
                                />
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-ink [text-shadow:0_0_2px_rgb(255_255_255)]">
                                    {hp}/{maxHp}
                                </span>
                            </div>
                            {buffs.length > 0 && (
                                <div className="flex gap-0.5 flex-wrap justify-center">
                                    {buffs.map((b, i) => (
                                        <span
                                            key={i}
                                            className="text-[9px] bg-blue-900 text-accent-strong px-0.5 rounded"
                                        >
                                            {BUFF_SHORT[b.type] ?? b.type}
                                            {b.turnsRemaining}T
                                        </span>
                                    ))}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
