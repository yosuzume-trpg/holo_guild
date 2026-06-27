import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 全スロットのメタ情報のみ（data は除外）を返す。スロット一覧表示用。
export async function GET() {
  try {
    const slots = await prisma.saveSlot.findMany({
      select: { slot: true, cycleCount: true, gold: true, guildRank: true, savedAt: true },
      orderBy: { slot: 'asc' },
    })
    return Response.json(slots)
  } catch (e) {
    console.error('GET /api/saves failed', e)
    return Response.json({ error: 'failed to list saves' }, { status: 500 })
  }
}
