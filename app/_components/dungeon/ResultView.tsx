"use client";

import { useRouter } from "next/navigation";
import type { StoredBattle } from "@/store/dungeonStore";
import { getEquipment } from "@/data/equipment";
import { getDungeonMaterials, getMaterial } from "@/data/materials";
import { getRecipe } from "@/data/recipes";
import { RETREAT_REWARD_RATE, GR_UPGRADE_MAT_COST } from "@/data/constants";

interface Props {
    dl: number;
    guildRank: number;
    result: "clear" | "wipe" | "retreat";
    bs: StoredBattle | null;
}

/** クリア / 全滅 / 撤退の結果と獲得報酬を表示する。 */
export default function ResultView({ dl, guildRank, result, bs }: Props) {
    const router = useRouter();
    const loot = bs?.loot;
    const isRetreat = result === "retreat";
    const scaled = (n: number) => (isRetreat ? Math.floor(n * RETREAT_REWARD_RATE) : n);

    return (
        <div className="p-4 text-center">
            <div
                className={`text-3xl font-bold mb-6 ${
                    result === "clear"
                        ? "text-accent-strong"
                        : result === "wipe"
                          ? "text-danger"
                          : "text-ink"
                }`}
            >
                {result === "clear" ? "🎉 クリア！" : result === "wipe" ? "全滅..." : "撤退"}
            </div>
            {loot && (
                <div className="bg-surface rounded-xl p-4 mb-6 text-sm text-left space-y-1.5">
                    <div className="text-ink-muted font-semibold mb-2">獲得報酬</div>
                    <div className="flex justify-between">
                        <span className="text-ink">ゴールド</span>
                        <span className="text-gold font-bold">{scaled(loot.gold)}G</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-ink">経験値</span>
                        <span className="text-accent-strong font-bold">{scaled(loot.exp)}</span>
                    </div>
                    {Object.entries(loot.materials).map(([matId, qty]) => {
                        const m = getDungeonMaterials(dl).find((x) => x.id === matId) ??
                            getMaterial(matId) ?? { name: getRecipe(matId)?.name ?? matId };
                        return (
                            <div key={matId} className="flex justify-between">
                                <span className="text-ink">{m.name}</span>
                                <span className="text-success">×{scaled(qty)}</span>
                            </div>
                        );
                    })}
                    {loot.equipmentMasterIds.map((eqId, i) => {
                        const eq = getEquipment(eqId);
                        return (
                            <div key={i} className="flex justify-between">
                                <span className="text-ink">{eq?.name ?? eqId}</span>
                                <span className="text-accent-strong">★1 入手</span>
                            </div>
                        );
                    })}
                </div>
            )}
            {result === "clear" && dl % 10 === 0 && dl === guildRank * 10 && (
                <div className="mb-4">
                    <div className="rounded-xl p-3 text-sm font-semibold bg-surface-2 border border-accent-strong text-accent-strong">
                        🏆 DL{dl} クリア！「ギルド → ランクアップ」で GR{guildRank + 1}{" "}
                        に上昇できます（魔力結晶・古代歯車が各{guildRank * GR_UPGRADE_MAT_COST}
                        個必要）
                    </div>
                </div>
            )}
            <button
                onClick={() => router.push("/dungeon")}
                className="w-full bg-surface-2 hover:bg-surface-3 text-ink py-3 rounded-xl"
            >
                ダンジョン一覧へ
            </button>
        </div>
    );
}
