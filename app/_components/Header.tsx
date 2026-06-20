"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useGameStore, CYCLE_DURATION_MS } from "@/store/gameStore";
import ProgressBar from "./ui/ProgressBar";

export default function Header() {
    const gold = useGameStore((s) => s.gold);
    const guildRank = useGameStore((s) => s.guildRank);
    const cycleCount = useGameStore((s) => s.cycleCount);
    const cycleStartTime = useGameStore((s) => s.cycleStartTime);
    const [cycleProgress, setCycleProgress] = useState(0);

    useEffect(() => {
        const update = () => {
            const elapsed = Date.now() - cycleStartTime;
            setCycleProgress(Math.min(elapsed / CYCLE_DURATION_MS, 1));
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [cycleStartTime]);

    const minutesLeft = Math.ceil(((1 - cycleProgress) * CYCLE_DURATION_MS) / 60000);

    return (
        <header className="shrink-0 bg-slate-800 text-white px-3  flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
                <span className="w-16 font-bold text-yellow-300">{gold.toLocaleString()}G</span>
                <span className="relative inline-flex items-center justify-center w-30 h-17">
                    <Image
                        src="/holo_guild/guildRank.png"
                        alt="ギルドランク"
                        width={120}
                        height={68}
                        className="w-30 h-17 object-contain"
                    />
                    <span className="absolute text-xl inset-0 flex items-center justify-center font-bold text-white [-webkit-text-stroke:3px_#000] [paint-order:stroke_fill]">
                        GR {guildRank}
                    </span>
                </span>
                <span className="w-16 text-slate-300">
                    Cycle{cycleCount} ({minutesLeft}分）
                </span>
            </div>
            <ProgressBar
                pct={cycleProgress * 100}
                color="bg-blue-400"
                trackColor="bg-slate-600"
                barClassName="transition-all duration-1000"
            />
        </header>
    );
}
