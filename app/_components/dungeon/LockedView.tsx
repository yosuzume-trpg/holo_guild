"use client";

import { useRouter } from "next/navigation";

interface Props {
    dl: number;
    guildRank: number;
    unlockedMax: number;
}

/** 解放条件を満たしていないDLに来たときのブロック画面。 */
export default function LockedView({ dl, guildRank, unlockedMax }: Props) {
    const router = useRouter();
    const overGrCap = dl > guildRank * 10;
    return (
        <div className="p-4">
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => router.push("/dungeon")}
                    className="text-sm text-ink-muted hover:text-ink"
                >
                    ← 戻る
                </button>
                <h1 className="text-lg font-bold text-ink">DL{dl}</h1>
            </div>
            <div className="bg-surface border border-line rounded-xl p-6 text-center space-y-2">
                <div className="text-2xl">🔒</div>
                <div className="text-sm font-semibold text-ink">
                    このダンジョンにはまだ挑戦できません
                </div>
                <div className="text-xs text-ink-muted">
                    {overGrCap
                        ? `挑戦できるのは DL${guildRank * 10} まで（GR${guildRank}×10）です。DL${guildRank * 10} をクリアし「ギルド → ランクアップ」で GR${guildRank + 1} に上げると解放されます。`
                        : `前のダンジョンをクリアすると解放されます（現在の解放上限: DL${unlockedMax}）。`}
                </div>
            </div>
        </div>
    );
}
