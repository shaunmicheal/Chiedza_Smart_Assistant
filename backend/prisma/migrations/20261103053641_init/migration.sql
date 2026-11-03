-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SCHOOL_ADMIN', 'TEACHER', 'PARENT');

-- CreateEnum
CREATE TYPE "ParentLinkStatus" AS ENUM ('PENDING', 'VERIFIED', 'REVOKED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolMembership" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolClass" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Learner" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "admissionNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Learner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentLearner" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "guardianUserId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "status" "ParentLinkStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "whatsappOptInAt" TIMESTAMP(3),
    "whatsappOptOutAt" TIMESTAMP(3),
    "whatsappConsentSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentLearner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentInvitation" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "invitedByMembershipId" TEXT NOT NULL,
    "invitedEmail" TEXT,
    "invitedPhone" TEXT,
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "SchoolMembership_userId_idx" ON "SchoolMembership"("userId");

-- CreateIndex
CREATE INDEX "SchoolMembership_schoolId_role_idx" ON "SchoolMembership"("schoolId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolMembership_schoolId_userId_key" ON "SchoolMembership"("schoolId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolMembership_schoolId_id_key" ON "SchoolMembership"("schoolId", "id");

-- CreateIndex
CREATE INDEX "SchoolClass_schoolId_idx" ON "SchoolClass"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolClass_schoolId_name_academicYear_key" ON "SchoolClass"("schoolId", "name", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolClass_schoolId_id_key" ON "SchoolClass"("schoolId", "id");

-- CreateIndex
CREATE INDEX "Learner_schoolId_classId_idx" ON "Learner"("schoolId", "classId");

-- CreateIndex
CREATE INDEX "Learner_lastName_firstName_idx" ON "Learner"("lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "Learner_schoolId_admissionNumber_key" ON "Learner"("schoolId", "admissionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Learner_schoolId_id_key" ON "Learner"("schoolId", "id");

-- CreateIndex
CREATE INDEX "ParentLearner_guardianUserId_status_idx" ON "ParentLearner"("guardianUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ParentLearner_learnerId_guardianUserId_key" ON "ParentLearner"("learnerId", "guardianUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentInvitation_tokenHash_key" ON "ParentInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "ParentInvitation_schoolId_status_idx" ON "ParentInvitation"("schoolId", "status");

-- CreateIndex
CREATE INDEX "ParentInvitation_schoolId_invitedByMembershipId_idx" ON "ParentInvitation"("schoolId", "invitedByMembershipId");

-- CreateIndex
CREATE INDEX "ParentInvitation_learnerId_idx" ON "ParentInvitation"("learnerId");

-- AddForeignKey
ALTER TABLE "SchoolMembership" ADD CONSTRAINT "SchoolMembership_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolMembership" ADD CONSTRAINT "SchoolMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolClass" ADD CONSTRAINT "SchoolClass_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Learner" ADD CONSTRAINT "Learner_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Learner" ADD CONSTRAINT "Learner_schoolId_classId_fkey" FOREIGN KEY ("schoolId", "classId") REFERENCES "SchoolClass"("schoolId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentLearner" ADD CONSTRAINT "ParentLearner_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentLearner" ADD CONSTRAINT "ParentLearner_guardianUserId_fkey" FOREIGN KEY ("guardianUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentInvitation" ADD CONSTRAINT "ParentInvitation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentInvitation" ADD CONSTRAINT "ParentInvitation_schoolId_learnerId_fkey" FOREIGN KEY ("schoolId", "learnerId") REFERENCES "Learner"("schoolId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentInvitation" ADD CONSTRAINT "ParentInvitation_schoolId_invitedByMembershipId_fkey" FOREIGN KEY ("schoolId", "invitedByMembershipId") REFERENCES "SchoolMembership"("schoolId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
