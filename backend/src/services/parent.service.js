import { randomBytes } from "node:crypto";
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

const createTemporaryPassword = () =>
  `${randomBytes(12).toString("base64url")}A1!`;

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
        where: { schoolId },
        select: { id: true, role: true },
      },
      parentLinks: {
        where: { learnerId: data.learnerId },
        select: { id: true, status: true },
      },
    },
  });

  if (existingUser) {
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
  }

  const tempPassword = createTemporaryPassword();
  const passwordHash = await hashPassword(tempPassword);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email,
          phone: data.phone?.trim() || null,
          passwordHash,
          mustChangePassword: true,
        },
        select: safeUserSelect,
      });

      await tx.schoolMembership.create({
        data: {
          schoolId,
          userId: user.id,
          role: "PARENT",
        },
      });

      const link = await tx.parentLearner.create({
        data: {
          learnerId: data.learnerId,
          guardianUserId: user.id,
          relationship: data.relationship,
          status: "VERIFIED",
          verifiedAt: new Date(),
        },
      });

      return { user, link };
    });

    return {
      parent: result.user,
      link: result.link,
      accountCreated: true,
      tempPassword,
    };
  } catch (error) {
    if (error.code === "P2002") {
      throw makeError(
        "An account with this email already exists. Refresh the parent list and try again.",
        409
      );
    }
    throw error;
  }
};

const getLinkedLearnerIds = async (guardianUserId) => {
  const links = await prisma.parentLearner.findMany({
    where: {
      guardianUserId,
      status: "VERIFIED",
      learner: { isActive: true },
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
      learner: { isActive: true },
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
