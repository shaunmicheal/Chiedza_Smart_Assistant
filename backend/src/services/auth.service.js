import prisma from "../config/prisma.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { signAccessToken } from "../utils/jwt.js";

export const bootstrapInitialAdmin = async (input) => {
  const existingAdmin = await prisma.schoolMembership.count({
    where: { role: "SCHOOL_ADMIN" },
  });

  if (existingAdmin > 0) {
    const error = new Error("Initial administrator has already been created.");
    error.status = 409;
    throw error;
  }

  const existingSchool = await prisma.school.findUnique({
    where: { slug: input.schoolSlug },
  });
  if (existingSchool) {
    const error = new Error("A school with this slug already exists.");
    error.status = 409;
    throw error;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: input.adminEmail },
  });
  if (existingUser) {
    const error = new Error("A user with this email already exists.");
    error.status = 409;
    throw error;
  }

  const passwordHash = await hashPassword(input.adminPassword);

  const result = await prisma.$transaction(async (tx) => {
    const school = await tx.school.create({
      data: {
        name: input.schoolName,
        slug: input.schoolSlug,
      },
    });

    const user = await tx.user.create({
      data: {
        firstName: input.adminFirstName,
        lastName: input.adminLastName,
        email: input.adminEmail,
        passwordHash,
      },
    });

    const membership = await tx.schoolMembership.create({
      data: {
        schoolId: school.id,
        userId: user.id,
        role: "SCHOOL_ADMIN",
      },
    });

    return { school, user, membership };
  });

  const token = signAccessToken({ userId: result.user.id });

  return {
    token,
    user: {
      id: result.user.id,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      email: result.user.email,
    },
    school: {
      id: result.school.id,
      name: result.school.name,
      slug: result.school.slug,
    },
    membership: {
      id: result.membership.id,
      role: result.membership.role,
    },
  };
};

export const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
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
      memberships: {
        select: { id: true, schoolId: true, role: true, createdAt: true },
      },
    },
  });
  return user;
};


export const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    const error = new Error("User account not found.");
    error.status = 404;
    throw error;
  }

  const passwordMatches = await verifyPassword(currentPassword, user.passwordHash);

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
