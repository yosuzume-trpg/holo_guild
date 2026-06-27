import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SLOT_MIN = 1
const SLOT_MAX = 20

/** スロット番号を 1..20 の整数として検証。不正なら null。 */
function parseSlot(raw: string): number | null {
  const n = Number(raw)
  if (!Number.isInteger(n) || n < SLOT_MIN || n > SLOT_MAX) return null
  return n
}

// ロード用: data を含めて返す
export async function GET(_req: NextRequest, ctx: { params: Promise<{ slot: string }> }) {
  const slot = parseSlot((await ctx.params).slot)
  if (slot === null) return Response.json({ error: 'invalid slot' }, { status: 400 })
  try {
    const save = await prisma.saveSlot.findUnique({ where: { slot } })
    if (!save) return Response.json({ error: 'not found' }, { status: 404 })
    return Response.json(save)
  } catch (e) {
    console.error(`GET /api/saves/${slot} failed`, e)
    return Response.json({ error: 'failed to load save' }, { status: 500 })
  }
}

// セーブ用: 任意番号に upsert
export async function POST(req: NextRequest, ctx: { params: Promise<{ slot: string }> }) {
  const slot = parseSlot((await ctx.params).slot)
  if (slot === null) return Response.json({ error: 'invalid slot' }, { status: 400 })
  try {
    const body = await req.json()
    const { data, cycleCount, gold, guildRank } = body ?? {}
    if (
      data === null || typeof data !== 'object' ||
      typeof cycleCount !== 'number' || typeof gold !== 'number' || typeof guildRank !== 'number'
    ) {
      return Response.json({ error: 'invalid body' }, { status: 400 })
    }
    const meta = { cycleCount, gold, guildRank, savedAt: new Date() }
    const saved = await prisma.saveSlot.upsert({
      where: { slot },
      update: { data, ...meta },
      create: { slot, data, ...meta },
      select: { slot: true, cycleCount: true, gold: true, guildRank: true, savedAt: true },
    })
    return Response.json(saved)
  } catch (e) {
    console.error(`POST /api/saves/${slot} failed`, e)
    return Response.json({ error: 'failed to save' }, { status: 500 })
  }
}

// 削除用: 無くてもエラーにしない
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ slot: string }> }) {
  const slot = parseSlot((await ctx.params).slot)
  if (slot === null) return Response.json({ error: 'invalid slot' }, { status: 400 })
  try {
    await prisma.saveSlot.deleteMany({ where: { slot } })
    return Response.json({ ok: true })
  } catch (e) {
    console.error(`DELETE /api/saves/${slot} failed`, e)
    return Response.json({ error: 'failed to delete' }, { status: 500 })
  }
}
