-- AlterTable
ALTER TABLE "Consignor" ADD COLUMN     "created_by_user_id" UUID;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "created_by_user_id" UUID;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consignor" ADD CONSTRAINT "Consignor_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
