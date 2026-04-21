-- CreateEnum
CREATE TYPE "AdPlacement" AS ENUM ('HERO', 'VEHICLE_LIST', 'FLOATING_BOTTOM');

-- CreateTable
CREATE TABLE "Advertisement" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "title" TEXT,
    "image_url" TEXT NOT NULL,
    "target_url" TEXT,
    "placement" "AdPlacement" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advertisement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Advertisement_storeId_idx" ON "Advertisement"("storeId");

-- CreateIndex
CREATE INDEX "Advertisement_storeId_is_active_idx" ON "Advertisement"("storeId", "is_active");

-- CreateIndex
CREATE INDEX "Advertisement_storeId_placement_idx" ON "Advertisement"("storeId", "placement");

-- AddForeignKey
ALTER TABLE "Advertisement" ADD CONSTRAINT "Advertisement_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
