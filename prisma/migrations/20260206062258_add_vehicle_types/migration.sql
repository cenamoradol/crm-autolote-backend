-- AlterTable
ALTER TABLE "LeadPreference" ADD COLUMN     "vehicle_type_id" UUID;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "vehicle_type_id" UUID;

-- CreateTable
CREATE TABLE "VehicleType" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleType_name_key" ON "VehicleType"("name");

-- CreateIndex
CREATE INDEX "VehicleType_name_idx" ON "VehicleType"("name");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_vehicle_type_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "VehicleType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadPreference" ADD CONSTRAINT "LeadPreference_vehicle_type_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "VehicleType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
