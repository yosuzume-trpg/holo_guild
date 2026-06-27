import { defineConfig } from 'prisma/config'

// Prisma 7 では接続URLをスキーマではなくここで指定する（migrate / db push などCLI用）。
// DATABASE_URL は .env.local にあるため、CLIは `dotenv -e .env.local -- prisma ...`
// （package.json の db:push スクリプト）で env に注入してから実行する。
// env() ではなく process.env を直接読むのは、DB接続不要な `prisma generate`
// （postinstall）が DATABASE_URL 未設定でも失敗しないようにするため。
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
