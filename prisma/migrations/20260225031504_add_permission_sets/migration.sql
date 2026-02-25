-- AlterTable
ALTER TABLE "UserRole" ADD COLUMN     "permission_set_id" UUID;

-- CreateTable
CREATE TABLE "PermissionSet" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermissionSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PermissionSet_storeId_idx" ON "PermissionSet"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionSet_storeId_name_key" ON "PermissionSet"("storeId", "name");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_permission_set_id_fkey" FOREIGN KEY ("permission_set_id") REFERENCES "PermissionSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionSet" ADD CONSTRAINT "PermissionSet_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
