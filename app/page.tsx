"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCharacterStore } from "@/store/characterStore";
import { useGameStore } from "@/store/gameStore";
import CharacterPortrait from "@/app/_components/ui/CharacterPortrait";
import type { CharacterInstance } from "@/types/game";

// basePath(/holo_guild)配下のため画像 URL には basePath を含める
const BASE_PATH = "/holo_guild";
const ICON_BASE = `${BASE_PATH}/buttons`;

// 右上に縦並びで表示するクイックナビ
const QUICK_NAV = [
    { label: "キャラ募集", href: "/guild/offer", icon: "offer.webp" },
    { label: "生産管理", href: "/production/farm", icon: "production.webp" },
    { label: "ダンジョン", href: "/dungeon", icon: "dungeon.webp" },
    { label: "キャラ一覧", href: "/characters", icon: "character.webp" },
];

// ホームに最大何名まで表示するか（実際の表示数は画面幅で変動）
const MAX_HOME = 3;

/**
 * 親愛度を重みにした非復元抽選で最大 n 名を選ぶ。
 * 親愛度が高いキャラほど選ばれやすい。
 */
function pickWeighted(chars: CharacterInstance[], n: number): string[] {
    const pool = [...chars];
    const result: string[] = [];
    while (pool.length > 0 && result.length < n) {
        const total = pool.reduce((s, c) => s + c.affectionLevel, 0);
        let r = Math.random() * total;
        let idx = 0;
        for (; idx < pool.length - 1; idx++) {
            r -= pool[idx].affectionLevel;
            if (r <= 0) break;
        }
        result.push(pool[idx].id);
        pool.splice(idx, 1);
    }
    return result;
}

export default function HomePage() {
    const characters = useCharacterStore((s) => s.characters);
    const socialize = useCharacterStore((s) => s.socialize);
    const socializedThisCycle = useGameStore((s) => s.socializedThisCycle);
    const cycleCount = useGameStore((s) => s.cycleCount);

    // 親愛度Lv.5以上がホーム表示の対象
    const eligible = characters.filter((c) => c.affectionLevel >= 5);
    const eligibleKey = eligible.map((c) => `${c.id}:${c.affectionLevel}`).join(",");

    // 表示するキャラはサイクルごと（および対象の変化時）に抽選し直す
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    useEffect(() => {
        setSelectedIds(pickWeighted(eligible, MAX_HOME));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eligibleKey, cycleCount]);

    const selectedChars = selectedIds
        .map((id) => eligible.find((c) => c.id === id))
        .filter((c): c is CharacterInstance => Boolean(c));

    return (
        <div
            className="relative h-full overflow-hidden flex flex-col bg-cover bg-center bg-no-repeat p-4"
            style={{ backgroundImage: `url(${BASE_PATH}/bg/home.webp)` }}
        >
            {/* Quick nav（右上・縦並びアイコン） */}
            <div className="absolute top-4 right-4 flex flex-col gap-3 z-10">
                {QUICK_NAV.map((nav) => (
                    <Link
                        key={nav.href}
                        href={nav.href}
                        className="flex flex-col items-center transition-transform hover:scale-105"
                    >
                        <Image
                            src={`${ICON_BASE}/${nav.icon}`}
                            alt={nav.label}
                            width={56}
                            height={56}
                            className="w-14 h-14 object-contain drop-shadow"
                        />
                        <span className="text-xs font-bold text-white [-webkit-text-stroke:3px_#000] [paint-order:stroke_fill]">
                            {nav.label}
                        </span>
                    </Link>
                ))}
            </div>

            {/* ホームにいるメンバー（親愛度重みでランダムに1〜3名を大きく表示）。
                行が残りの高さを占め、立ち絵は親要素の高さを超えないよう収める。 */}
            {selectedChars.length > 0 ? (
                <div className="flex-1 min-h-0 flex items-end justify-center gap-3">
                    {selectedChars.map((char, i) => {
                        // 表示数は画面幅で変動：小=1名 / sm=2名 / lg=3名
                        const visClass =
                            i === 0 ? "flex" : i === 1 ? "hidden sm:flex" : "hidden lg:flex";
                        return (
                            <div
                                key={char.id}
                                className={`${visClass} flex-col items-center justify-end min-w-0 flex-1 h-full`}
                            >
                                {/* 交遊ボタンは画像の上側 */}
                                <button
                                    onClick={() => socialize(char.id)}
                                    disabled={socializedThisCycle}
                                    className="mb-1 shrink-0 text-sm px-3 py-1 rounded-full bg-pink-700 hover:bg-pink-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold shadow transition-colors"
                                >
                                    {char.socializedThisCycle ? "交遊済" : "交遊"}
                                </button>
                                {/* 高さは親要素（home.webp の領域）を上限にし、幅は aspect から導出（object-contain で収める） */}
                                <div className="relative w-full aspect-1/2 max-h-[calc(100%-2.5rem)] min-h-0">
                                    <CharacterPortrait
                                        masterId={char.masterId}
                                        className="object-contain object-bottom"
                                        sizes="(max-width:640px) 60vw, (max-width:1024px) 46vw, 32vw"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex-1" />
            )}

            {eligible.length === 0 && characters.length > 0 && (
                <div className="text-sm text-white text-center py-4 [-webkit-text-stroke:3px_#000] [paint-order:stroke_fill] font-bold">
                    親愛度がLv.5以上になると
                    <br />
                    ホームに表示されます
                </div>
            )}
        </div>
    );
}
