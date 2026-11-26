-- Create the application review lifecycle.
CREATE TYPE "SchoolApplicationStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);

-- Public school applications do not create schools or user accounts.
CREATE TABLE "SchoolApplication" (
    "id" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "applicantFirstName" TEXT NOT NULL,
    "applicantLastName" TEXT NOT NULL,
    "applicantEmail" TEXT NOT NULL,
    "applicantPhone" TEXT,
    "schoolEmail" TEXT,
    "schoolPhone" TEXT,
    "address" TEXT NOT NULL,
    "status" "SchoolApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "rejectionReason" TEXT,
    "schoolId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchoolApplication_schoolId_key"
ON "SchoolApplication"("schoolId");

CREATE INDEX "SchoolApplication_status_createdAt_idx"
ON "SchoolApplication"("status", "createdAt");

CREATE INDEX "SchoolApplication_applicantEmail_idx"
ON "SchoolApplication"("applicantEmail");

ALTER TABLE "SchoolApplication"
ADD CONSTRAINT "SchoolApplication_reviewedByUserId_fkey"
FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SchoolApplication"
ADD CONSTRAINT "SchoolApplication_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
