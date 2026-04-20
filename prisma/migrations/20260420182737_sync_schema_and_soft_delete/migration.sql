-- AlterTable
ALTER TABLE "VehicleType" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EventCategory" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3),
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventMedia" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "kind" "MediaKind" NOT NULL DEFAULT 'IMAGE',
    "file_key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventVehicle" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceListing" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "category_id" UUID,
    "name" TEXT NOT NULL,
    "service_type" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "description" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceMedia" (
    "id" UUID NOT NULL,
    "service_listing_id" UUID NOT NULL,
    "kind" "MediaKind" NOT NULL DEFAULT 'IMAGE',
    "file_key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventCategory_storeId_idx" ON "EventCategory"("storeId");

-- CreateIndex
CREATE INDEX "EventCategory_storeId_is_active_idx" ON "EventCategory"("storeId", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "EventCategory_storeId_slug_key" ON "EventCategory"("storeId", "slug");

-- CreateIndex
CREATE INDEX "Event_storeId_idx" ON "Event"("storeId");

-- CreateIndex
CREATE INDEX "Event_storeId_category_id_idx" ON "Event"("storeId", "category_id");

-- CreateIndex
CREATE INDEX "Event_storeId_is_published_idx" ON "Event"("storeId", "is_published");

-- CreateIndex
CREATE UNIQUE INDEX "Event_storeId_slug_key" ON "Event"("storeId", "slug");

-- CreateIndex
CREATE INDEX "EventMedia_event_id_idx" ON "EventMedia"("event_id");

-- CreateIndex
CREATE INDEX "EventMedia_event_id_position_idx" ON "EventMedia"("event_id", "position");

-- CreateIndex
CREATE INDEX "EventVehicle_event_id_idx" ON "EventVehicle"("event_id");

-- CreateIndex
CREATE INDEX "EventVehicle_vehicle_id_idx" ON "EventVehicle"("vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "EventVehicle_event_id_vehicle_id_key" ON "EventVehicle"("event_id", "vehicle_id");

-- CreateIndex
CREATE INDEX "ServiceCategory_storeId_idx" ON "ServiceCategory"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_storeId_slug_key" ON "ServiceCategory"("storeId", "slug");

-- CreateIndex
CREATE INDEX "ServiceListing_storeId_idx" ON "ServiceListing"("storeId");

-- CreateIndex
CREATE INDEX "ServiceListing_storeId_is_published_idx" ON "ServiceListing"("storeId", "is_published");

-- CreateIndex
CREATE INDEX "ServiceMedia_service_listing_id_idx" ON "ServiceMedia"("service_listing_id");

-- CreateIndex
CREATE INDEX "ServiceMedia_service_listing_id_position_idx" ON "ServiceMedia"("service_listing_id", "position");

-- AddForeignKey
ALTER TABLE "EventCategory" ADD CONSTRAINT "EventCategory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "EventCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMedia" ADD CONSTRAINT "EventMedia_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventVehicle" ADD CONSTRAINT "EventVehicle_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventVehicle" ADD CONSTRAINT "EventVehicle_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceListing" ADD CONSTRAINT "ServiceListing_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceListing" ADD CONSTRAINT "ServiceListing_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceMedia" ADD CONSTRAINT "ServiceMedia_service_listing_id_fkey" FOREIGN KEY ("service_listing_id") REFERENCES "ServiceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
