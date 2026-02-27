-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'CONTACTED', 'NO_RESPONSE', 'NOT_INTERESTED', 'PURCHASED');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "SubscriptionProvider" ADD VALUE 'MANUAL';

-- AlterTable
ALTER TABLE "Consignor" ADD COLUMN     "dni" TEXT,
ADD COLUMN     "rtn" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "currency_symbol" TEXT NOT NULL DEFAULT '$';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "offer_price" DECIMAL(12,2),
ADD COLUMN     "plate" TEXT;

-- AlterTable
ALTER TABLE "VehicleSale" ADD COLUMN     "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED';

-- CreateTable
CREATE TABLE "CustomerPreference" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "brand_id" UUID,
    "model_id" UUID,
    "year_from" INTEGER,
    "year_to" INTEGER,
    "min_price" DECIMAL(12,2),
    "max_price" DECIMAL(12,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleDocument" (
    "id" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerPreference_storeId_idx" ON "CustomerPreference"("storeId");

-- CreateIndex
CREATE INDEX "CustomerPreference_customer_id_idx" ON "CustomerPreference"("customer_id");

-- CreateIndex
CREATE INDEX "SaleDocument_saleId_idx" ON "SaleDocument"("saleId");

-- AddForeignKey
ALTER TABLE "CustomerPreference" ADD CONSTRAINT "CustomerPreference_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPreference" ADD CONSTRAINT "CustomerPreference_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPreference" ADD CONSTRAINT "CustomerPreference_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPreference" ADD CONSTRAINT "CustomerPreference_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "Model"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleDocument" ADD CONSTRAINT "SaleDocument_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "VehicleSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
