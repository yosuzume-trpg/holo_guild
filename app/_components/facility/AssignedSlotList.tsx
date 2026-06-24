import type { ReactNode } from "react";
import type { CharacterInstance } from "@/types/game";
import { getCharacterMaster } from "@/data/characters";
import CharacterAvatar from "@/app/_components/ui/CharacterAvatar";

interface Props {
    /** 各スロット。未配置は null */
    slots: (CharacterInstance | null)[];
    /** 空スロットのボタン押下（index を渡す） */
    onAddSlot: (index: number) => void;
    /** 配置解除 */
    onUnassign: (charId: string) => void;
    /** 名前下のサブ情報行（施設ごとの差分: Lv表記や生産/販売/レシピ情報） */
    renderInfo: (char: CharacterInstance) => ReactNode;
    /** 解除ボタン手前に差し込む追加アクション（例: 生産施設の「手動」ボタン） */
    renderActions?: (char: CharacterInstance) => ReactNode;
    /**
     * 自動処理の「次の1個まで」進捗(0-1)を返す。number で進捗バー、null で待機中（薄表示）。
     * 未指定ならバー自体を描画しない。
     */
    slotProgress?: (char: CharacterInstance) => number | null;
}

/**
 * 「配置スロット」一覧の共通コンポーネント。生産施設・商人/工芸ギルドで共有。
 * カードを flex + flex-wrap で並べ、PC の横幅に応じて自動的に折り返す。
 */
export default function AssignedSlotList({
    slots,
    onAddSlot,
    onUnassign,
    renderInfo,
    renderActions,
    slotProgress,
}: Props) {
    // カードは固定幅 240px。横幅に応じて折り返す（伸縮しない）
    const cardClass = "w-44 rounded-lg p-2";

    return (
        <div>
            <div className="text-sm text-ink-muted mb-2">配置スロット</div>
            <div className="flex flex-wrap gap-2">
                {slots.map((char, i) => {
                    if (!char) {
                        return (
                            <button
                                key={i}
                                onClick={() => onAddSlot(i)}
                                className={`${cardClass} bg-surface border border-dashed border-line hover:border-accent-strong text-ink-subtle hover:text-ink text-sm transition-colors text-center`}
                            >
                                ＋ キャラクターを配置
                            </button>
                        );
                    }
                    const master = getCharacterMaster(char.masterId);
                    // undefined=propなし(バー無し) / null=待機中(空トラック) / number=進捗
                    const progress = slotProgress ? slotProgress(char) : undefined;
                    return (
                        <div
                            key={char.id}
                            className={`${cardClass} bg-surface border border-line flex flex-col gap-2`}
                        >
                            <div className="flex items-center gap-2">
                                <CharacterAvatar masterId={char.masterId} size="md" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-ink truncate">
                                        {master?.name ?? char.masterId}
                                    </div>
                                    <div className="text-xs text-ink-muted">{renderInfo(char)}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 mt-auto">
                                {renderActions?.(char)}
                                <button
                                    onClick={() => onUnassign(char.id)}
                                    className="ml-auto text-xs text-ink-subtle hover:text-danger transition-colors shrink-0"
                                >
                                    解除
                                </button>
                            </div>
                            {/* 自動処理の「次の1個まで」進捗バー（null=待機中は薄い空トラック） */}
                            {progress !== undefined && (
                                <div
                                    className="h-1 rounded-full bg-surface-3 overflow-hidden"
                                    title={progress === null ? "待機中" : undefined}
                                >
                                    {progress !== null && (
                                        <div
                                            className="h-full bg-accent"
                                            style={{ width: `${progress * 100}%` }}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
