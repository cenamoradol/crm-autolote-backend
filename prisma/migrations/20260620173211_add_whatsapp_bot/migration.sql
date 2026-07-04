-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('PENDING', 'ASSIGNED', 'CLOSED');

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "whatsapp_bot_phone" TEXT,
ADD COLUMN     "whatsapp_closed_message" TEXT,
ADD COLUMN     "whatsapp_connected_at" TIMESTAMP(3),
ADD COLUMN     "whatsapp_is_connected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsapp_session_data" TEXT,
ADD COLUMN     "whatsapp_timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City';

-- CreateTable
CREATE TABLE "WhatsAppConversation" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerName" TEXT,
    "vendorId" UUID,
    "vendorName" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'PENDING',
    "assignedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorAvailability" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "userName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppBusinessHours" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WhatsAppBusinessHours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppConversation_storeId_idx" ON "WhatsAppConversation"("storeId");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_storeId_status_idx" ON "WhatsAppConversation"("storeId", "status");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_vendorId_idx" ON "WhatsAppConversation"("vendorId");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_customerPhone_idx" ON "WhatsAppConversation"("customerPhone");

-- CreateIndex
CREATE INDEX "VendorAvailability_storeId_isAvailable_idx" ON "VendorAvailability"("storeId", "isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "VendorAvailability_storeId_userId_key" ON "VendorAvailability"("storeId", "userId");

-- CreateIndex
CREATE INDEX "WhatsAppBusinessHours_storeId_idx" ON "WhatsAppBusinessHours"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppBusinessHours_storeId_dayOfWeek_key" ON "WhatsAppBusinessHours"("storeId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAvailability" ADD CONSTRAINT "VendorAvailability_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppBusinessHours" ADD CONSTRAINT "WhatsAppBusinessHours_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
