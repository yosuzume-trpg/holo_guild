"use client";

import { DUNGEON_STAGE_COUNT } from "@/data/constants";
import { stageTypeBadge } from "@/app/_components/dungeon/labels";
import EnemyPanel from "@/app/_components/dungeon/EnemyPanel";
import BattleLog from "@/app/_components/dungeon/BattleLog";
import PartyPanel from "@/app/_components/dungeon/PartyPanel";
import BattleActionBar from "@/app/_components/dungeon/BattleActionBar";
import type { DungeonBattle } from "@/app/_components/dungeon/useDungeonBattle";

interface Props {
    battle: DungeonBattle;
}

/** 戦闘画面本体。敵・ログ・パーティ・行動バーをまとめる。bs は非null前提。 */
export default function BattleScreen({ battle }: Props) {
    const {
        dl,
        bs,
        characters,
        invEquipment,
        action,
        setAction,
        setSelectedItem,
        dungeonItems,
        effectiveStats,
        handleAttack,
        handleUseItem,
        handleRetreat,
        handleNextStage,
        handleClear,
    } = battle;
    if (!bs) return null;

    const slot = bs.turnOrder[bs.currentTurnIndex];
    const isPlayerTurn = !!slot?.isPlayer && bs.battlePhase === "player-action";
    const actingChar = isPlayerTurn ? (characters.find((c) => c.id === slot.id) ?? null) : null;
    const actingEffStats = actingChar ? effectiveStats(actingChar) : null;
    // 行動中の敵（enemy-action フェーズのときだけ）を強調表示するためのID
    const actingEnemyId =
        bs.battlePhase === "enemy-action" && slot && !slot.isPlayer ? slot.id : null;
    const actingEnemy = actingEnemyId
        ? (bs.enemies.find((e) => e.id === actingEnemyId) ?? null)
        : null;
    const actingCharId = isPlayerTurn ? (slot?.id ?? null) : null;

    const isTargeting = action === "attack" || action === "magic";

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-surface border-b border-line px-4 py-2 shrink-0">
                <div className="text-sm font-semibold text-ink">
                    DL{dl} — {bs.currentStage + 1}/{DUNGEON_STAGE_COUNT}ステージ
                    <span className="ml-2 text-xs text-ink-muted">{stageTypeBadge(bs.stageType)}</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                <EnemyPanel
                    enemies={bs.enemies}
                    isTargeting={isTargeting}
                    actingEnemyId={actingEnemyId}
                    onAttack={(id) => handleAttack(id, action === "magic")}
                />

                <BattleLog log={bs.log} />

                <PartyPanel
                    bs={bs}
                    characters={characters}
                    invEquipment={invEquipment}
                    actingCharId={actingCharId}
                    isItemTarget={action === "item-target"}
                    onUseItem={handleUseItem}
                />
            </div>

            <BattleActionBar
                bs={bs}
                isPlayerTurn={isPlayerTurn}
                actingChar={actingChar}
                actingEffStats={actingEffStats}
                actingEnemy={actingEnemy}
                action={action}
                setAction={setAction}
                dungeonItems={dungeonItems}
                setSelectedItem={setSelectedItem}
                onClear={() => handleClear(bs)}
                onRetreat={handleRetreat}
                onNextStage={handleNextStage}
            />
        </div>
    );
}
