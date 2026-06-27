import Image from "next/image";
import { ASSET_VERSION } from "@/utils/safeImage";

// 素材・レシピのアイコン（public/items/{id}.webp、basePath込み）。横5:縦4の比率。
const ITEM_ICON_BASE = "/holo_guild/items";

interface Props {
    /** 素材／レシピのid（public/items/{id}.webp） */
    id: string;
    alt?: string;
}

/**
 * 素材・レシピのアイコン画像。親の relative ボックスを満たし、object-contain で中央配置する。
 * サイズ・枠は呼び出し側の relative ボックスで決める。
 */
export default function ItemIcon({ id, alt = "" }: Props) {
    return (
        <Image
            src={`${ITEM_ICON_BASE}/${id}.webp?v=${ASSET_VERSION}`}
            alt={alt}
            fill
            sizes="80px"
            className="object-contain"
        />
    );
}
