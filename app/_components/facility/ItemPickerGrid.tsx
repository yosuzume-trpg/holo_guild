import type { ReactNode } from "react";
import ItemIcon from "@/app/_components/facility/ItemIcon";

export interface ItemOption {
    id: string;
    name: string;
    /** 価格やレート等の補足（任意） */
    sub?: ReactNode;
    /** 豊作などの枠強調（任意） */
    highlight?: boolean;
}

interface Props {
    items: ItemOption[];
    selectedId: string;
    onSelect: (id: string) => void;
    /** 列数（既定3） */
    columns?: 2 | 3;
    /** true で max-h を付けてスクロール可能にする（候補が多い工芸・商人向け） */
    scroll?: boolean;
}

/**
 * 素材／レシピ／商品をアイコンで選ぶ共通グリッド。生産・工芸・商人・ダンジョンの選択UIで共有。
 */
export default function ItemPickerGrid({
    items,
    selectedId,
    onSelect,
    columns = 3,
    scroll = false,
}: Props) {
    return (
        <div
            className={`grid gap-2 ${columns === 2 ? "grid-cols-2" : "grid-cols-3"} ${
                scroll ? "max-h-52 overflow-y-auto" : ""
            }`}
        >
            {items.map((it) => {
                const sel = it.id === selectedId;
                return (
                    <button
                        key={it.id}
                        type="button"
                        onClick={() => onSelect(it.id)}
                        className={`flex flex-col items-center gap-0.5 p-1 rounded-lg border transition-colors ${
                            sel
                                ? "border-accent-strong bg-surface-2"
                                : it.highlight
                                  ? "border-success hover:border-accent-strong"
                                  : "border-line hover:border-accent-strong"
                        }`}
                    >
                        <div className="relative w-full aspect-5/4">
                            <ItemIcon id={it.id} alt={it.name} />
                        </div>
                        <div
                            className={`text-[10px] leading-tight text-center w-full truncate ${
                                sel ? "text-accent-strong" : "text-ink"
                            }`}
                        >
                            {it.name}
                        </div>
                        {it.sub != null && (
                            <div className="text-[10px] text-ink-subtle text-center w-full truncate">
                                {it.sub}
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
