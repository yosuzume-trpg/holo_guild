import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'prisma/config'

// Prisma 7 では接続URLをスキーマではなくここで指定する（migrate / db push などCLI用）。
// Prisma CLI は .env / .env.local を自動で読まないため、ここで明示的に読み込む。
// これにより本番でも `npx prisma migrate deploy` / `db push` が DATABASE_URL を解決できる。
// （既に環境変数 DATABASE_URL がある場合は dotenv は上書きしないのでそちらが優先される。）
loadEnv({ path: '.env.local' })
loadEnv() // .env もフォールバックで読む

// env() ではなく process.env を直接読むのは、DB接続不要な `prisma generate`
// （postinstall）が DATABASE_URL 未設定でも失敗しないようにするため。
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
