import { createHash, randomBytes } from "node:crypto";
import prisma from "../config/prisma.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

const INVITATION_VALIDITY_MS = 48 * 60 * 60 * 1000;
const MAX_ACTIVE_ADMINISTRATORS = 2;

const makeError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const hashToken = (token) =>
  createHash("sha256").update(token).digest("hex");

const lockSchool = async (tx, schoolId) => {
  await tx.$queryRaw`
    SELECT "id"
    FROM "School"
    WHERE "id" = ${schoolId}
    FOR UPDATE
  `;
};

const expireOutstandingInvitations = async (tx, schoolId, now) => {
  await tx.schoolAdminInvitation.updateMany({
    where: {
      schoolId,
      status: "PENDING",
      expiresAt: { lte: now },
    },
    data: { status: "EXPIRED" },
  });
};

const countActiveAdministrators = (tx, schoolId) =>
  tx.schoolMembership.count({
    where: {
      schoolId,
      role: "SCHOOL_ADMIN",
      isActive: true,
      user: {
        is: { isActive: true },
      },
    },
  });

const safeMembership = {
  id: true,
  role: true,
  isActive: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isActive: true,
    },
  },
};

export const listSchoolAdministrators = async (schoolId) => {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await expireOutstandingInvitations(tx, schoolId, now);
  });

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true, approvalStatus: true, isActive: true },
  });

  if (!school) {
    throw makeError("School not found.", 404);
  }

  const [memberships, invitations] = await Promise.all([
    prisma.schoolMembership.findMany({
      where: {
        schoolId,
        role: "SCHOOL_ADMIN",
        isActive: true,
        user: {
          is: { isActive: true },
        },
      },
      select: safeMembership,
      orderBy: { createdAt: "asc" },
    }),
    prisma.schoolAdminInvitation.findMany({
      where: { schoolId, status: "PENDING", expiresAt: { gt: now } },
      select: {
        id: true,
        invitedEmail: true,
        invitedFirstName: true,
        invitedLastName: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    school,
    administrators: memberships,
    invitations,
    limits: {
      maximum: MAX_ACTIVE_ADMINISTRATORS,
      active: memberships.length,
      pending: invitations.length,
      available: Math.max(
        0,
        MAX_ACTIVE_ADMINISTRATORS - memberships.length - invitations.length,
      ),
    },
  };
};

export const createSchoolAdminInvitation = async (
  schoolId,
  invitedByUserId,
  input,
) => {
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const now = new Date();

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(now.getTime() + INVITATION_VALIDITY_MS);

  const invitation = await prisma.$transaction(async (tx) => {
    await lockSchool(tx, schoolId);

    const school = await tx.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true, isActive: true, approvalStatus: true },
    });

    if (!school) {
      throw makeError("School not found.", 404);
    }

    if (school.approvalStatus !== "APPROVED") {
      throw makeError(
        "Administrators can only be invited to approved schools.",
        409,
      );
    }

    await expireOutstandingInvitations(tx, schoolId, now);

    const existingUser = await tx.user.findUnique({
      where: { email },
      select: {
        id: true,
        isActive: true,
        platformRole: true,
        memberships: {
          where: { schoolId },
          select: { id: true, role: true, isActive: true },
        },
      },
    });

    if (existingUser) {
      if (!existingUser.isActive) {
        throw makeError(
          "This email belongs to an inactive account. Reactivate the account before inviting it.",
          409,
        );
      }

      if (existingUser.platformRole) {
        throw makeError(
          "A platform administrator cannot be assigned as a school administrator.",
          409,
        );
      }

      const membership = existingUser.memberships[0];

      if (membership?.role !== undefined && membership.role !== "SCHOOL_ADMIN") {
        throw makeError(
          "This user already has a different role in this school.",
          409,
        );
      }

      if (membership?.isActive) {
        throw makeError(
          "This user is already an active administrator of this school.",
          409,
        );
      }
    }

    const duplicateInvitation = await tx.schoolAdminInvitation.findFirst({
      where: {
        schoolId,
        invitedEmail: email,
        status: "PENDING",
        expiresAt: { gt: now },
      },
      select: { id: true },
    });

    if (duplicateInvitation) {
      throw makeError(
        "There is already a pending administrator invitation for this email.",
        409,
      );
    }

    const activeCount = await countActiveAdministrators(tx, schoolId);

    const pendingCount = await tx.schoolAdminInvitation.count({
      where: {
        schoolId,
        status: "PENDING",
        expiresAt: { gt: now },
      },
    });

    if (activeCount + pendingCount >= MAX_ACTIVE_ADMINISTRATORS) {
      throw makeError(
        "This school has reached its limit of two active or invited administrators.",
        409,
      );
    }

    return tx.schoolAdminInvitation.create({
      data: {
        schoolId,
        invitedByUserId,
        invitedEmail: email,
        invitedFirstName: firstName,
        invitedLastName: lastName,
        tokenHash,
        expiresAt,
      },
      select: {
        id: true,
        invitedEmail: true,
        invitedFirstName: true,
        invitedLastName: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }, {
    maxWait: 15000,
    timeout: 60000,
  });

  const clientUrl = (
    process.env.CLIENT_URL || "http://localhost:5173"
  ).replace(/\/+$/, "");

  return {
    invitation,
    activationUrl: `${clientUrl}/admin-activate#token=${encodeURIComponent(token)}`,
  };
};

export const revokeSchoolAdminInvitation = async (schoolId, invitationId) => {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    await lockSchool(tx, schoolId);

    const invitation = await tx.schoolAdminInvitation.findFirst({
      where: { id: invitationId, schoolId },
      select: { id: true, status: true, expiresAt: true },
    });

    if (!invitation) {
      throw makeError("Administrator invitation not found.", 404);
    }

    if (invitation.status !== "PENDING" || invitation.expiresAt <= now) {
      throw makeError(
        "Only a pending, unexpired invitation can be revoked.",
        409,
      );
    }

    const result = await tx.schoolAdminInvitation.updateMany({
      where: {
        id: invitationId,
        schoolId,
        status: "PENDING",
        expiresAt: { gt: now },
      },
      data: { status: "REVOKED" },
    });

    if (result.count !== 1) {
      throw makeError("This invitation is no longer available.", 409);
    }

    return { id: invitationId, status: "REVOKED" };
  }, {
    maxWait: 15000,
    timeout: 30000,
  });
};

export const activateSchoolAdminInvitation = async (input) => {
  const token = input.token.trim();
  const tokenHash = hashToken(token);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const invitationSnapshot = await tx.schoolAdminInvitation.findUnique({
      where: { tokenHash },
      select: { id: true, schoolId: true },
    });

    if (!invitationSnapshot) {
      throw makeError("This administrator activation link is invalid.", 400);
    }

    await lockSchool(tx, invitationSnapshot.schoolId);

    const invitation = await tx.schoolAdminInvitation.findUnique({
      where: { id: invitationSnapshot.id },
    });

    if (!invitation || invitation.status !== "PENDING") {
      throw makeError(
        "This invitation has already been used or is no longer active.",
        409,
      );
    }

    if (invitation.expiresAt <= now) {
      await tx.schoolAdminInvitation.updateMany({
        where: { id: invitation.id, status: "PENDING" },
        data: { status: "EXPIRED" },
      });

      return { expired: true };
    }

    const school = await tx.school.findUnique({
      where: { id: invitation.schoolId },
      select: { id: true, isActive: true, approvalStatus: true },
    });

    if (!school || !school.isActive || school.approvalStatus !== "APPROVED") {
      throw makeError(
        "This school is not currently active. Please contact the platform administrator.",
        409,
      );
    }

    const existingUser = await tx.user.findUnique({
      where: { email: invitation.invitedEmail },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        passwordHash: true,
        isActive: true,
        platformRole: true,
        memberships: {
          where: { schoolId: invitation.schoolId },
          select: { id: true, role: true, isActive: true },
        },
      },
    });

    if (existingUser && !existingUser.isActive) {
      throw makeError(
        "This user account is inactive. Please contact the platform administrator.",
        409,
      );
    }

    if (existingUser?.platformRole) {
      throw makeError(
        "This account cannot be assigned a school administrator role.",
        409,
      );
    }

    if (existingUser) {
      if (!input.existingPassword) {
        throw makeError(
          "This email already has an account. Enter that account's current password to confirm ownership.",
          400,
        );
      }

      const passwordMatches = await verifyPassword(
        input.existingPassword,
        existingUser.passwordHash,
      );

      if (!passwordMatches) {
        throw makeError("The existing account password is incorrect.", 401);
      }
    }

    const existingMembership = existingUser?.memberships[0];

    if (
      existingMembership &&
      existingMembership.role !== "SCHOOL_ADMIN"
    ) {
      throw makeError(
        "This user already has a different role in this school.",
        409,
      );
    }

    if (existingMembership?.isActive) {
      throw makeError(
        "This user is already an active administrator of this school.",
        409,
      );
    }

    const activeCount = await countActiveAdministrators(
      tx,
      invitation.schoolId,
    );

    if (activeCount >= MAX_ACTIVE_ADMINISTRATORS) {
      throw makeError(
        "This school already has two active administrators.",
        409,
      );
    }

    const claimed = await tx.schoolAdminInvitation.updateMany({
      where: {
        id: invitation.id,
        status: "PENDING",
        expiresAt: { gt: now },
      },
      data: {
        status: "ACCEPTED",
        acceptedAt: now,
      },
    });

    if (claimed.count !== 1) {
      throw makeError("This invitation is no longer available.", 409);
    }

    let user;

    if (existingUser) {
      user = existingUser;

      if (existingMembership) {
        await tx.schoolMembership.update({
          where: { id: existingMembership.id },
          data: { isActive: true },
        });
      } else {
        await tx.schoolMembership.create({
          data: {
            schoolId: invitation.schoolId,
            userId: user.id,
            role: "SCHOOL_ADMIN",
          },
        });
      }
    } else {
      if (
        !input.firstName?.trim() ||
        !input.lastName?.trim() ||
        !input.password
      ) {
        throw makeError(
          "Enter your name and create a password to activate this account.",
          400,
        );
      }

      const passwordHash = await hashPassword(input.password);

      user = await tx.user.create({
        data: {
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          email: invitation.invitedEmail,
          passwordHash,
          mustChangePassword: false,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          isActive: true,
        },
      });

      await tx.schoolMembership.create({
        data: {
          schoolId: invitation.schoolId,
          userId: user.id,
          role: "SCHOOL_ADMIN",
        },
      });
    }

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      schoolId: invitation.schoolId,
    };
  }, {
    maxWait: 10000,
    timeout: 20000,
  });

  if (result.expired) {
    throw makeError(
      "This activation link has expired. Please contact the platform administrator.",
      410,
    );
  }

  return result;
};
