-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('NORMAL', 'IMPORTANT', 'URGENT');

-- CreateTable
CREATE TABLE "SchoolNotification" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdByMembershipId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRecipient" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolNotification_schoolId_createdAt_idx" ON "SchoolNotification"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "SchoolNotification_createdByMembershipId_idx" ON "SchoolNotification"("createdByMembershipId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolNotification_schoolId_id_key" ON "SchoolNotification"("schoolId", "id");

-- CreateIndex
CREATE INDEX "NotificationRecipient_schoolId_membershipId_readAt_idx" ON "NotificationRecipient"("schoolId", "membershipId", "readAt");

-- CreateIndex
CREATE INDEX "NotificationRecipient_notificationId_idx" ON "NotificationRecipient"("notificationId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRecipient_notificationId_membershipId_key" ON "NotificationRecipient"("notificationId", "membershipId");

-- AddForeignKey
ALTER TABLE "SchoolNotification" ADD CONSTRAINT "SchoolNotification_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolNotification" ADD CONSTRAINT "SchoolNotification_schoolId_createdByMembershipId_fkey" FOREIGN KEY ("schoolId", "createdByMembershipId") REFERENCES "SchoolMembership"("schoolId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_schoolId_notificationId_fkey" FOREIGN KEY ("schoolId", "notificationId") REFERENCES "SchoolNotification"("schoolId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_schoolId_membershipId_fkey" FOREIGN KEY ("schoolId", "membershipId") REFERENCES "SchoolMembership"("schoolId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
