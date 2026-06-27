-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "SaveSlot" (
    "slot" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "cycleCount" INTEGER NOT NULL,
    "gold" INTEGER NOT NULL,
    "guildRank" INTEGER NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaveSlot_pkey" PRIMARY KEY ("slot")
);
