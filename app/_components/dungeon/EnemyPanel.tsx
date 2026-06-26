"use client";

import type { EnemyInstance } from "@/types/game";
import EnemyAvatar from "@/app/_components/ui/EnemyAvatar";
import {
    ATTR_LABEL,
    ATTR_COLOR,
    ENEMY_TYPE_LABEL,
} from "@/app/_components/dungeon/labels";
import type { EnemyTypeKey } from "@/utils/dungeonBattle";

interface Props {
    enemies: EnemyInstance[];
    /** 攻撃対象を選択中か（攻撃 or 魔法メニュー）。 */
    isTargeting: boolean;
    /** 行動中の敵ID（enemy-action フェーズで強調表示）。 */
    actingEnemyId: string | null;
    onAttack: (enemyId: string) => void;
}

/** 敵カードの一覧。攻撃対象選択中はクリックで攻撃できる。 */
export default function EnemyPanel({ enemies, isTargeting, actingEnemyId, onAttack }: Props) {
    if (enemies.length === 0) return null;
    return (
        <div className="rounded-xl border border-line-strong bg-surface/60 overflow-hidden">
            <div className="flex items-center gap-1 px-2.5 py-1 bg-accent-strong/15 border-b border-line-strong text-xs font-bold text-accent-strong">
                👹 敵
            </div>
            <div className="flex flex-wrap gap-2 p-2 justify-center">
                {enemies.map((e) => {
                    const isActing = e.id === actingEnemyId;
                    const hpPct = (e.hp / e.maxHp) * 100;
                    return (
                        <button
                            key={e.id}
                            onClick={() => isTargeting && e.hp > 0 && onAttack(e.id)}
                            disabled={e.hp <= 0 || !isTargeting}
                            className={`relative flex flex-col items-center gap-1 w-28 rounded-lg border p-2 transition-all ${
                                e.hp <= 0
                                    ? "opacity-40 border-line bg-surface"
                                    : isTargeting
                                      ? "border-accent-strong bg-surface-2 hover:bg-surface-3 cursor-pointer"
                                      : isActing
                                        ? "border-danger bg-red-100 ring-2 ring-danger shadow-md scale-[1.03]"
                                        : "border-line bg-surface"
                            }`}
                        >
                            {isActing && (
                                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-white bg-danger px-1 rounded-full shadow">
                                    ⚡
                                </span>
                            )}
                            <div className="text-xs font-semibold text-ink truncate max-w-full">
                                {ENEMY_TYPE_LABEL[e.type as EnemyTypeKey] ?? e.type}
                            </div>
                            <div className="relative">
                                <EnemyAvatar
                                    enemy={e}
                                    size="xl"
                                    className={e.hp <= 0 ? "grayscale" : ""}
                                />
                                <div className="absolute -bottom-1 -right-1 flex flex-col gap-0.5 items-end">
                                    <span className="text-[9px] leading-none px-1 py-0.5 rounded bg-app/90 border border-line shadow-sm">
                                        ◆
                                        <span
                                            className={
                                                e.attribute
                                                    ? ATTR_COLOR[e.attribute]
                                                    : "text-ink-subtle"
                                            }
                                        >
                                            {e.attribute ? ATTR_LABEL[e.attribute] : "無"}
                                        </span>
                                    </span>
                                </div>
                            </div>
                            <div className="relative w-full h-4 rounded bg-surface-2 overflow-hidden">
                                <div
                                    className="absolute inset-y-0 left-0 rounded bg-red-500 transition-all"
                                    style={{ width: `${hpPct}%` }}
                                />
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-ink [text-shadow:0_0_2px_rgb(255_255_255)]">
                                    {e.hp}/{e.maxHp}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
