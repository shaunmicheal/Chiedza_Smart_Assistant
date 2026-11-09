
import prisma from "../config/prisma.js";

export const requireClassAccess = async (req, res, next) => {
  try {
    // Assessment updates must verify access to both the existing class
    // and the proposed destination class.
    if (
      req.method === "PATCH" &&
      req.params?.assessmentId &&
      req.body?.classId
    ) {
      const assessment = await prisma.assessment.findFirst({
        where: {
          id: req.params.assessmentId,
          schoolId: req.schoolId,
        },
        select: { classId: true },
      });

      if (!assessment) {
        return res.status(404).json({
          success: false,
          message: "Assessment not found in this school.",
        });
      }

      const classIdsToCheck = [
        ...new Set([assessment.classId, req.body.classId]),
      ];

      for (const classIdToCheck of classIdsToCheck) {
        const schoolClass = await prisma.schoolClass.findFirst({
          where: {
            id: classIdToCheck,
            schoolId: req.schoolId,
          },
          select: { id: true },
        });

        if (!schoolClass) {
          return res.status(404).json({
            success: false,
            message: "Class not found in this school.",
          });
        }

        if (req.role === "SCHOOL_ADMIN") {
          continue;
        }

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
            classId: classIdToCheck,
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
      }

      return next();
    }

    let classId =
      req.params?.classId ||
      req.body?.classId ||
      req.query?.classId;

    // Derive class access from a learner supplied in the request body.
    if (!classId && req.body?.learnerId) {
      const learner = await prisma.learner.findFirst({
        where: {
          id: req.body.learnerId,
          schoolId: req.schoolId,
        },
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

    // Derive class access from a learner supplied in request params.
    if (!classId && req.params?.learnerId) {
      const learner = await prisma.learner.findFirst({
        where: {
          id: req.params.learnerId,
          schoolId: req.schoolId,
        },
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

    // Derive class access from an existing attendance record.
    if (!classId && req.params?.attendanceId) {
      const attendance = await prisma.attendance.findFirst({
        where: {
          id: req.params.attendanceId,
          schoolId: req.schoolId,
        },
        select: {
          learner: {
            select: { classId: true },
          },
        },
      });

      if (!attendance) {
        return res.status(404).json({
          success: false,
          message: "Attendance record not found in this school.",
        });
      }

      classId = attendance.learner.classId;
    }

    // Derive class access from an assessment lookup.
    if (!classId && req.params?.assessmentId) {
      const assessment = await prisma.assessment.findFirst({
        where: {
          id: req.params.assessmentId,
          schoolId: req.schoolId,
        },
        select: { classId: true },
      });

      if (!assessment) {
        return res.status(404).json({
          success: false,
          message: "Assessment not found in this school.",
        });
      }

      classId = assessment.classId;
    }

    // Derive class access from an assessment result lookup.
    if (!classId && req.params?.resultId) {
      const result = await prisma.assessmentResult.findFirst({
        where: {
          id: req.params.resultId,
          schoolId: req.schoolId,
        },
        select: {
          assessment: {
            select: { classId: true },
          },
        },
      });

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Assessment result not found in this school.",
        });
      }

      classId = result.assessment.classId;
    }

    // Individual-record routes must have a resolvable class scope.
    if (!classId && (req.method === "GET" || req.method === "POST")) {
      const isIndividualRecordRoute =
        req.params?.assessmentId ||
        req.params?.resultId ||
        req.params?.attendanceId ||
        req.params?.learnerId;

      if (isIndividualRecordRoute) {
        return res.status(400).json({
          success: false,
          message: "classId or resource class scope is required.",
        });
      }
    }

    // Verify access when a class scope is available.
    if (classId) {
      if (req.role === "SCHOOL_ADMIN") {
        const schoolClass = await prisma.schoolClass.findFirst({
          where: {
            id: classId,
            schoolId: req.schoolId,
          },
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

      return next();
    }

    // List routes without a class filter are filtered by their services.
    return next();
  } catch (error) {
    return next(error);
  }
};
