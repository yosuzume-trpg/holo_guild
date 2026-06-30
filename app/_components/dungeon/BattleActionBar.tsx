"use client";

import type { CharacterInstance, CharacterStats, EnemyInstance } from "@/types/game";
import type { StoredBattle } from "@/store/dungeonStore";
import { getCharacterMaster } from "@/data/characters";
import CharacterAvatar from "@/app/_components/ui/CharacterAvatar";
import { DUNGEON_ITEMS, getRecipe } from "@/data/recipes";
import { DUNGEON_STAGE_COUNT } from "@/data/constants";
import { ATTR_LABEL, ATTR_COLOR } from "@/app/_components/dungeon/labels";
import type { ActionMode } from "@/app/_components/dungeon/useDungeonBattle";
import { getEquipment } from "@/data/equipment";
import { useInventoryStore } from "@/store/inventoryStore";

interface Props {
    bs: StoredBattle;
    isPlayerTurn: boolean;
    actingChar: CharacterInstance | null;
    actingEffStats: CharacterStats | null;
    actingEnemy: EnemyInstance | null;
    action: ActionMode;
    setAction: (a: ActionMode) => void;
    dungeonItems: Record<string, number>;
    setSelectedItem: (id: string) => void;
    onClear: () => void;
    onRetreat: () => void;
    onNextStage: () => void;
}

/** 画面下部の行動バー。結果フェーズ・プレイヤーターン・敵ターンで内容が切り替わる。 */
export default function BattleActionBar({
    bs,
    isPlayerTurn,
    actingChar,
    actingEffStats,
    actingEnemy,
    action,
    setAction,
    dungeonItems,
    setSelectedItem,
    onClear,
    onRetreat,
    onNextStage,
}: Props) {
    const invEquipment = useInventoryStore((s) => s.equipment);
    return (
        <div className="border-t border-line bg-surface p-3 shrink-0">
            {bs.battlePhase === "result" ? (
                bs.currentStage + 1 >= DUNGEON_STAGE_COUNT ? (
                    // Final stage cleared: call handleClear directly (must NOT be inside setBs updater)
                    <button
                        onClick={onClear}
                        className="w-full bg-accent hover:bg-accent-strong text-ink font-bold py-2.5 rounded-lg"
                    >
                        🎉 ダンジョンクリア！
                    </button>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={onRetreat}
                            className="bg-surface-2 hover:bg-surface-3 border border-line-strong text-ink font-bold py-2.5 rounded-lg text-sm"
                        >
                            撤退 (50%)
                        </button>
                        <button
                            onClick={onNextStage}
                            className="bg-accent hover:bg-accent-strong text-ink font-bold py-2.5 rounded-lg text-sm"
                        >
                            次のステージへ →
                        </button>
                    </div>
                )
            ) : isPlayerTurn && actingChar ? (
                <div>
                    <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-2">
                        <CharacterAvatar masterId={actingChar.masterId} size="xs" />
                        {getCharacterMaster(actingChar.masterId)?.name} のターン
                        {(() => {
                            const weaponInst = invEquipment.find(
                                (e) => e.instanceId === actingChar.equipment.weapon,
                            );
                            const weapon = weaponInst ? getEquipment(weaponInst.masterId) : null;
                            if (!weapon) return null;
                            return (
                                <span className="ml-1">
                                    {weapon.attribute && (
                                        <span className={ATTR_COLOR[weapon.attribute]}>
                                            [{ATTR_LABEL[weapon.attribute]}]
                                        </span>
                                    )}
                                </span>
                            );
                        })()}
                    </div>
                    {action === "menu" && (
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setAction("attack")}
                                className="bg-red-800 hover:bg-red-700 text-white py-2 rounded text-sm font-bold leading-tight"
                            >
                                <div>攻撃</div>
                                <div className="text-xs font-normal opacity-80">
                                    ATK {actingEffStats?.atk}
                                </div>
                            </button>
                            <button
                                onClick={() => setAction("magic")}
                                className="bg-purple-800 hover:bg-purple-700 text-white py-2 rounded text-sm font-bold leading-tight"
                            >
                                <div>魔法</div>
                                <div className="text-xs font-normal opacity-80">
                                    MAG {actingEffStats?.mag}
                                </div>
                            </button>
                            <button
                                onClick={() => setAction("item")}
                                className="bg-surface-3 hover:bg-surface-3 text-ink py-2 rounded text-sm font-bold"
                            >
                                アイテム
                            </button>
                        </div>
                    )}
                    {(action === "attack" || action === "magic") && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setAction("menu")}
                                className="text-xs text-ink-muted hover:text-ink border border-line px-2 py-1 rounded"
                            >
                                ← 戻る
                            </button>
                            <span className="text-xs text-ink-muted">↑ 攻撃する敵を選択</span>
                        </div>
                    )}
                    {action === "item" && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <button
                                    onClick={() => setAction("menu")}
                                    className="text-xs text-ink-muted hover:text-ink border border-line px-2 py-1 rounded"
                                >
                                    ← 戻る
                                </button>
                                <span className="text-xs text-ink-muted">アイテムを選択</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                                {DUNGEON_ITEMS.map((itemId) => {
                                    const qty = dungeonItems[itemId] ?? 0;
                                    const recipe = getRecipe(itemId);
                                    return (
                                        <button
                                            key={itemId}
                                            disabled={qty <= 0}
                                            onClick={() => {
                                                setSelectedItem(itemId);
                                                setAction("item-target");
                                            }}
                                            className="bg-surface-2 hover:bg-surface-3 disabled:opacity-40 border border-line rounded p-2 text-left text-xs"
                                        >
                                            <div className="text-ink font-medium">
                                                {recipe?.name}
                                            </div>
                                            <div className="text-ink-muted">残り{qty}個</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {action === "item-target" && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setAction("item")}
                                className="text-xs text-ink-muted hover:text-ink border border-line px-2 py-1 rounded"
                            >
                                ← 戻る
                            </button>
                            <span className="text-xs text-ink-muted">↑ 対象キャラクターを選択</span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center text-sm text-danger py-1">
                    {actingEnemy ? (
                        <>
                            🔴 {actingEnemy.type}
                            {actingEnemy.attribute && `[${ATTR_LABEL[actingEnemy.attribute]}]`}{" "}
                            の行動...
                        </>
                    ) : (
                        "敵のターン..."
                    )}
                </div>
            )}
        </div>
    );
}
