import prisma from "../config/prisma.js";

const parseDateParam = (value) => {
  if (!value) return undefined;
  const d = new Date(value + "T00:00:00.000Z");
  if (Number.isNaN(d.getTime())) {
    const error = new Error("Invalid date format. Use YYYY-MM-DD.");
    error.status = 400;
    throw error;
  }
  return d;
};

export const createAssessment = async (schoolId, data, recordedById) => {
  const schoolClass = await prisma.schoolClass.findFirst({
    where: { id: data.classId, schoolId },
  });
  if (!schoolClass) {
    const error = new Error("Class not found in this school.");
    error.status = 404;
    throw error;
  }

  return prisma.assessment.create({
    data: {
      schoolId,
      classId: data.classId,
      title: data.title,
      description: data.description ?? null,
      date: data.date,
      maxScore: data.maxScore,
    },
    include: {
      schoolClass: { select: { id: true, name: true, academicYear: true } },
    },
  });
};

export const listAssessments = async (schoolId, { classId } = {}) => {
  const where = { schoolId };
  if (classId) where.classId = classId;

  return prisma.assessment.findMany({
    where,
    include: {
      schoolClass: { select: { id: true, name: true, academicYear: true } },
      _count: { select: { results: true } },
    },
    orderBy: [{ date: "desc" }, { title: "asc" }],
  });
};

export const getAssessmentById = async (schoolId, assessmentId) => {
  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, schoolId },
    include: {
      schoolClass: { select: { id: true, name: true, academicYear: true } },
      results: {
        include: {
          learner: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
          recordedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!assessment) {
    const error = new Error("Assessment not found.");
    error.status = 404;
    throw error;
  }
  return assessment;
};
export const updateAssessment = async (schoolId, assessmentId, data) => {
  const existing = await prisma.assessment.findFirst({
    where: { id: assessmentId, schoolId },
  });
  if (!existing) {
    const error = new Error("Assessment not found.");
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

  return prisma.assessment.update({
    where: { id: assessmentId },
    data: {
      ...(data.classId !== undefined && { classId: data.classId }),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.date !== undefined && { date: data.date }),
      ...(data.maxScore !== undefined && { maxScore: data.maxScore }),
    },
    include: {
      schoolClass: { select: { id: true, name: true, academicYear: true } },
    },
  });
};

export const recordAssessmentResult = async (schoolId, assessmentId, data, recordedById) => {
  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, schoolId },
    select: { id: true, maxScore: true, classId: true },
  });
  if (!assessment) {
    const error = new Error("Assessment not found.");
    error.status = 404;
    throw error;
  }

  if (data.score < 0 || data.score > assessment.maxScore) {
    const error = new Error("Score must be between 0 and " + assessment.maxScore + ".");
    error.status = 400;
    throw error;
  }

  const learner = await prisma.learner.findFirst({
    where: { id: data.learnerId, schoolId, classId: assessment.classId },
  });
  if (!learner) {
    const error = new Error("Learner not found in this class and school.");
    error.status = 404;
    throw error;
  }

  const existing = await prisma.assessmentResult.findFirst({
    where: { schoolId, assessmentId, learnerId: data.learnerId },
  });
  if (existing) {
    const error = new Error("Assessment result already recorded for this learner and assessment.");
    error.status = 409;
    throw error;
  }

  return prisma.assessmentResult.create({
    data: {
      schoolId,
      assessmentId,
      learnerId: data.learnerId,
      score: data.score,
      recordedById,
    },
    include: {
      learner: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
      recordedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });
};

export const listAssessmentResults = async (schoolId, assessmentId, { learnerId } = {}) => {
  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, schoolId },
    select: { id: true, maxScore: true, title: true, classId: true },
  });
  if (!assessment) {
    const error = new Error("Assessment not found.");
    error.status = 404;
    throw error;
  }

  const where = { schoolId, assessmentId };
  if (learnerId) where.learnerId = learnerId;

  return prisma.assessmentResult.findMany({
    where,
    include: {
      learner: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
      recordedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { learner: { lastName: "asc" } },
  });
};

export const getLearnerAssessments = async (schoolId, learnerId, { classId } = {}) => {
  const learner = await prisma.learner.findFirst({
    where: { id: learnerId, schoolId },
    select: { id: true, classId: true },
  });
  if (!learner) {
    const error = new Error("Learner not found in this school.");
    error.status = 404;
    throw error;
  }

  const where = { schoolId, learnerId };
  if (classId) where.assessment = { classId };

  return prisma.assessmentResult.findMany({
    where,
    include: {
      assessment: {
        select: { id: true, title: true, date: true, maxScore: true, classId: true },
        include: { schoolClass: { select: { id: true, name: true } } },
      },
    },
    orderBy: { assessment: { date: "desc" } },
  });
};

export const updateAssessmentResult = async (schoolId, assessmentId, resultId, data, updatedById) => {
  const existing = await prisma.assessmentResult.findFirst({
    where: { id: resultId, schoolId, assessmentId },
    include: { assessment: { select: { maxScore: true } } },
  });
  if (!existing) {
    const error = new Error("Assessment result not found.");
    error.status = 404;
    throw error;
  }

  if (data.score !== undefined) {
    if (data.score < 0 || data.score > existing.assessment.maxScore) {
      const error = new Error("Score must be between 0 and " + existing.assessment.maxScore + ".");
      error.status = 400;
      throw error;
    }
  }

  return prisma.assessmentResult.update({
    where: { id: resultId },
    data: {
      ...(data.score !== undefined && { score: data.score }),
      ...(updatedById && { updatedById }),
    },
    include: {
      learner: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
      recordedBy: { select: { id: true, firstName: true, lastName: true } },
      updatedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });
};

