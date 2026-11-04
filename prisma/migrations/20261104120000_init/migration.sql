-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('ONE_TIME', 'BIWEEKLY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "TimeSlot" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('NEW', 'CONFIRMED', 'SCHEDULED', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "Service" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pricePerM2Cents" INTEGER NOT NULL,
    "minPriceCents" INTEGER NOT NULL,
    "minutesPerM2" DOUBLE PRECISION NOT NULL,
    "discountsAllowed" BOOLEAN NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Extra" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "minutes" INTEGER NOT NULL,
    "maxQty" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Extra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceArea" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "travelFeeCents" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ServiceArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqItem" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "showAsChip" BOOLEAN NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyCapacity" (
    "id" SERIAL NOT NULL,
    "weekday" INTEGER NOT NULL,
    "slot" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,

    CONSTRAINT "WeeklyCapacity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacityException" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "slot" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "CapacityException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "CleaningRequest" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "areaId" INTEGER NOT NULL,
    "areaM2" INTEGER NOT NULL,
    "rooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "frequency" "Frequency" NOT NULL DEFAULT 'ONE_TIME',
    "extras" JSONB NOT NULL DEFAULT '[]',
    "travelFeeCents" INTEGER NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "preferredDate" DATE NOT NULL,
    "timeSlot" "TimeSlot" NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "notes" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'NEW',
    "internalNote" TEXT,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleaningRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Service_code_key" ON "Service"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Extra_code_key" ON "Extra"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceArea_code_key" ON "ServiceArea"("code");

-- CreateIndex
CREATE UNIQUE INDEX "FaqItem_code_key" ON "FaqItem"("code");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyCapacity_weekday_slot_key" ON "WeeklyCapacity"("weekday", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "CapacityException_date_slot_key" ON "CapacityException"("date", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "CleaningRequest_code_key" ON "CleaningRequest"("code");

-- CreateIndex
CREATE INDEX "CleaningRequest_preferredDate_timeSlot_idx" ON "CleaningRequest"("preferredDate", "timeSlot");

-- CreateIndex
CREATE INDEX "CleaningRequest_status_idx" ON "CleaningRequest"("status");

-- AddForeignKey
ALTER TABLE "CleaningRequest" ADD CONSTRAINT "CleaningRequest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningRequest" ADD CONSTRAINT "CleaningRequest_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "ServiceArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

