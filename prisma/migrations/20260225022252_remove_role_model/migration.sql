/*
  Warnings:

  - You are about to drop the column `roleId` on the `UserRole` table. All the data in the column will be lost.
  - You are about to drop the `Role` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,storeId]` on the table `UserRole` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_storeId_fkey";

-- DropForeignKey
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_roleId_fkey";

-- DropIndex
DROP INDEX "UserRole_storeId_roleId_idx";

-- DropIndex
DROP INDEX "UserRole_userId_storeId_roleId_key";

-- AlterTable
ALTER TABLE "UserRole" DROP COLUMN "roleId";

-- DropTable
DROP TABLE "Role";

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_storeId_key" ON "UserRole"("userId", "storeId");
