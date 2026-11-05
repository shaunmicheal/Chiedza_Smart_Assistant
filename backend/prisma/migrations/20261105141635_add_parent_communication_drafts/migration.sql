-- CreateTable
CREATE TABLE "ParentCommunicationDraft" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "draftText" TEXT NOT NULL,
    "evidenceSummary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentCommunicationDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParentCommunicationDraft_schoolId_idx" ON "ParentCommunicationDraft"("schoolId");

-- CreateIndex
CREATE INDEX "ParentCommunicationDraft_alertId_idx" ON "ParentCommunicationDraft"("alertId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentCommunicationDraft_schoolId_alertId_userId_status_key" ON "ParentCommunicationDraft"("schoolId", "alertId", "userId", "status");

-- AddForeignKey
ALTER TABLE "ParentCommunicationDraft" ADD CONSTRAINT "ParentCommunicationDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentCommunicationDraft" ADD CONSTRAINT "ParentCommunicationDraft_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentCommunicationDraft" ADD CONSTRAINT "ParentCommunicationDraft_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "EarlyWarningAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
