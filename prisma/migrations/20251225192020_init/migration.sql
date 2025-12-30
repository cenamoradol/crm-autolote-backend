-- CreateEnum
CREATE TYPE "SubscriptionProvider" AS ENUM ('PAYPAL', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CALL', 'WHATSAPP', 'EMAIL', 'MEETING', 'NOTE');

-- CreateEnum
CREATE TYPE "RoleKey" AS ENUM ('admin', 'supervisor', 'seller');

-- CreateTable
CREATE TABLE "Store" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreDomain" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreApiKey" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "key" "RoleKey" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "roleId" UUID NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Model" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "public_id" TEXT NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "brandId" UUID NOT NULL,
    "modelId" UUID NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "year" INTEGER,
    "price" DECIMAL(12,2),
    "mileage" INTEGER,
    "vin" TEXT,
    "stock_number" TEXT,
    "color" TEXT,
    "transmission" TEXT,
    "fuel_type" TEXT,
    "sold_at" TIMESTAMP(3),
    "sold_price" DECIMAL(12,2),
    "created_by_user_id" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleMedia" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "kind" "MediaKind" NOT NULL DEFAULT 'IMAGE',
    "file_key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleStatusHistory" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "from_status" "VehicleStatus" NOT NULL,
    "to_status" "VehicleStatus" NOT NULL,
    "changed_by_user_id" UUID,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleReservation" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "reserved_by_user_id" UUID,
    "customer_id" UUID,
    "lead_id" UUID,
    "reserved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "VehicleReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "document_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" TEXT,
    "full_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "assigned_to_user_id" UUID,
    "customer_id" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadPreference" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "min_price" DECIMAL(12,2),
    "max_price" DECIMAL(12,2),
    "year_from" INTEGER,
    "year_to" INTEGER,
    "desired_brand_id" UUID,
    "desired_model_id" UUID,
    "notes" TEXT,

    CONSTRAINT "LeadPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "type" "ActivityType" NOT NULL,
    "notes" TEXT,
    "leadId" UUID,
    "customerId" UUID,
    "vehicleId" UUID,
    "created_by_user_id" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleSale" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "sold_by_user_id" UUID NOT NULL,
    "customer_id" UUID,
    "lead_id" UUID,
    "sold_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sold_price" DECIMAL(12,2),
    "notes" TEXT,

    CONSTRAINT "VehicleSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_monthly" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "features" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreSubscription" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "provider" "SubscriptionProvider" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "approved_by_user_id" UUID,
    "approved_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "store_subscription_id" UUID NOT NULL,
    "provider" "SubscriptionProvider" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "external_id" TEXT,
    "metadata" JSONB,
    "paid_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");

-- CreateIndex
CREATE INDEX "Store_createdAt_idx" ON "Store"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoreDomain_domain_key" ON "StoreDomain"("domain");

-- CreateIndex
CREATE INDEX "StoreDomain_storeId_idx" ON "StoreDomain"("storeId");

-- CreateIndex
CREATE INDEX "StoreApiKey_storeId_idx" ON "StoreApiKey"("storeId");

-- CreateIndex
CREATE INDEX "StoreApiKey_storeId_createdAt_idx" ON "StoreApiKey"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "Branch_storeId_idx" ON "Branch"("storeId");

