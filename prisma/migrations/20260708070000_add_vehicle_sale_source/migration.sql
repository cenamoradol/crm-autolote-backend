-- CreateEnum
CREATE TYPE "SaleSource" AS ENUM ('NORMAL', 'QUICK');

-- AlterTable
ALTER TABLE "vehicle_sales" ADD COLUMN     "source" "SaleSource" NOT NULL DEFAULT 'NORMAL';

-- CreateIndex
CREATE INDEX "vehicle_sales_store_id_source_idx" ON "vehicle_sales"("store_id", "source");
