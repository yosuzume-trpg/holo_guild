"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

// basePath(/holo_guild)配下のため src には basePath を含める（next/image の仕様）
const ICON_BASE = "/holo_guild/buttons";

const MAIN_TABS = [
    {
        label: "ホーム",
        href: "/",
        icon: "home.png",
        match: (p: string) => p === "/",
    },
    {
        label: "キャラ",
        href: "/characters",
        icon: "character.png",
        match: (p: string) => p.startsWith("/characters") || p.startsWith("/roster"),
    },
    {
        label: "ギルド",
        href: "/guild/offer",
        icon: "guild.png",
        match: (p: string) => p.startsWith("/guild"),
    },
    {
        label: "生産",
        href: "/production/farm",
        icon: "production.png",
        match: (p: string) => p.startsWith("/production"),
    },
    {
        label: "ダンジョン",
        href: "/dungeon",
        icon: "dungeon.png",
        match: (p: string) => p.startsWith("/dungeon"),
    },
];

const SUB_TABS: Record<string, { label: string; href: string }[]> = {
    characters: [
        { label: "一覧", href: "/characters" },
        { label: "名簿", href: "/roster" },
    ],
    guild: [
        { label: "ランク", href: "/guild/upgrade" },
        { label: "募集", href: "/guild/offer" },
        { label: "貿易", href: "/guild/trade" },
        { label: "商人", href: "/guild/merchant" },
        { label: "工芸", href: "/guild/craft" },
        { label: "鍛冶", href: "/guild/blacksmith" },
        { label: "仕立", href: "/guild/tailor" },
        { label: "酒場", href: "/guild/tavern" },
    ],
    production: [
        { label: "農業", href: "/production/farm" },
        { label: "鉱業", href: "/production/mining" },
        { label: "漁業", href: "/production/fishing" },
        { label: "錬金", href: "/production/alchemy" },
        // 商人・工芸は生産と密接なため生産文脈でも開けるようにする（別名ルート）
        { label: "商人", href: "/production/merchant" },
        { label: "工芸", href: "/production/craft" },
    ],
};

function getSubTabKey(pathname: string): string | null {
    if (pathname.startsWith("/characters") || pathname.startsWith("/roster")) return "characters";
    if (pathname.startsWith("/guild")) return "guild";
    if (pathname.startsWith("/production")) return "production";
    return null;
}

export default function TabNav() {
    const pathname = usePathname();
    const subTabKey = getSubTabKey(pathname);
    const subTabs = subTabKey ? SUB_TABS[subTabKey] : null;

    return (
        <>
            {subTabs && (
                <nav className="shrink-0 bg-surface-2 flex overflow-x-auto scrollbar-none">
                    {subTabs.map((tab) => {
                        const active = pathname === tab.href;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`shrink-0 px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                                    active
                                        ? "text-ink border-accent-strong"
                                        : "text-ink-muted border-transparent hover:text-ink"
                                }`}
                            >
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>
            )}

            <nav className="shrink-0 bg-surface border-t border-line flex">
                {MAIN_TABS.map((tab) => {
                    const active = tab.match(pathname);
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`flex-1 py-1 flex justify-center text-xs transition-colors ${
                                active ? "text-accent-strong" : "text-ink-muted hover:text-ink"
                            }`}
                        >
                            <span className="relative inline-flex items-center justify-center w-16 h-16">
                                <Image
                                    src={`${ICON_BASE}/${tab.icon}`}
                                    alt={tab.label}
                                    width={60}
                                    height={60}
                                    className={`w-16 h-16 object-contain transition-opacity ${active ? "opacity-100" : "opacity-60"}`}
                                />
                                <span className="absolute inset-x-0 bottom-1 text-center font-bold [-webkit-text-stroke:3px_#fff] [paint-order:stroke_fill]">
                                    {tab.label}
                                </span>
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
