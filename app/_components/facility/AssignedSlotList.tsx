"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { CharacterInstance } from "@/types/game";
import { getCharacterMaster } from "@/data/characters";
import CharacterAvatar from "@/app/_components/ui/CharacterAvatar";
import ItemIcon from "@/app/_components/facility/ItemIcon";

/** 配置スロットの並び替えモード */
type SortMode = "default" | "level" | "material";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
    { value: "default", label: "デフォルト" },
    { value: "level", label: "レベル順" },
    { value: "material", label: "素材順" },
];

/** 配置カードに表示する施設ごとの情報 */
export interface SlotInfo {
    /** 名前の右に出す Lv 表記（例: 農業Lv.5 / 商人Lv.3 / DL3） */
    level: ReactNode;
    /** 素材／レシピ／商品名 */
    itemName: ReactNode;
    /** アイコン画像のアイテムid（素材/レシピのid）。public/items/{icon}.webp を参照 */
    icon?: string;
    /** 1分あたりの個数（例: "1.05/分"） */
    rate: ReactNode;
    /** 最低保有数（商人のみ。未指定なら空セル） */
    minStock?: ReactNode;
    /** 在庫個数（未指定なら空セル） */
    stock?: ReactNode;
}

interface Props {
    /** 各スロット。未配置は null */
    slots: (CharacterInstance | null)[];
    /** 空スロットのボタン押下（index を渡す） */
    onAddSlot: (index: number) => void;
    /** 配置解除 */
    onUnassign: (charId: string) => void;
    /** 施設ごとのカード情報（Lv・素材名・レート・最低/在庫） */
    slotInfo: (char: CharacterInstance) => SlotInfo;
    /** 解除ボタン左に差し込む追加アクション（例: 生産施設の「変更」「手動」ボタン） */
    renderActions?: (char: CharacterInstance) => ReactNode;
    /**
     * 自動処理の「次の1個まで」進捗(0-1)を返す。number で進捗バー、null で待機中（薄表示）。
     * 未指定ならバー自体を描画しない。
     */
    slotProgress?: (char: CharacterInstance) => number | null;
    /**
     * 並び替え用のソートキー。level=表示レベル(降順), material=素材の正準順(昇順)。
     * 指定するとソートUIを表示する。未指定なら並び替え不可（デフォルト順のまま）。
     */
    sortKeys?: (char: CharacterInstance) => { level: number; material: number };
}

/**
 * 「配置スロット」一覧の共通コンポーネント。生産施設・商人/工芸ギルド・ダンジョン自動周回で共有。
 * カードを flex + flex-wrap で並べ、PC の横幅に応じて自動的に折り返す。
 *
 * カードの縦構成:
 *   名前 | Lv
 *   アイコン | 素材アイコン(予約スペース)
 *   素材名 | 1分あたりの個数
 *   最低個数 | 在庫個数
 *   変更/手動 | 解除
 *   進捗バー
 */
export default function AssignedSlotList({
    slots,
    onAddSlot,
    onUnassign,
    slotInfo,
    renderActions,
    slotProgress,
    sortKeys,
}: Props) {
    // カードは固定幅。横幅に応じて折り返す（伸縮しない）
    const cardClass = "w-[185px] rounded-lg p-2";

    const [sortMode, setSortMode] = useState<SortMode>("default");

    // 配置済み（非null）だけ並び替え、空きスロットは末尾に集める。
    // デフォルトは元の順序（slots の並び）を維持。
    const displaySlots: (CharacterInstance | null)[] = (() => {
        if (!sortKeys || sortMode === "default") return slots;
        const assigned = slots.filter((s): s is CharacterInstance => s !== null);
        const emptyCount = slots.length - assigned.length;
        const sorted = [...assigned].sort((a, b) => {
            const ka = sortKeys(a);
            const kb = sortKeys(b);
            // レベル順は降順（高い順）、素材順は正準インデックスの昇順
            return sortMode === "level" ? kb.level - ka.level : ka.material - kb.material;
        });
        return [...sorted, ...Array<null>(emptyCount).fill(null)];
    })();

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-ink-muted">配置スロット</span>
                {sortKeys && (
                    <select
                        value={sortMode}
                        onChange={(e) => setSortMode(e.target.value as SortMode)}
                        className="bg-app border border-line rounded px-2 py-1 text-xs text-ink"
                        aria-label="配置スロットの並び替え"
                    >
                        {SORT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                )}
            </div>
            <div className="flex flex-wrap gap-1">
                {displaySlots.map((char, i) => {
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
                    const info = slotInfo(char);
                    // undefined=propなし(バー無し) / null=待機中(空トラック) / number=進捗
                    const progress = slotProgress ? slotProgress(char) : undefined;
                    return (
                        <div
                            key={char.id}
                            className={`${cardClass} bg-surface border border-line flex flex-col gap-1`}
                        >
                            {/* 名前 | Lv */}
                            <div className="flex items-center gap-1">
                                <div className="flex-1 min-w-0 text-sm font-semibold text-ink truncate">
                                    {master?.name ?? char.masterId}
                                </div>
                                <div className="shrink-0 text-xs text-ink-muted">{info.level}</div>
                            </div>

                            {/* アイコン | 素材アイコン（5:4 を正方枠に contain で中央配置） */}
                            <div className="flex items-center justify-between gap-2">
                                <CharacterAvatar masterId={char.masterId} size="xl" />
                                <div className="relative w-20 h-20 rounded-lg border border-line bg-surface-2 overflow-hidden shrink-0">
                                    {info.icon && <ItemIcon id={info.icon} />}
                                    <span className="absolute bottom-0.5 right-0.5 text-xs text-success bg-surface/80 rounded px-1">
                                        {info.rate}
                                    </span>
                                </div>
                            </div>

                            {/* 素材名 */}
                            <div className="text-xs text-ink truncate">{info.itemName}</div>

                            {/* 最低個数 | 在庫個数 */}
                            <div className="flex items-center justify-between gap-1 text-xs text-ink-subtle">
                                <span className="min-w-0 truncate">{info.minStock}</span>
                                <span className="shrink-0">{info.stock}</span>
                            </div>

                            {/* 変更/手動 | 解除 */}
                            <div className="flex items-center gap-1 mt-auto pt-1">
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
