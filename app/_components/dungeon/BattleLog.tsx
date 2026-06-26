"use client";

interface Props {
    log: string[];
}

/** RPG風のバトルログウィンドウ。直近10件を新しい順に表示する。 */
export default function BattleLog({ log }: Props) {
    return (
        <div className="rounded-lg border-2 border-line-strong bg-ink shadow-md p-1">
            <div className="rounded-md border border-accent-strong/40 px-2 py-1.5">
                <div className="text-[11px] font-bold text-accent-soft border-b border-accent-strong/30 pb-1 mb-1">
                    📜 ログ
                </div>
                <div className="h-28 overflow-y-auto">
                    {log
                        .slice(-10)
                        .reverse()
                        .map((line, i) => (
                            <div
                                key={i}
                                className={`text-xs leading-5 ${i === 0 ? "text-surface font-medium" : "text-surface-2"}`}
                            >
                                {line}
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}
