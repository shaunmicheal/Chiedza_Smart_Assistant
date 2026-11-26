import { createHash, randomBytes } from "node:crypto";
import prisma from "../config/prisma.js";
import { hashPassword } from "../utils/password.js";

const makeError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const safeUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  isActive: true,
  mustChangePassword: true,
};


export const listParents = async (schoolId) => {
  const links = await prisma.parentLearner.findMany({
    where: {
      status: "VERIFIED",
      learner: { schoolId },
    },
    include: {
      guardian: { select: safeUserSelect },
      learner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
          schoolClass: { select: { id: true, name: true, academicYear: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const parents = new Map();

  for (const link of links) {
    if (!parents.has(link.guardianUserId)) {
      parents.set(link.guardianUserId, {
        ...link.guardian,
        children: [],
      });
    }

    parents.get(link.guardianUserId).children.push({
      ...link.learner,
      relationship: link.relationship,
      parentLinkId: link.id,
    });
  }

  return [...parents.values()];
};

export const createParent = async (schoolId, data) => {
  const learner = await prisma.learner.findFirst({
    where: {
      id: data.learnerId,
      schoolId,
      isActive: true,
    },
    select: { id: true },
  });

  if (!learner) {
    throw makeError("Active learner not found in this school.", 404);
  }

  const email = data.email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        where: { schoolId, isActive: true },
        select: { id: true, role: true },
      },
      parentLinks: {
        where: { learnerId: data.learnerId },
        select: { id: true, status: true },
      },
    },
  });

  if (!existingUser) {
    throw makeError(
      "No parent account exists for this email. Use Invite Parent to create an activation link.",
      404
    );
  }

  if (!existingUser.isActive) {
    throw makeError(
      "This parent account is inactive. Contact the platform administrator.",
      403
    );
  }

  const schoolMembership = existingUser.memberships[0];

  if (!schoolMembership || schoolMembership.role !== "PARENT") {
    throw makeError(
      "This email already belongs to an account that is not a parent in this school.",
      409
    );
  }

  if (existingUser.parentLinks.length > 0) {
    throw makeError(
      "This parent is already linked to the selected learner.",
      409
    );
  }

  const link = await prisma.parentLearner.create({
    data: {
      learnerId: data.learnerId,
      guardianUserId: existingUser.id,
      relationship: data.relationship,
      status: "VERIFIED",
      verifiedAt: new Date(),
    },
  });

  return {
    parent: {
      id: existingUser.id,
      firstName: existingUser.firstName,
      lastName: existingUser.lastName,
      email: existingUser.email,
      phone: existingUser.phone,
    },
    link,
    accountCreated: false,
    tempPassword: null,
  };
};

const getLinkedLearnerIds = async (guardianUserId) => {
  const links = await prisma.parentLearner.findMany({
    where: {
      guardianUserId,
      status: "VERIFIED",
      learner: {
        isActive: true,
        school: {
          isActive: true,
          approvalStatus: "APPROVED",
        },
      },
    },
    select: { learnerId: true },
  });

  return links.map((link) => link.learnerId);
};

export const listMyChildren = async (guardianUserId) =>
  prisma.parentLearner.findMany({
    where: {
      guardianUserId,
      status: "VERIFIED",
      learner: {
        isActive: true,
        school: {
          isActive: true,
          approvalStatus: "APPROVED",
        },
      },
    },
    include: {
      learner: {
        include: {
          schoolClass: true,
          school: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

export const listMyAttendance = async (guardianUserId) => {
  const learnerIds = await getLinkedLearnerIds(guardianUserId);
  if (!learnerIds.length) return [];

  return prisma.attendance.findMany({
    where: { learnerId: { in: learnerIds } },
    include: {
      learner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          schoolClass: { select: { name: true } },
          school: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
};

export const listMyAssessments = async (guardianUserId) => {
  const learnerIds = await getLinkedLearnerIds(guardianUserId);
  if (!learnerIds.length) return [];

  return prisma.assessmentResult.findMany({
    where: { learnerId: { in: learnerIds } },
    include: {
      assessment: {
        select: {
          id: true,
          title: true,
          description: true,
          date: true,
          maxScore: true,
        },
      },
      learner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          schoolClass: { select: { name: true } },
          school: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { assessment: { date: "desc" } },
  });
};

export const listMyMessages = async (guardianUserId) => {
  const learnerIds = await getLinkedLearnerIds(guardianUserId);
  if (!learnerIds.length) return [];

  return prisma.parentCommunicationDraft.findMany({
    where: {
      status: "APPROVED",
      alert: {
        learnerId: { in: learnerIds },
      },
    },
    select: {
      id: true,
      language: true,
      draftText: true,
      evidenceSummary: true,
      status: true,
      approvedAt: true,
      createdAt: true,
      alert: {
        select: {
          id: true,
          alertType: true,
          createdAt: true,
          learner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
    orderBy: { approvedAt: "desc" },
  });
};

const hashInvitationCode = (code) =>
  createHash("sha256").update(code).digest("hex");

const INVITATION_VALIDITY_MS = 48 * 60 * 60 * 1000;

export const createParentInvitation = async (
  schoolId,
  invitedByMembershipId,
  data
) => {
  const email = data.email.trim().toLowerCase();

  const learner = await prisma.learner.findFirst({
    where: {
      id: data.learnerId,
      schoolId,
      isActive: true,
    },
    select: { id: true },
  });

  if (!learner) {
    throw makeError("Active learner not found in this school.", 404);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw makeError(
      "An account already uses this email. Use Add Parent to link an existing parent account instead.",
      409
    );
  }

  const token = randomBytes(24).toString("base64url");
  const tokenHash = hashInvitationCode(token);
  const expiresAt = new Date(Date.now() + INVITATION_VALIDITY_MS);

  const invitation = await prisma.parentInvitation.create({
    data: {
      schoolId,
      learnerId: learner.id,
      invitedByMembershipId,
      invitedEmail: email,
      tokenHash,
      expiresAt,
      status: "PENDING",
    },
    select: {
      id: true,
      invitedEmail: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      learner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  const clientUrl = (
    process.env.CLIENT_URL || "http://localhost:5173"
  ).replace(/\/+$/, "");

  // The token is returned only inside this activation URL.
  // Only its SHA-256 hash is stored in the database.
  const activationUrl = `${clientUrl}/activate#token=${encodeURIComponent(token)}`;

  return { invitation, activationUrl };
};

export const listParentInvitations = async (schoolId) => {
  const now = new Date();

  await prisma.parentInvitation.updateMany({
    where: {
      schoolId,
      status: "PENDING",
      expiresAt: { lte: now },
    },
    data: { status: "EXPIRED" },
  });

  return prisma.parentInvitation.findMany({
    where: { schoolId },
    select: {
      id: true,
      invitedEmail: true,
      status: true,
      expiresAt: true,
      acceptedAt: true,
      createdAt: true,
      learner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const revokeParentInvitation = async (schoolId, invitationId) => {
  const invitation = await prisma.parentInvitation.findFirst({
    where: {
      id: invitationId,
      schoolId,
    },
    select: {
      id: true,
      status: true,
      expiresAt: true,
    },
  });

  if (!invitation) {
    throw makeError("Invitation not found.", 404);
  }

  if (invitation.status !== "PENDING" || invitation.expiresAt <= new Date()) {
    throw makeError("Only a pending, unexpired invitation can be revoked.", 409);
  }

  const result = await prisma.parentInvitation.updateMany({
    where: {
      id: invitationId,
      schoolId,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    data: { status: "REVOKED" },
  });

  if (result.count !== 1) {
    throw makeError("This invitation is no longer available to revoke.", 409);
  }

  return { id: invitationId, status: "REVOKED" };
};

export const activateParentInvitation = async (data) => {
  const token = data.token.trim();
  const tokenHash = hashInvitationCode(token);
  const now = new Date();

  const invitation = await prisma.parentInvitation.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      schoolId: true,
      learnerId: true,
      invitedEmail: true,
      status: true,
      expiresAt: true,
    },
  });

  if (!invitation) {
    throw makeError("This activation link is invalid.", 400);
  }

  if (invitation.status !== "PENDING") {
    throw makeError(
      "This invitation has already been used or is no longer active.",
      409
    );
  }

  if (invitation.expiresAt <= now) {
    await prisma.parentInvitation.updateMany({
      where: { id: invitation.id, status: "PENDING" },
      data: { status: "EXPIRED" },
    });

    throw makeError(
      "This activation link has expired. Please contact your school.",
      410
    );
  }

  const email = invitation.invitedEmail;

  if (!email) {
    throw makeError(
      "This invitation has no valid email address. Please contact your school.",
      409
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw makeError(
      "An account already exists for this email. Please contact your school administrator.",
      409
    );
  }

  const passwordHash = await hashPassword(data.password);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.parentInvitation.updateMany({
        where: {
          id: invitation.id,
          status: "PENDING",
          expiresAt: { gt: now },
          invitedEmail: email,
        },
        data: {
          status: "ACCEPTED",
          acceptedAt: now,
        },
      });

      if (claimed.count !== 1) {
        throw makeError("This invitation is no longer available.", 409);
      }

      const school = await tx.school.findFirst({
        where: {
          id: invitation.schoolId,
          isActive: true,
          approvalStatus: "APPROVED",
        },
        select: { id: true },
      });

      if (!school) {
        throw makeError(
          "This school's account is not currently active. Contact the school.",
          409
        );
      }

      const learner = await tx.learner.findFirst({
        where: {
          id: invitation.learnerId,
          schoolId: invitation.schoolId,
          isActive: true,
        },
        select: { id: true },
      });

      if (!learner) {
        throw makeError(
          "The learner linked to this invitation is no longer active.",
          409
        );
      }

      const user = await tx.user.create({
        data: {
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email,
          passwordHash,
          mustChangePassword: false,
        },
        select: safeUserSelect,
      });

      await tx.schoolMembership.create({
        data: {
          schoolId: invitation.schoolId,
          userId: user.id,
          role: "PARENT",
        },
      });

      await tx.parentLearner.create({
        data: {
          learnerId: invitation.learnerId,
          guardianUserId: user.id,
          relationship: "Parent",
          status: "VERIFIED",
          verifiedAt: now,
        },
      });

      return user;
    }, {
      maxWait: 10000,
      timeout: 15000,
    });

    return result;
  } catch (error) {
    if (error.code === "P2002") {
      throw makeError(
        "An account or parent link already exists for this email. Please contact your school.",
        409
      );
    }

    throw error;
  }
};
