import prisma from "../config/prisma.js";

export const listClasses = async (schoolId, membershipId) => {
  const where = { schoolId };

  // Teachers can only see classes assigned to them.
  // School admins can see every class in their school.
  if (membershipId) {
    const assignments = await prisma.classTeacher.findMany({
      where: {
        schoolId,
        membershipId,
      },
      select: { classId: true },
    });

    const classIds = assignments.map((assignment) => assignment.classId);

    if (classIds.length === 0) {
      return [];
    }

    where.id = { in: classIds };
  }

  return prisma.schoolClass.findMany({
    where,
    orderBy: [{ academicYear: "desc" }, { name: "asc" }],
  });
};

export const createClass = async (schoolId, data) => {
  try {
    return await prisma.schoolClass.create({
      data: {
        schoolId,
        name: data.name,
        academicYear: data.academicYear,
        description: data.description ?? null,
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      const err = new Error(
        "A class with this name already exists for the academic year."
      );
      err.status = 409;
      throw err;
    }

    throw error;
  }
};

export const getClass = async (schoolId, classId) => {
  const schoolClass = await prisma.schoolClass.findFirst({
    where: { id: classId, schoolId },
  });

  if (!schoolClass) {
    const error = new Error("Class not found.");
    error.status = 404;
    throw error;
  }

  return schoolClass;
};

export const updateClass = async (schoolId, classId, data) => {
  const existing = await prisma.schoolClass.findFirst({
    where: { id: classId, schoolId },
  });

  if (!existing) {
    const error = new Error("Class not found.");
    error.status = 404;
    throw error;
  }

  try {
    return await prisma.schoolClass.update({
      where: { id: classId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.academicYear !== undefined && {
          academicYear: data.academicYear,
        }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      const err = new Error(
        "A class with this name already exists for the academic year."
      );
      err.status = 409;
      throw err;
    }

    throw error;
  }
};

export const removeClass = async (schoolId, classId) => {
  const existing = await prisma.schoolClass.findFirst({
    where: { id: classId, schoolId },
    include: { _count: { select: { learners: true } } },
  });

  if (!existing) {
    const error = new Error("Class not found.");
    error.status = 404;
    throw error;
  }

  if (existing._count.learners > 0) {
    const error = new Error(
      "Cannot delete a class that still has learners assigned."
    );
    error.status = 409;
    throw error;
  }

  await prisma.schoolClass.delete({
    where: { id: classId },
  });
};