-- CreateIndex
CREATE INDEX "Branch_storeId_isPrimary_idx" ON "Branch"("storeId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

-- CreateIndex
CREATE INDEX "UserRole_storeId_userId_idx" ON "UserRole"("storeId", "userId");

-- CreateIndex
CREATE INDEX "UserRole_storeId_roleId_idx" ON "UserRole"("storeId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_storeId_roleId_key" ON "UserRole"("userId", "storeId", "roleId");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_expires_at_idx" ON "RefreshToken"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE INDEX "Brand_name_idx" ON "Brand"("name");

-- CreateIndex
CREATE INDEX "Model_brandId_idx" ON "Model"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "Model_brandId_name_key" ON "Model"("brandId", "name");

-- CreateIndex
CREATE INDEX "Vehicle_storeId_branchId_idx" ON "Vehicle"("storeId", "branchId");

-- CreateIndex
CREATE INDEX "Vehicle_storeId_is_published_idx" ON "Vehicle"("storeId", "is_published");

-- CreateIndex
CREATE INDEX "Vehicle_storeId_status_idx" ON "Vehicle"("storeId", "status");

-- CreateIndex
CREATE INDEX "Vehicle_brandId_idx" ON "Vehicle"("brandId");

-- CreateIndex
CREATE INDEX "Vehicle_modelId_idx" ON "Vehicle"("modelId");

-- CreateIndex
CREATE INDEX "Vehicle_storeId_createdAt_idx" ON "Vehicle"("storeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_storeId_public_id_key" ON "Vehicle"("storeId", "public_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_store_vin_unique" ON "Vehicle"("storeId", "vin");

-- CreateIndex
CREATE INDEX "VehicleMedia_vehicleId_idx" ON "VehicleMedia"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleMedia_vehicleId_position_idx" ON "VehicleMedia"("vehicleId", "position");

-- CreateIndex
CREATE INDEX "VehicleStatusHistory_vehicleId_idx" ON "VehicleStatusHistory"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleStatusHistory_changed_at_idx" ON "VehicleStatusHistory"("changed_at");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleReservation_vehicleId_key" ON "VehicleReservation"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleReservation_storeId_idx" ON "VehicleReservation"("storeId");

-- CreateIndex
CREATE INDEX "VehicleReservation_storeId_reserved_at_idx" ON "VehicleReservation"("storeId", "reserved_at");

-- CreateIndex
CREATE INDEX "Customer_storeId_idx" ON "Customer"("storeId");

-- CreateIndex
CREATE INDEX "Customer_storeId_createdAt_idx" ON "Customer"("storeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "customer_store_phone_unique" ON "Customer"("storeId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "customer_store_email_unique" ON "Customer"("storeId", "email");

-- CreateIndex
CREATE INDEX "Lead_storeId_idx" ON "Lead"("storeId");

-- CreateIndex
CREATE INDEX "Lead_storeId_status_idx" ON "Lead"("storeId", "status");

-- CreateIndex
CREATE INDEX "Lead_storeId_assigned_to_user_id_idx" ON "Lead"("storeId", "assigned_to_user_id");

-- CreateIndex
CREATE INDEX "Lead_storeId_createdAt_idx" ON "Lead"("storeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LeadPreference_leadId_key" ON "LeadPreference"("leadId");

-- CreateIndex
CREATE INDEX "LeadPreference_storeId_idx" ON "LeadPreference"("storeId");

-- CreateIndex
CREATE INDEX "Activity_storeId_idx" ON "Activity"("storeId");

-- CreateIndex
CREATE INDEX "Activity_storeId_createdAt_idx" ON "Activity"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_leadId_idx" ON "Activity"("leadId");

-- CreateIndex
CREATE INDEX "Activity_customerId_idx" ON "Activity"("customerId");

-- CreateIndex
CREATE INDEX "Activity_vehicleId_idx" ON "Activity"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleSale_vehicleId_key" ON "VehicleSale"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleSale_storeId_idx" ON "VehicleSale"("storeId");

-- CreateIndex
CREATE INDEX "VehicleSale_storeId_sold_by_user_id_idx" ON "VehicleSale"("storeId", "sold_by_user_id");

-- CreateIndex
CREATE INDEX "VehicleSale_storeId_sold_at_idx" ON "VehicleSale"("storeId", "sold_at");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");

-- CreateIndex
CREATE INDEX "Plan_isActive_idx" ON "Plan"("isActive");

-- CreateIndex
CREATE INDEX "StoreSubscription_storeId_idx" ON "StoreSubscription"("storeId");

-- CreateIndex
CREATE INDEX "StoreSubscription_storeId_status_idx" ON "StoreSubscription"("storeId", "status");

-- CreateIndex
CREATE INDEX "StoreSubscription_storeId_ends_at_idx" ON "StoreSubscription"("storeId", "ends_at");

-- CreateIndex
CREATE INDEX "Payment_store_subscription_id_idx" ON "Payment"("store_subscription_id");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_storeId_idx" ON "AuditLog"("storeId");

-- CreateIndex
CREATE INDEX "AuditLog_storeId_createdAt_idx" ON "AuditLog"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actor_user_id_idx" ON "AuditLog"("actor_user_id");

-- AddForeignKey
ALTER TABLE "StoreDomain" ADD CONSTRAINT "StoreDomain_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreApiKey" ADD CONSTRAINT "StoreApiKey_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMedia" ADD CONSTRAINT "VehicleMedia_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleStatusHistory" ADD CONSTRAINT "VehicleStatusHistory_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleStatusHistory" ADD CONSTRAINT "VehicleStatusHistory_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleReservation" ADD CONSTRAINT "VehicleReservation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleReservation" ADD CONSTRAINT "VehicleReservation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleReservation" ADD CONSTRAINT "VehicleReservation_reserved_by_user_id_fkey" FOREIGN KEY ("reserved_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleReservation" ADD CONSTRAINT "VehicleReservation_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleReservation" ADD CONSTRAINT "VehicleReservation_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadPreference" ADD CONSTRAINT "LeadPreference_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadPreference" ADD CONSTRAINT "LeadPreference_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadPreference" ADD CONSTRAINT "LeadPreference_desired_brand_id_fkey" FOREIGN KEY ("desired_brand_id") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadPreference" ADD CONSTRAINT "LeadPreference_desired_model_id_fkey" FOREIGN KEY ("desired_model_id") REFERENCES "Model"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleSale" ADD CONSTRAINT "VehicleSale_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleSale" ADD CONSTRAINT "VehicleSale_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleSale" ADD CONSTRAINT "VehicleSale_sold_by_user_id_fkey" FOREIGN KEY ("sold_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleSale" ADD CONSTRAINT "VehicleSale_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleSale" ADD CONSTRAINT "VehicleSale_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreSubscription" ADD CONSTRAINT "StoreSubscription_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreSubscription" ADD CONSTRAINT "StoreSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreSubscription" ADD CONSTRAINT "StoreSubscription_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_store_subscription_id_fkey" FOREIGN KEY ("store_subscription_id") REFERENCES "StoreSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
