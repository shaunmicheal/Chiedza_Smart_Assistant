import prisma from "../config/prisma.js";

export const requireClassAccess = async (req, res, next) => {
  let classId =
    req.params?.classId ||
    req.body?.classId ||
    req.query?.classId;

  // If no classId directly provided, try to derive from learnerId in body
  if (!classId && req.body?.learnerId) {
    const learner = await prisma.learner.findFirst({
      where: { id: req.body.learnerId, schoolId: req.schoolId },
      select: { classId: true },
    });
    if (!learner) {
      return res.status(404).json({
        success: false,
        message: "Learner not found in this school.",
      });
    }
    classId = learner.classId;
  }

  if (!classId) {
    return res.status(400).json({
      success: false,
      message: "classId is required.",
    });
  }

  // SCHOOL_ADMIN can access any class in their school
  if (req.role === "SCHOOL_ADMIN") {
    const schoolClass = await prisma.schoolClass.findFirst({
      where: { id: classId, schoolId: req.schoolId },
      select: { id: true },
    });
    if (!schoolClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found in this school.",
      });
    }
    return next();
  }

  // TEACHER must be assigned to this class via ClassTeacher
  const membershipId = req.membership?.id;
  if (!membershipId) {
    return res.status(403).json({
      success: false,
      message: "No membership found for this user.",
    });
  }

  const classTeacher = await prisma.classTeacher.findFirst({
    where: {
      schoolId: req.schoolId,
      classId,
      membershipId,
    },
    select: { id: true },
  });

  if (!classTeacher) {
    return res.status(403).json({
      success: false,
      message: "You are not authorised to access this class.",
    });
  }

  next();
};
