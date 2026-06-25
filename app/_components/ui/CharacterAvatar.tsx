"use client";

import Image from "next/image";
import { getCharacterMaster } from "@/data/characters";
import { withSuffix, ASSET_VERSION } from "@/utils/safeImage";

// basePath(/holo_guild)配下のため src には basePath を含める（next/image の仕様）
const BASE_PATH = "/holo_guild";
const FALLBACK = `${BASE_PATH}/characters/default/portrait.png`;

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const SIZE_CLASS: Record<AvatarSize, string> = {
    xs: "w-8 h-8",
    sm: "w-9 h-9",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-20 h-20",
    "2xl": "w-24 h-24",
};

interface Props {
    masterId: string;
    size?: AvatarSize;
    className?: string;
}

/**
 * キャラクターのアイコン。専用アイコン画像（/characters/{id}_icon.webp）を
 * 正方形＋角丸で表示する。アイコンはセーフモードと共有のため、セーフモードでも
 * 同じ画像を参照する（_safe 切り替えはしない）。
 */
export default function CharacterAvatar({ masterId, size = "md", className = "" }: Props) {
    const master = getCharacterMaster(masterId);
    const src = master?.portrait
        ? `${BASE_PATH}${withSuffix(master.portrait, "_icon")}?v=${ASSET_VERSION}`
        : FALLBACK;
    return (
        <div
            className={`relative overflow-hidden rounded-lg bg-surface-3 shrink-0 ${SIZE_CLASS[size]} ${className}`}
        >
            <Image
                src={src}
                alt={master?.name ?? masterId}
                fill
                sizes="150px"
                className="object-cover"
            />
        </div>
    );
}
