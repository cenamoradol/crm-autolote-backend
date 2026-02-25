/*
  Warnings:

  - You are about to drop the column `key` on the `Role` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[storeId,name]` on the table `Role` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `storeId` to the `Role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Role` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Role_key_key";

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "key",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "permissions" JSONB,
ADD COLUMN     "storeId" UUID NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "consignor_id" UUID;

-- DropEnum
DROP TYPE "RoleKey";

-- CreateTable
CREATE TABLE "Consignor" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consignor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Consignor_storeId_idx" ON "Consignor"("storeId");

-- CreateIndex
CREATE INDEX "Consignor_storeId_createdAt_idx" ON "Consignor"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "Role_storeId_idx" ON "Role"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_storeId_name_key" ON "Role"("storeId", "name");

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_consignor_id_fkey" FOREIGN KEY ("consignor_id") REFERENCES "Consignor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consignor" ADD CONSTRAINT "Consignor_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
