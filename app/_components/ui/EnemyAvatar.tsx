import Image from "next/image";
import type { EnemyInstance } from "@/types/game";

// basePath(/holo_guild)配下のため src には basePath を含める（next/image の仕様）
const BASE_PATH = "/holo_guild";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const SIZE_CLASS: Record<AvatarSize, string> = {
    xs: "w-8 h-8",
    sm: "w-9 h-9",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-20 h-20",
    "2xl": "w-24 h-24",
};

/**
 * 敵アイコンの画像パスを解決する。
 * 現状は全敵共通で /enemys/enemy.webp を使用。
 * 将来、敵タイプ(type)や属性(attribute)ごとに画像を分ける場合はこの関数だけ変更すればよい
 * （例: `${BASE_PATH}/enemy/${enemy.type}.webp` や属性別フォルダなど）。
 */
export function enemyImageSrc(_enemy: Pick<EnemyInstance, "type" | "attribute">): string {
    return `${BASE_PATH}/enemys/enemy.webp`;
}

interface Props {
    enemy: Pick<EnemyInstance, "type" | "attribute">;
    size?: AvatarSize;
    className?: string;
}

/** 敵のアイコン。キャラの CharacterAvatar に相当する敵版。各所で共通利用する。 */
export default function EnemyAvatar({ enemy, size = "xl", className = "" }: Props) {
    return (
        <div
            className={`relative overflow-hidden rounded-full bg-surface-3 shrink-0 ${SIZE_CLASS[size]} ${className}`}
        >
            <Image
                src={enemyImageSrc(enemy)}
                alt={enemy.type}
                fill
                sizes="80px"
                className="object-cover"
            />
        </div>
    );
}
