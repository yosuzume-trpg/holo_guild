'use client'

import { useEffect, useState } from 'react'
import { useGameStore, CYCLE_DURATION_MS } from '@/store/gameStore'

export default function Header() {
  const gold = useGameStore((s) => s.gold)
  const guildRank = useGameStore((s) => s.guildRank)
  const cycleCount = useGameStore((s) => s.cycleCount)
  const cycleStartTime = useGameStore((s) => s.cycleStartTime)
  const [cycleProgress, setCycleProgress] = useState(0)

  useEffect(() => {
    const update = () => {
      const elapsed = Date.now() - cycleStartTime
      setCycleProgress(Math.min(elapsed / CYCLE_DURATION_MS, 1))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [cycleStartTime])

  const minutesLeft = Math.ceil(((1 - cycleProgress) * CYCLE_DURATION_MS) / 60000)

  return (
    <header className="shrink-0 bg-slate-800 text-white px-3 py-2 flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-yellow-300">{gold.toLocaleString()}G</span>
        <span className="text-slate-300">GR{guildRank}</span>
        <span className="text-slate-300">サイクル {cycleCount}（あと{minutesLeft}分）</span>
      </div>
      <div className="w-full h-1.5 bg-slate-600 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-400 rounded-full transition-all duration-1000"
          style={{ width: `${cycleProgress * 100}%` }}
        />
      </div>
    </header>
  )
}
