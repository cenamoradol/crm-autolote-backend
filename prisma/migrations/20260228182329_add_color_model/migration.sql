/*
  Warnings:

  - You are about to drop the column `color` on the `Vehicle` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Vehicle" DROP COLUMN "color",
ADD COLUMN     "color_id" UUID;

-- CreateTable
CREATE TABLE "Color" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Color_name_key" ON "Color"("name");

-- CreateIndex
CREATE INDEX "Color_name_idx" ON "Color"("name");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "Color"("id") ON DELETE SET NULL ON UPDATE CASCADE;
