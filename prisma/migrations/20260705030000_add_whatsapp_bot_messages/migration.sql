-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "whatsapp_welcome_message" TEXT,
ADD COLUMN     "whatsapp_fallback_message" TEXT,
ADD COLUMN     "whatsapp_vendor_request_message" TEXT,
ADD COLUMN     "whatsapp_no_vendors_message" TEXT,
ADD COLUMN     "whatsapp_vehicle_selection_message" TEXT,
ADD COLUMN     "whatsapp_search_prompt_message" TEXT;
