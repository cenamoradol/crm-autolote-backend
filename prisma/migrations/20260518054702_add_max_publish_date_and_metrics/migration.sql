-- AlterTable
ALTER TABLE "Advertisement" ADD COLUMN     "share_clicks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "whatsapp_clicks" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "max_publish_date" TIMESTAMP(3),
ADD COLUMN     "share_clicks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "whatsapp_clicks" INTEGER NOT NULL DEFAULT 0;
