import prisma from "../config/prisma.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { signAccessToken } from "../utils/jwt.js";

export const login = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      memberships: {
        where: {
          isActive: true,
          school: {
            is: {
              isActive: true,
              approvalStatus: "APPROVED",
            },
          },
        },
        select: { id: true, schoolId: true, role: true },
      },
    },
  });

  if (!user || !user.isActive) {
    const error = new Error("Invalid email or password.");
    error.status = 401;
    throw error;
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const error = new Error("Invalid email or password.");
    error.status = 401;
    throw error;
  }

  const token = signAccessToken({ userId: user.id });

  return {
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mustChangePassword: user.mustChangePassword,
      platformRole: user.platformRole,
    },
    memberships: user.memberships,
  };
};

export const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      isActive: true,
      mustChangePassword: true,
      platformRole: true,
      memberships: {
        where: {
          isActive: true,
          school: {
            is: {
              isActive: true,
              approvalStatus: "APPROVED",
            },
          },
        },
        select: { id: true, schoolId: true, role: true, createdAt: true },
      },
    },
  });

  return user;
};

export const changePassword = async (
  userId,
  { currentPassword, newPassword },
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    const error = new Error("User account not found.");
    error.status = 404;
    throw error;
  }

  const passwordMatches = await verifyPassword(
    currentPassword,
    user.passwordHash,
  );

  if (!passwordMatches) {
    const error = new Error("Your current password is incorrect.");
    error.status = 401;
    throw error;
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      mustChangePassword: false,
    },
  });

  return { mustChangePassword: false };
};

export const updateProfile = async (userId, data) => {
  const updateData = {};

  if (data.firstName !== undefined) {
    updateData.firstName = data.firstName.trim();
  }

  if (data.lastName !== undefined) {
    updateData.lastName = data.lastName.trim();
  }

  if (data.phone !== undefined) {
    updateData.phone = data.phone?.trim() || null;
  }

  return prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      isActive: true,
      mustChangePassword: true,
      platformRole: true,
    },
  });
};
