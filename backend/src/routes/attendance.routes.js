import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole, requireSchoolMembership } from "../middleware/authorize.js";
import { requireClassAccess } from "../middleware/requireClassAccess.js";
import { validate } from "../middleware/validate.js";
import { z } from "zod";
import * as attendanceCtrl from "../controllers/attendance.controller.js";

// Create Express router
const router = Router();

// Inline schema definitions (matching those in attendance.validators.js)
const idParam = z.string().min(1);
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.")
  .transform((val) => new Date(val + "T00:00:00.000Z"));

const schoolIdParamSchema = z.object({ params: z.object({ schoolId: idParam }) });
const schoolAndIdParamSchema = (idName) =>
  z.object({ params: z.object({ schoolId: idParam, [idName]: idParam }) });
const recordAttendanceSchema = z.object({
  params: z.object({ schoolId: idParam }),
  body: z.object({
    learnerId: idParam,
    date: dateString,
    status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
  }),
});

const listAttendanceQuerySchema = z.object({
  params: z.object({ schoolId: idParam }),
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    classId: idParam.optional(),
    learnerId: idParam.optional(),
  }),
});

const updateAttendanceSchema = z.object({
  params: z.object({ schoolId: idParam, attendanceId: idParam }),
  body: z.object({
    status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]).optional(),
    date: dateString.optional(),
  }).refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided.",
  }),
});

const createAssessmentSchema = z.object({
  params: z.object({ schoolId: idParam }),
  body: z.object({
    classId: idParam,
    title: z.string().min(1).max(120),
    description: z.string().max(500).optional().nullable(),
    date: dateString,
    maxScore: z.number().int().min(1).max(1000),
  }),
});

// Record attendance (admin or teacher with class access)
router.post(
  "/attendance",
  validate(recordAttendanceSchema),
  requireSchoolMembership,
  requireClassAccess,
  attendanceCtrl.recordAttendance
);

// List attendance with optional filters
router.get(
  "/attendance",
  validate(listAttendanceQuerySchema),
  requireSchoolMembership,
  attendanceCtrl.listAttendance
);

// Get attendance by learner
router.get(
  "/learners/:learnerId/attendance",
  validate(schoolAndIdParamSchema("learnerId")),
  requireSchoolMembership,
  attendanceCtrl.getAttendanceByLearner
);

// Get single attendance record
router.get(
  "/attendance/:attendanceId",
  validate(schoolAndIdParamSchema("attendanceId")),
  requireSchoolMembership,
  attendanceCtrl.getAttendanceById
);

// Update/correct attendance record
router.patch(
  "/attendance/:attendanceId",
  validate(updateAttendanceSchema),
  requireSchoolMembership,
  requireClassAccess,
  attendanceCtrl.updateAttendance
);

export default router;
