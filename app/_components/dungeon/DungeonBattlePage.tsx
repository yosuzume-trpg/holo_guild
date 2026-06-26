"use client";

import { useDungeonBattle } from "@/app/_components/dungeon/useDungeonBattle";
import LockedView from "@/app/_components/dungeon/LockedView";
import PartySelectView from "@/app/_components/dungeon/PartySelectView";
import ResultView from "@/app/_components/dungeon/ResultView";
import BranchSelectView from "@/app/_components/dungeon/BranchSelectView";
import BattleScreen from "@/app/_components/dungeon/BattleScreen";

interface Props {
    level: number;
}

/** ダンジョン攻略画面。状態に応じて 5 つのビューへ振り分ける。 */
export default function DungeonBattlePage({ level }: Props) {
    const battle = useDungeonBattle(level);
    const { bs, result, pendingBranch, isLocked, dl, guildRank, unlockedMax } = battle;

    // 進行中バトル(bs)・結果画面でない状態で、上限を超えたDLに来た場合はブロック。
    if (!bs && result === null && isLocked) {
        return <LockedView dl={dl} guildRank={guildRank} unlockedMax={unlockedMax} />;
    }

    if (!bs && result === null) {
        return <PartySelectView battle={battle} />;
    }

    if (result) {
        return <ResultView dl={dl} guildRank={guildRank} result={result} bs={bs} />;
    }

    if (pendingBranch) {
        return <BranchSelectView pendingBranch={pendingBranch} selectBranch={battle.selectBranch} />;
    }

    return <BattleScreen battle={battle} />;
}
