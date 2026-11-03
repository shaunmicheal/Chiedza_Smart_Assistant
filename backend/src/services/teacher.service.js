import prisma from "../config/prisma.js";
import { hashPassword } from "../utils/password.js";

export const listTeachers = async (schoolId) => {
  const memberships = await prisma.schoolMembership.findMany({
    where: { schoolId, role: "TEACHER" },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  return memberships;
};

export const createTeacher = async (schoolId, data) => {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    const error = new Error("A user with this email already exists.");
    error.status = 409;
    throw error;
  }

  const passwordHash = await hashPassword(data.password);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        passwordHash,
      },
    });

    const membership = await tx.schoolMembership.create({
      data: {
        schoolId,
        userId: user.id,
        role: "TEACHER",
      },
    });

    return { user, membership };
  });

  return result;
};

export const getTeacher = async (schoolId, membershipId) => {
  const membership = await prisma.schoolMembership.findFirst({
    where: { id: membershipId, schoolId, role: "TEACHER" },
    include: { user: true },
  });
  if (!membership) {
    const error = new Error("Teacher not found.");
    error.status = 404;
    throw error;
  }
  return membership;
};

export const updateTeacher = async (schoolId, membershipId, data) => {
  const membership = await prisma.schoolMembership.findFirst({
    where: { id: membershipId, schoolId, role: "TEACHER" },
    include: { user: true },
  });
  if (!membership) {
    const error = new Error("Teacher not found.");
    error.status = 404;
    throw error;
  }

  await prisma.$transaction(async (tx) => {
    if (data.firstName !== undefined || data.lastName !== undefined) {
      await tx.user.update({
        where: { id: membership.userId },
        data: {
          ...(data.firstName !== undefined && { firstName: data.firstName }),
          ...(data.lastName !== undefined && { lastName: data.lastName }),
        },
      });
    }
    if (data.role !== undefined) {
      await tx.schoolMembership.update({
        where: { id: membershipId },
        data: { role: data.role },
      });
    }
  });

  return getTeacher(schoolId, membershipId);
};

export const removeTeacher = async (schoolId, membershipId) => {
  const membership = await prisma.schoolMembership.findFirst({
    where: { id: membershipId, schoolId, role: "TEACHER" },
  });
  if (!membership) {
    const error = new Error("Teacher not found.");
    error.status = 404;
    throw error;
  }
  await prisma.schoolMembership.delete({ where: { id: membershipId } });
};
