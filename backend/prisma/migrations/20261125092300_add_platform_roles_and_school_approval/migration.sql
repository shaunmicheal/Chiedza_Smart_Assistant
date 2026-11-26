-- Create platform-level authorization and school approval enums.
CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN');

CREATE TYPE "SchoolApprovalStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);

-- Existing schools remain approved by default.
ALTER TABLE "School"
ADD COLUMN "approvalStatus" "SchoolApprovalStatus" NOT NULL DEFAULT 'APPROVED';

-- Platform administrators do not require a school membership.
ALTER TABLE "User"
ADD COLUMN "platformRole" "PlatformRole";
