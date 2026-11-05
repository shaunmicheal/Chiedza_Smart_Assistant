-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarlyWarningAlert" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "learnerId" TEXT,
    "classId" TEXT,
    "alertType" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "evidence" JSONB NOT NULL,
    "absencesCount" INTEGER,
    "absenceDateRange" TEXT,
    "declineThreshold" TEXT,
    "assessmentsCompared" INTEGER,
    "lastAssessmentDate" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "alertRuleId" TEXT,

    CONSTRAINT "EarlyWarningAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertStatusHistory" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "fromStatus" "AlertStatus" NOT NULL,
    "toStatus" "AlertStatus" NOT NULL,
    "changedBy" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlertRule_name_key" ON "AlertRule"("name");

-- CreateIndex
CREATE INDEX "AlertRule_schoolId_idx" ON "AlertRule"("schoolId");

-- CreateIndex
CREATE INDEX "AlertRule_alertType_idx" ON "AlertRule"("alertType");

-- CreateIndex
CREATE UNIQUE INDEX "AlertRule_schoolId_name_key" ON "AlertRule"("schoolId", "name");

-- CreateIndex
CREATE INDEX "EarlyWarningAlert_schoolId_alertType_status_idx" ON "EarlyWarningAlert"("schoolId", "alertType", "status");

-- CreateIndex
CREATE INDEX "EarlyWarningAlert_schoolId_learnerId_status_idx" ON "EarlyWarningAlert"("schoolId", "learnerId", "status");

-- CreateIndex
CREATE INDEX "EarlyWarningAlert_schoolId_classId_status_idx" ON "EarlyWarningAlert"("schoolId", "classId", "status");



-- Partial unique index: one unresolved alert per (schoolId, learnerId, alertRuleId)
-- Excludes RESOLVED status; allows learner to re-trigger the same rule later
CREATE UNIQUE INDEX "EarlyWarningAlert_active_alert_key" ON "EarlyWarningAlert"(
    "schoolId", "learnerId", "alertRuleId"
) WHERE
    "status" IN ('ACTIVE', 'ACKNOWLEDGED')
    AND "learnerId" IS NOT NULL
    AND "alertRuleId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "AlertStatusHistory_alertId_idx" ON "AlertStatusHistory"("alertId");

-- CreateIndex
CREATE INDEX "AlertStatusHistory_changedAt_idx" ON "AlertStatusHistory"("changedAt");

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyWarningAlert" ADD CONSTRAINT "EarlyWarningAlert_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyWarningAlert" ADD CONSTRAINT "EarlyWarningAlert_schoolId_learnerId_fkey" FOREIGN KEY ("schoolId", "learnerId") REFERENCES "Learner"("schoolId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyWarningAlert" ADD CONSTRAINT "EarlyWarningAlert_schoolId_classId_fkey" FOREIGN KEY ("schoolId", "classId") REFERENCES "SchoolClass"("schoolId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertStatusHistory" ADD CONSTRAINT "AlertStatusHistory_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "EarlyWarningAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertStatusHistory" ADD CONSTRAINT "AlertStatusHistory_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey EarlyWarningAlert_alertRuleId_fkey
ALTER TABLE "EarlyWarningAlert" ADD CONSTRAINT "EarlyWarningAlert_alertRuleId_fkey" FOREIGN KEY ("alertRuleId") REFERENCES "AlertRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

