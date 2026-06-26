import { use } from "react";
import DungeonBattlePage from "@/app/_components/dungeon/DungeonBattlePage";

export default function DungeonRoute({ params }: { params: Promise<{ level: string }> }) {
    const { level } = use(params);
    return <DungeonBattlePage level={parseInt(level, 10)} />;
}
