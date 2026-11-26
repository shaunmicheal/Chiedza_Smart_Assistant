CREATE TABLE "SchoolAdminInvitation" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "invitedEmail" TEXT NOT NULL,
    "invitedFirstName" TEXT NOT NULL,
    "invitedLastName" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolAdminInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchoolAdminInvitation_tokenHash_key"
ON "SchoolAdminInvitation"("tokenHash");

CREATE INDEX "SchoolAdminInvitation_schoolId_status_idx"
ON "SchoolAdminInvitation"("schoolId", "status");

CREATE INDEX "SchoolAdminInvitation_schoolId_invitedEmail_idx"
ON "SchoolAdminInvitation"("schoolId", "invitedEmail");

CREATE INDEX "SchoolAdminInvitation_invitedByUserId_idx"
ON "SchoolAdminInvitation"("invitedByUserId");

ALTER TABLE "SchoolAdminInvitation"
ADD CONSTRAINT "SchoolAdminInvitation_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolAdminInvitation"
ADD CONSTRAINT "SchoolAdminInvitation_invitedByUserId_fkey"
FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
