"use client";

import type { StageType } from "@/types/game";
import { BRANCH_LABEL, BRANCH_ICON } from "@/app/_components/dungeon/labels";

interface Props {
    pendingBranch: { stage: number; options: [StageType, StageType] };
    selectBranch: (type: StageType) => void;
}

/** ステージ分岐の選択画面。 */
export default function BranchSelectView({ pendingBranch, selectBranch }: Props) {
    return (
        <div className="flex flex-col h-full items-center justify-center p-6 gap-6">
            <div className="text-center">
                <div className="text-xl font-bold text-accent-strong mb-1">⚡ 分岐！</div>
                <div className="text-sm text-ink-muted">
                    ステージ{pendingBranch.stage + 1} — どちらに進みますか？
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                {pendingBranch.options.map((opt) => (
                    <button
                        key={opt}
                        onClick={() => selectBranch(opt)}
                        className="bg-surface-2 hover:bg-surface-3 border border-line-strong hover:border-accent-strong rounded-2xl p-6 text-center transition-colors"
                    >
                        <div className="text-3xl mb-2">{BRANCH_ICON[opt]}</div>
                        <div className="text-sm font-bold text-ink">{BRANCH_LABEL[opt]}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}
