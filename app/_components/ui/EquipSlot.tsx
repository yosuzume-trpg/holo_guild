import { getEquipment } from "@/data/equipment";
import ItemIcon from "@/app/_components/facility/ItemIcon";
import type { EquipmentInstance } from "@/types/game";

interface Props {
    instanceId: string | null;
    invEquipment: EquipmentInstance[];
    onClick: () => void;
}

/**
 * 装備スロットのタイル（アイコン＋★＋名前）。未装備なら「未装備」を表示する。
 * キャラ一覧・ダンジョンのパーティ選択など各所で共通利用する。
 */
export default function EquipSlot({ instanceId, invEquipment, onClick }: Props) {
    const inst = instanceId ? invEquipment.find((e) => e.instanceId === instanceId) : null;
    const master = inst ? getEquipment(inst.masterId) : null;
    return (
        <button
            onClick={onClick}
            className="relative w-full aspect-5/4 rounded overflow-hidden bg-surface-2 hover:bg-surface-3 border border-line transition-colors"
        >
            {inst && master ? (
                <>
                    <ItemIcon id={inst.masterId} alt={master.name} />
                    <div className="absolute inset-x-0 bottom-0 bg-black/55 px-0.5 leading-tight truncate text-[10px] text-white">
                        {master.name}
                    </div>
                    <div className="absolute py-0.5 px-1 top-0 left-0 text-[9px] text-white bg-black/55 ">
                        <span className="font-bold">★{inst.starRank}</span>
                    </div>
                </>
            ) : (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-ink-subtle">
                    未装備
                </span>
            )}
        </button>
    );
}
