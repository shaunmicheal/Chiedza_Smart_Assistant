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

const teacherInclude = {
  user: { select: safeUserSelect },
  classTeachers: {
    include: {
      schoolClass: {
        select: { id: true, name: true, academicYear: true },
      },
    },
  },
};

const createTemporaryPassword = () =>
  `${randomBytes(12).toString("base64url")}A1!`;

export const listTeachers = async (schoolId) =>
  prisma.schoolMembership.findMany({
    where: { schoolId, role: "TEACHER" },
    include: teacherInclude,
    orderBy: { createdAt: "asc" },
  });

export const createTeacher = async (schoolId, data) => {
  const email = data.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    throw makeError("A user with this email already exists.", 409);
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
          passwordHash,
          mustChangePassword: true,
        },
        select: safeUserSelect,
      });

      const membership = await tx.schoolMembership.create({
        data: {
          schoolId,
          userId: user.id,
          role: "TEACHER",
        },
        include: teacherInclude,
      });

      return { user, membership };
    });

    return {
      ...result,
      accountCreated: true,
      tempPassword,
    };
  } catch (error) {
    if (error.code === "P2002") {
      throw makeError("A user with this email already exists.", 409);
    }
    throw error;
  }
};

export const getTeacher = async (schoolId, membershipId) => {
  const membership = await prisma.schoolMembership.findFirst({
    where: { id: membershipId, schoolId, role: "TEACHER" },
    include: teacherInclude,
  });

  if (!membership) {
    throw makeError("Teacher not found.", 404);
  }

  return membership;
};

export const updateTeacher = async (schoolId, membershipId, data) => {
  const membership = await prisma.schoolMembership.findFirst({
    where: { id: membershipId, schoolId, role: "TEACHER" },
    select: { id: true, userId: true },
  });

  if (!membership) {
    throw makeError("Teacher not found.", 404);
  }

  await prisma.user.update({
    where: { id: membership.userId },
    data: {
      ...(data.firstName !== undefined && {
        firstName: data.firstName.trim(),
      }),
      ...(data.lastName !== undefined && {
        lastName: data.lastName.trim(),
      }),
    },
  });

  return getTeacher(schoolId, membershipId);
};

export const removeTeacher = async (schoolId, membershipId) => {
  const membership = await prisma.schoolMembership.findFirst({
    where: { id: membershipId, schoolId, role: "TEACHER" },
    select: { id: true },
  });

  if (!membership) {
    throw makeError("Teacher not found.", 404);
  }

  await prisma.schoolMembership.delete({
    where: { id: membershipId },
  });
};

export const assignTeacherToClass = async (
  schoolId,
  classId,
  membershipId
) => {
  const schoolClass = await prisma.schoolClass.findFirst({
    where: { id: classId, schoolId },
    select: { id: true },
  });

  if (!schoolClass) {
    throw makeError("Class not found in this school.", 404);
  }

  const teacher = await prisma.schoolMembership.findFirst({
    where: { id: membershipId, schoolId, role: "TEACHER" },
    select: { id: true },
  });

  if (!teacher) {
    throw makeError("Teacher not found in this school.", 404);
  }

  try {
    return await prisma.classTeacher.create({
      data: { schoolId, classId, membershipId },
      include: {
        schoolClass: {
          select: { id: true, name: true, academicYear: true },
        },
        membership: {
          include: { user: { select: safeUserSelect } },
        },
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw makeError("This teacher is already assigned to this class.", 409);
    }
    throw error;
  }
};

export const removeTeacherFromClass = async (
  schoolId,
  classId,
  membershipId
) => {
  const assignment = await prisma.classTeacher.findFirst({
    where: { schoolId, classId, membershipId },
    select: { id: true },
  });

  if (!assignment) {
    throw makeError("This teacher is not assigned to this class.", 404);
  }

  await prisma.classTeacher.delete({
    where: { id: assignment.id },
  });
};
