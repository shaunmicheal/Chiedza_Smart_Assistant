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
    where: { schoolId, role: "TEACHER", isActive: true },
    include: teacherInclude,
    orderBy: { createdAt: "asc" },
  });

export const createTeacher = async (schoolId, data) => {
  const email = data.email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: {
      ...safeUserSelect,
      memberships: {
        select: {
          id: true,
          schoolId: true,
          role: true,
          isActive: true,
        },
      },
    },
  });

  let existingTeacherMembership = null;

  if (existingUser) {
    existingTeacherMembership = existingUser.memberships.find(
      (membership) =>
        membership.schoolId === schoolId && membership.role === "TEACHER"
    );

    if (existingTeacherMembership?.isActive) {
      throw makeError(
        "This teacher is already a member of this school.",
        409
      );
    }

    const incompatibleRoles = existingUser.memberships.filter(
      (membership) =>
        membership.role !== "TEACHER" && membership.role !== "SCHOOL_ADMIN"
    );

    if (incompatibleRoles.length > 0) {
      throw makeError(
        "An account with this email exists but has an incompatible role. Only TEACHER accounts can be linked to a school.",
        409
      );
    }

    const hasTeacherMembership = existingUser.memberships.some(
      (membership) => membership.role === "TEACHER"
    );

    if (!hasTeacherMembership) {
      throw makeError(
        "An account with this email already exists but is not a teacher account.",
        409
      );
    }
  }

  try {
    return await prisma.$transaction(async (tx) => {
      if (!existingUser) {
        const tempPassword = createTemporaryPassword();
        const passwordHash = await hashPassword(tempPassword);

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

        return {
          user,
          membership,
          accountCreated: true,
          tempPassword,
        };
      }

      let membership;

      if (existingTeacherMembership) {
        // Reactivate the original membership in this school.
        membership = await tx.schoolMembership.update({
          where: { id: existingTeacherMembership.id },
          data: { isActive: true },
          include: teacherInclude,
        });
      } else {
        // Enrol the existing teacher account in another school.
        membership = await tx.schoolMembership.create({
          data: {
            schoolId,
            userId: existingUser.id,
            role: "TEACHER",
          },
          include: teacherInclude,
        });
      }

      return {
        user: {
          id: existingUser.id,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          email: existingUser.email,
          phone: existingUser.phone,
          isActive: existingUser.isActive,
          mustChangePassword: existingUser.mustChangePassword,
        },
        membership,
        accountCreated: false,
      };
    }, { timeout: 15000 });
  } catch (error) {
    if (error.code === "P2002") {
      throw makeError("A user with this email already exists.", 409);
    }
    throw error;
  }
};

export const getTeacher = async (schoolId, membershipId) => {
  const membership = await prisma.schoolMembership.findFirst({
    where: { id: membershipId, schoolId, role: "TEACHER", isActive: true },
    include: teacherInclude,
  });

  if (!membership) {
    throw makeError("Teacher not found.", 404);
  }

  return membership;
};

export const updateTeacher = async (schoolId, membershipId, data) => {
  const membership = await prisma.schoolMembership.findFirst({
    where: { id: membershipId, schoolId, role: "TEACHER", isActive: true },
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
    where: { id: membershipId, schoolId, role: "TEACHER", isActive: true },
    select: { id: true },
  });

  if (!membership) {
    throw makeError("Teacher not found.", 404);
  }

  await prisma.$transaction([
    prisma.classTeacher.deleteMany({
      where: { schoolId, membershipId },
    }),
    prisma.schoolMembership.update({
      where: { id: membershipId },
      data: { isActive: false },
    }),
  ]);
};

export const resetTeacherPassword = async (schoolId, membershipId) => {
  // Verify the membership belongs to a TEACHER in the specified school
  const membership = await prisma.schoolMembership.findFirst({
    where: { id: membershipId, schoolId, role: "TEACHER", isActive: true },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          mustChangePassword: true,
        },
      },
    },
  });

  if (!membership) {
    throw makeError("Teacher not found.", 404);
  }

  // Generate a cryptographically secure temporary password
  const tempPassword = createTemporaryPassword();
  const passwordHash = await hashPassword(tempPassword);

  // Update the teacher's existing User record: passwordHash and mustChangePassword=true
  await prisma.user.update({
    where: { id: membership.userId },
    data: {
      passwordHash,
      mustChangePassword: true,
    },
  });

  // Return the temporary password only in the response to this authorized request
  return { tempPassword };
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
    where: { id: membershipId, schoolId, role: "TEACHER", isActive: true },
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
