-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "short_code" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "short_clicks" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_short_code_key" ON "Vehicle"("short_code");
