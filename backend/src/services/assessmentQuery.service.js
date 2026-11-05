import prisma from "../config/prisma.js";

export const getLearnerAssessments = async (
  schoolId,
  learnerId,
  { classId } = {}
) => {
  const learner = await prisma.learner.findFirst({
    where: { id: learnerId, schoolId },
    select: { id: true, classId: true },
  });

  if (!learner) {
    const error = new Error("Learner not found in this school.");
    error.status = 404;
    throw error;
  }

  const where = {
    schoolId,
    learnerId,
  };

  if (classId) {
    where.assessment = { classId };
  }

  return prisma.assessmentResult.findMany({
    where,
    select: {
      id: true,
      score: true,
      assessmentId: true,
      learnerId: true,
      assessment: {
        select: {
          id: true,
          title: true,
          date: true,
          maxScore: true,
          classId: true,
          schoolClass: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      assessment: { date: "desc" },
    },
  });
};
