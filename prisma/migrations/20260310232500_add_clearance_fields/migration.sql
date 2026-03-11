-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "is_clearance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "clearance_price" DECIMAL(12,2);
