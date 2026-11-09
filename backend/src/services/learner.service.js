import prisma from "../config/prisma.js";

const parseDate = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const error = new Error("Invalid dateOfBirth.");
    error.status = 400;
    throw error;
  }
  return d;
};

/**
 * Get the class IDs assigned to a teacher within a school.
 */
const getTeacherClassIds = async (schoolId, membershipId) => {
  const assignments = await prisma.classTeacher.findMany({
    where: {
      schoolId,
      membershipId,
    },
    select: {
      classId: true,
    },
  });

  return assignments.map((assignment) => assignment.classId);
};

export const listLearners = async (schoolId, { classId } = {}, membershipId) => {
  const where = { schoolId };

  if (classId) {
    where.classId = classId;
  } else if (membershipId) {
    // Teachers can only see learners in their assigned classes.
    const teacherClassIds = await getTeacherClassIds(schoolId, membershipId);

    if (teacherClassIds.length === 0) {
      return [];
    }

    where.classId = { in: teacherClassIds };
  }
  // Admins without a membership filter can see all school learners.

  return prisma.learner.findMany({
    where,
    include: { schoolClass: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
};

export const createLearner = async (schoolId, data) => {
  const schoolClass = await prisma.schoolClass.findFirst({
    where: { id: data.classId, schoolId },
  });
  if (!schoolClass) {
    const error = new Error("Class not found in this school.");
    error.status = 404;
    throw error;
  }

  try {
    return await prisma.learner.create({
      data: {
        schoolId,
        classId: data.classId,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: parseDate(data.dateOfBirth),
        admissionNumber: data.admissionNumber,
      },
      include: { schoolClass: true },
    });
  } catch (error) {
    if (error.code === "P2002") {
      const err = new Error("A learner with this admission number already exists in the school.");
      err.status = 409;
      throw err;
    }
    throw error;
  }
};

export const getLearner = async (schoolId, learnerId) => {
  const learner = await prisma.learner.findFirst({
    where: { id: learnerId, schoolId },
    include: { schoolClass: true },
  });
  if (!learner) {
    const error = new Error("Learner not found.");
    error.status = 404;
    throw error;
  }
  return learner;
};

export const updateLearner = async (schoolId, learnerId, data) => {
  const existing = await prisma.learner.findFirst({
    where: { id: learnerId, schoolId },
  });
  if (!existing) {
    const error = new Error("Learner not found.");
    error.status = 404;
    throw error;
  }

  if (data.classId) {
    const schoolClass = await prisma.schoolClass.findFirst({
      where: { id: data.classId, schoolId },
    });
    if (!schoolClass) {
      const error = new Error("Class not found in this school.");
      error.status = 404;
      throw error;
    }
  }

  try {
    return await prisma.learner.update({
      where: { id: learnerId },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.admissionNumber !== undefined && { admissionNumber: data.admissionNumber }),
        ...(data.classId !== undefined && { classId: data.classId }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.dateOfBirth !== undefined && { dateOfBirth: parseDate(data.dateOfBirth) }),
      },
      include: { schoolClass: true },
    });
  } catch (error) {
    if (error.code === "P2002") {
      const err = new Error("A learner with this admission number already exists in the school.");
      err.status = 409;
      throw err;
    }
    throw error;
  }
};

export const removeLearner = async (schoolId, learnerId) => {
  const existing = await prisma.learner.findFirst({
    where: { id: learnerId, schoolId },
  });
  if (!existing) {
    const error = new Error("Learner not found.");
    error.status = 404;
    throw error;
  }
  await prisma.learner.delete({ where: { id: learnerId } });
};
