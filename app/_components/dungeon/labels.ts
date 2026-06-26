import type { StageType } from "@/types/game";
import type { EnemyTypeKey } from "@/utils/dungeonBattle";

// ─── 属性 ───────────────────────────────────────────────────────────────────
export const ATTR_LABEL: Record<string, string> = {
    fire: "火",
    wind: "風",
    earth: "地",
    water: "水",
};
export const ATTR_COLOR: Record<string, string> = {
    fire: "text-danger",
    wind: "text-success",
    earth: "text-yellow-600",
    water: "text-accent-strong",
};

// ─── 敵タイプ ────────────────────────────────────────────────────────────────
export const ENEMY_TYPE_LABEL: Record<EnemyTypeKey, string> = {
    standard: "標準",
    attack: "攻撃",
    magic: "魔法",
    defense: "防御",
    elite: "強敵",
    boss: "ボス",
};

// ─── キャラの傾向 ────────────────────────────────────────────────────────────
export const TENDENCY_LABEL: Record<string, string> = {
    standard: "標準",
    attack: "攻撃型",
    magic: "魔法型",
    defense: "防御型",
    speed: "速度型",
};
export const TENDENCY_COLOR: Record<string, string> = {
    standard: "text-ink-muted",
    attack: "text-danger",
    magic: "text-purple-400",
    defense: "text-accent-strong",
    speed: "text-success",
};

// ─── 分岐選択 ────────────────────────────────────────────────────────────────
export const BRANCH_LABEL: Record<string, string> = {
    battle: "通常戦闘",
    elite: "強敵",
    recovery: "回復",
    chest: "宝箱",
};
export const BRANCH_ICON: Record<string, string> = {
    battle: "⚔️",
    elite: "🟠",
    recovery: "💚",
    chest: "📦",
};

// ─── バフの短縮表記 ──────────────────────────────────────────────────────────
export const BUFF_SHORT: Record<string, string> = {
    atk: "攻",
    def: "防",
    mag: "魔",
};

// ─── ステージ種別（ヘッダー表示） ────────────────────────────────────────────
const STAGE_TYPE_BADGE: Record<StageType, string> = {
    boss: "🔴 BOSS",
    elite: "🟠 強敵",
    recovery: "💚 回復",
    chest: "📦 宝箱",
    battle: "⚔️ 戦闘",
};
export function stageTypeBadge(type: StageType): string {
    return STAGE_TYPE_BADGE[type] ?? "⚔️ 戦闘";
}
