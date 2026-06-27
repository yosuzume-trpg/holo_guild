import { PrismaClient } from './generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Prisma 7 はランタイムでドライバアダプタが必須。pg ドライバで DATABASE_URL に接続する。
// DATABASE_URL は Next が .env.local から process.env に読み込む。
// 開発時のホットリロードで多重生成しないよう globalThis にキャッシュする。
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrisma() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
