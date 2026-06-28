import type { CharacterInstance } from "@/types/game";
import { getCharacterMaster } from "@/data/characters";
import CharacterAvatar from "@/app/_components/ui/CharacterAvatar";

/** 表示対象のレベルキー（全7種） */
export type LevelKey =
    | "battleLevel"
    | "farmLevel"
    | "miningLevel"
    | "fishingLevel"
    | "alchemyLevel"
    | "craftLevel"
    | "merchantLevel";

// 全レベルのラベル（正準順）。トップ表示の関係レベルもここから引く。
const LEVELS: { key: LevelKey; label: string }[] = [
    { key: "battleLevel", label: "戦闘" },
    { key: "farmLevel", label: "農業" },
    { key: "miningLevel", label: "鉱業" },
    { key: "fishingLevel", label: "漁業" },
    { key: "alchemyLevel", label: "錬金" },
    { key: "craftLevel", label: "工芸" },
    { key: "merchantLevel", label: "商人" },
];

interface Props {
    chars: CharacterInstance[];
    selectedId: string;
    onSelect: (id: string) => void;
    /** 関係レベル（トップに強調表示するレベルキー） */
    primaryKey: LevelKey;
    /** スクロール枠のクラス（既定 max-h-60 overflow-y-auto） */
    className?: string;
    emptyText?: string;
}

/**
 * 配置時のキャラ選択一覧。各候補に関係レベルをトップ強調＋他6レベルを小グリッドで表記する。
 * 生産・工芸・商人・ダンジョンの「＋配置」モーダルで共有。
 */
export default function CharacterPicker({
    chars,
    selectedId,
    onSelect,
    primaryKey,
    className = "max-h-60 overflow-y-auto",
    emptyText = "配置可能なキャラクターがいません",
}: Props) {
    if (chars.length === 0) {
        return <p className="text-sm text-ink-subtle text-center py-4">{emptyText}</p>;
    }

    const primary = LEVELS.find((l) => l.key === primaryKey) ?? LEVELS[0];
    const others = LEVELS.filter((l) => l.key !== primaryKey);

    return (
        <div className={className}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {chars.map((char) => {
                    const master = getCharacterMaster(char.masterId);
                    const sel = selectedId === char.id;
                    return (
                        <button
                            key={char.id}
                            type="button"
                            onClick={() => onSelect(char.id)}
                            className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-colors ${
                                sel
                                    ? "border-accent-strong bg-surface-2"
                                    : "border-line bg-surface-2 hover:border-accent-strong"
                            }`}
                        >
                            <CharacterAvatar masterId={char.masterId} size="lg" />
                            <div className="w-full truncate text-xs text-ink">
                                {master?.name ?? char.masterId}
                            </div>
                            <div className="w-full truncate text-xs font-semibold text-accent-strong">
                                {primary.label} Lv.{char[primary.key]}
                            </div>
                            <div className="grid w-full grid-cols-2 gap-x-2 text-[10px] text-ink-muted">
                                {others.map((l) => (
                                    <span key={l.key} className="truncate text-left">
                                        {l.label}
                                        {char[l.key]}
                                    </span>
                                ))}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
