-- Preserve separate English and Shona drafts for the same alert and creator.
DROP INDEX "ParentCommunicationDraft_schoolId_alertId_userId_status_key";

CREATE UNIQUE INDEX "ParentCommunicationDraft_schoolId_alertId_userId_language_status_key"
ON "ParentCommunicationDraft"("schoolId", "alertId", "userId", "language", "status");
