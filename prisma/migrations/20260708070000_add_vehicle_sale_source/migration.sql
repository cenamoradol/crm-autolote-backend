-- CreateEnum
CREATE TYPE "SaleSource" AS ENUM ('NORMAL', 'QUICK');

-- AlterTable
ALTER TABLE "VehicleSale" ADD COLUMN     "source" "SaleSource" NOT NULL DEFAULT 'NORMAL';

-- CreateIndex
CREATE INDEX "VehicleSale_storeId_source_idx" ON "VehicleSale"("storeId", "source");
