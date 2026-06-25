"use client";

import { useState } from "react";
import { REGIONS, getRegionCharacters } from "@/data/characters";
import type { CharacterMaster, RegionId, Tendency } from "@/types/game";
import { useGameStore } from "@/store/gameStore";
import { useCharacterStore } from "@/store/characterStore";
import { useDungeonStore } from "@/store/dungeonStore";
import { GUARANTEE_THRESHOLD, RECRUIT_COST } from "@/data/constants";
import ProgressBar from "@/app/_components/ui/ProgressBar";
import CharacterAvatar from "@/app/_components/ui/CharacterAvatar";

const TENDENCY_LABEL: Record<string, string> = {
    standard: "標準",
    attack: "攻撃",
    magic: "魔法",
    defense: "防御",
    speed: "速度",
};

const TENDENCY_COLOR: Record<string, string> = {
    standard: "bg-surface-3",
    attack: "bg-red-600",
    magic: "bg-purple-600",
    defense: "bg-blue-600",
    speed: "bg-green-600",
};

interface PullResult {
    char: CharacterMaster;
    isNew: boolean;
    tendency: Tendency;
    certCount: number;
}

export default function OfferPage() {
    const unlockedRegions = useGameStore((s) => s.unlockedRegions);
    const guildRank = useGameStore((s) => s.guildRank);
    const unlockRegion = useGameStore((s) => s.unlockRegion);
    const spendGold = useGameStore((s) => s.spendGold);
    const characters = useCharacterStore((s) => s.characters);
    const addCharacter = useCharacterStore((s) => s.addCharacter);
    const addCertificate = useCharacterStore((s) => s.addCertificate);
    const recruitPoints = useDungeonStore((s) => s.recruitPoints);
    const addRecruitPoints = useDungeonStore((s) => s.addRecruitPoints);

    const visibleRegions = REGIONS.filter((r) => unlockedRegions.includes(r.id));
    const [activeRegion, setActiveRegion] = useState<RegionId>(
        (visibleRegions[0]?.id ?? "region1") as RegionId,
    );
    const [pullResults, setPullResults] = useState<PullResult[] | null>(null);
    const [showGuarantee, setShowGuarantee] = useState(false);

    const PULL10_COUNT = 10;

    const lockableRegions = REGIONS.filter((r) => !unlockedRegions.includes(r.id));
    const pendingUnlockCount = Math.max(0, guildRank - unlockedRegions.length);
    const hasPendingUnlock = pendingUnlockCount > 0 && lockableRegions.length > 0;

    const recruitCost = RECRUIT_COST;
    const regionChars = getRegionCharacters(activeRegion);
    const ownedMasterIds = new Set(characters.map((c) => c.masterId));
    const points = recruitPoints[activeRegion] ?? 0;
    const canGuarantee = points >= GUARANTEE_THRESHOLD;

    // 1回分の抽選。owned は連続抽選中の所持状況を引き継ぐため呼び出し側から受け取り更新する
    function pullOnce(owned: Set<string>): PullResult {
        addRecruitPoints(activeRegion, 1);

        const picked = regionChars[Math.floor(Math.random() * regionChars.length)];
        const isNew = !owned.has(picked.id);

        if (isNew) {
            const newCharId = addCharacter(picked.id);
            const newChar = useCharacterStore.getState().characters.find((c) => c.id === newCharId);
            owned.add(picked.id);
            return {
                char: picked,
                isNew: true,
                tendency: newChar?.tendency ?? "standard",
                certCount: 0,
            };
        }
        addCertificate(picked.id, 1);
        return { char: picked, isNew: false, tendency: "standard", certCount: 1 };
    }

    function handlePull() {
        if (!spendGold(recruitCost)) return;
        const owned = new Set(ownedMasterIds);
        setPullResults([pullOnce(owned)]);
    }

    function handlePull10() {
        if (!spendGold(recruitCost * PULL10_COUNT)) return;
        const owned = new Set(ownedMasterIds);
        const results: PullResult[] = [];
        for (let i = 0; i < PULL10_COUNT; i++) results.push(pullOnce(owned));
        setPullResults(results);
    }

    function handleGuaranteePick(char: CharacterMaster) {
        // セレクト募集は閾値分(60)だけ消費し、超過分は残す
        useDungeonStore.getState().addRecruitPoints(activeRegion, -GUARANTEE_THRESHOLD);
        setShowGuarantee(false);
        if (ownedMasterIds.has(char.id)) {
            addCertificate(char.id, 5);
            setPullResults([{ char, isNew: false, tendency: "standard", certCount: 5 }]);
        } else {
            const newCharId = addCharacter(char.id);
            const newChar = useCharacterStore.getState().characters.find((c) => c.id === newCharId);
            const tendency = newChar?.tendency ?? "standard";
            setPullResults([{ char, isNew: true, tendency, certCount: 0 }]);
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Region tabs */}
            <div className="flex border-b border-line bg-surface overflow-x-auto shrink-0">
                {visibleRegions.map((r) => (
                    <button
                        key={r.id}
                        onClick={() => setActiveRegion(r.id as RegionId)}
                        className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                            activeRegion === r.id
                                ? "border-accent-strong text-accent-strong"
                                : "border-transparent text-ink-muted hover:text-ink"
                        }`}
                    >
                        {r.name}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {/* Pending region unlock */}
                {hasPendingUnlock && (
                    <div className="bg-surface-2 border border-accent-strong rounded-xl p-4 mb-4 space-y-2">
                        <div className="text-sm font-semibold text-accent-strong">
                            🏆 新しい地域を解放できます（残り{pendingUnlockCount}枠）
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {lockableRegions.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => unlockRegion(r.id)}
                                    className="bg-accent hover:bg-accent-strong text-ink font-bold py-2 rounded-lg text-sm transition-colors"
                                >
                                    {r.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Points + guarantee banner */}
                <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-ink-muted">
                        ポイント: <span className="text-ink font-semibold">{points}</span>
                        <span className="text-ink-subtle"> / {GUARANTEE_THRESHOLD}</span>
                    </div>
                    <div className="text-xs text-ink-muted">
                        {ownedMasterIds.size > 0 &&
                            `入手済み: ${regionChars.filter((c) => ownedMasterIds.has(c.id)).length} / ${regionChars.length}`}
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                    <ProgressBar pct={(points / GUARANTEE_THRESHOLD) * 100} color="bg-accent" />
                </div>

                {/* Guarantee available */}
                {canGuarantee && (
                    <button
                        onClick={() => setShowGuarantee(true)}
                        className="w-full mb-4 bg-accent hover:bg-accent-strong text-ink font-bold py-2 rounded-lg text-sm transition-colors"
                    >
                        セレクト募集を使う（未入手キャラを1人選択）
                    </button>
                )}

                {/* Pull buttons */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={handlePull}
                        className="flex-1 bg-surface-2 hover:bg-surface-3 border border-line-strong hover:border-accent-strong text-ink font-bold py-3 rounded-lg transition-colors"
                    >
                        募集する（{recruitCost.toLocaleString()}G）
                    </button>
                    <button
                        onClick={handlePull10}
                        className="flex-1 bg-accent hover:bg-accent-strong border border-accent-strong text-ink font-bold py-3 rounded-lg transition-colors"
                    >
                        10連募集（{(recruitCost * PULL10_COUNT).toLocaleString()}G）
                    </button>
                </div>

                {/* Character roster for this region */}
                <div className="text-xs text-ink-muted mb-2">このエリアのキャラクター</div>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
                    {regionChars.map((char) => {
                        const owned = ownedMasterIds.has(char.id);
                        const inst = characters.find((c) => c.masterId === char.id);
                        const certCount = characters
                            .filter((c) => c.masterId === char.id)
                            .reduce((sum, c) => sum + c.certificates, 0);
                        return (
                            <div
                                key={char.id}
                                className={`relative rounded-lg p-2 text-center border transition-colors ${
                                    owned
                                        ? "bg-surface-2 border-line-strong"
                                        : "bg-surface border-line opacity-50"
                                }`}
                            >
                                {owned ? (
                                    <CharacterAvatar
                                        masterId={char.id}
                                        size="2xl"
                                        className="mx-auto mb-1"
                                    />
                                ) : (
                                    <div className="w-2xl h-2xl rounded-full bg-surface-3 flex items-center justify-center text-sm font-bold text-ink-subtle mx-auto mb-1">
                                        ?
                                    </div>
                                )}
                                <div className="font-bold text-ink leading-tight truncate">
                                    {owned ? char.name : "???"}
                                </div>
                                {owned && inst && (
                                    <div className="text-md font-bold text-accent-strong leading-tight">
                                        ★{inst.starRank}
                                    </div>
                                )}
                                {owned && certCount > 0 && (
                                    <div className="absolute top-0.5 right-0.5 bg-accent text-ink text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                                        {certCount}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Pull result modal (single) */}
            {pullResults && pullResults.length === 1 && (
                <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
                    onClick={() => setPullResults(null)}
                >
                    <div
                        className="bg-surface border border-line rounded-2xl p-6 w-72 text-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-xs text-ink-muted mb-1">
                            {pullResults[0].isNew ? "新しいメンバーが加わった！" : "証書を入手！"}
                        </div>
                        <CharacterAvatar
                            masterId={pullResults[0].char.id}
                            size="2xl"
                            className="mx-auto my-3"
                        />
                        <div className="text-lg font-bold text-ink mb-1">
                            {pullResults[0].char.name}
                        </div>
                        {pullResults[0].isNew && (
                            <div
                                className={`inline-block text-xs px-2 py-0.5 rounded-full text-white mb-3 ${TENDENCY_COLOR[pullResults[0].tendency]}`}
                            >
                                {TENDENCY_LABEL[pullResults[0].tendency]}タイプ
                            </div>
                        )}
                        {!pullResults[0].isNew && (
                            <div className="text-sm text-accent-strong mb-3">
                                証書 ×{pullResults[0].certCount}
                            </div>
                        )}
                        <button
                            onClick={() => setPullResults(null)}
                            className="w-full bg-surface-2 hover:bg-surface-3 text-ink py-2 rounded-lg text-sm transition-colors"
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            )}

            {/* Pull result modal (multi / 10連) */}
            {pullResults && pullResults.length > 1 && (
                <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
                    onClick={() => setPullResults(null)}
                >
                    <div
                        className="bg-surface border border-line rounded-2xl p-4 max-w-[90vw] max-h-[85vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-base font-bold text-ink mb-1 text-center">
                            募集結果
                        </div>
                        <div className="text-xs text-ink-muted mb-3 text-center">
                            新規 {pullResults.filter((r) => r.isNew).length}体 ／ 証書{" "}
                            {pullResults.reduce((sum, r) => sum + r.certCount, 0)}枚
                        </div>
                        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-5  gap-2">
                            {pullResults.map((r, i) => (
                                <div
                                    key={i}
                                    className={`relative rounded-lg p-2 text-center border ${
                                        r.isNew
                                            ? "bg-surface-2 border-accent-strong"
                                            : "bg-surface-2 border-line-strong"
                                    }`}
                                >
                                    <CharacterAvatar
                                        masterId={r.char.id}
                                        size="2xl"
                                        className="mx-auto mb-1"
                                    />
                                    <div className="text-xs text-ink leading-tight truncate">
                                        {r.char.name}
                                    </div>
                                    {r.isNew ? (
                                        <div
                                            className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full text-white mt-0.5 ${TENDENCY_COLOR[r.tendency]}`}
                                        >
                                            NEW・{TENDENCY_LABEL[r.tendency]}
                                        </div>
                                    ) : (
                                        <div className="text-[10px] text-accent-strong mt-0.5">
                                            証書 ×{r.certCount}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setPullResults(null)}
                            className="mt-3 w-full bg-surface-2 hover:bg-surface-3 text-ink py-2 rounded-lg text-sm transition-colors"
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            )}

            {/* Guarantee select modal */}
            {showGuarantee && (
                <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
                    onClick={() => setShowGuarantee(false)}
                >
                    <div
                        className="bg-surface border border-line rounded-2xl p-4  max-h-[80vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-base font-bold text-ink mb-1">セレクト募集</div>
                        <div className="text-xs text-ink-muted mb-3">
                            キャラクターを1人選んでください（所持済みは証書×5）
                        </div>
                        <div className="flex-1 overflow-y-auto grid grid-cols-4 gap-2">
                            {regionChars.map((char) => {
                                const owned = ownedMasterIds.has(char.id);
                                return (
                                    <button
                                        key={char.id}
                                        onClick={() => handleGuaranteePick(char)}
                                        className={`border rounded-lg p-2 text-center transition-colors ${
                                            owned
                                                ? "bg-surface-3 border-line-strong hover:border-accent-strong"
                                                : "bg-surface-2 hover:bg-surface-3 border-line-strong hover:border-accent-strong"
                                        }`}
                                    >
                                        <CharacterAvatar
                                            masterId={char.id}
                                            size="2xl"
                                            className="mx-auto mb-1"
                                        />
                                        <div className="text-xs text-ink leading-tight">
                                            {char.name}
                                        </div>
                                        {owned && (
                                            <div className="text-xs text-accent-strong mt-0.5">
                                                証書×5
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setShowGuarantee(false)}
                            className="mt-3 w-full bg-surface-2 hover:bg-surface-3 text-ink py-2 rounded-lg text-sm"
                        >
                            キャンセル
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
