import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requirePasswordChangeComplete } from "../middleware/requirePasswordChangeComplete.js";
import {
  requireRole,
  requireSchoolMembership,
} from "../middleware/authorize.js";
import { requireClassAccess } from "../middleware/requireClassAccess.js";
import { validate } from "../middleware/validate.js";
import { z } from "zod";
import * as assessmentCtrl from "../controllers/assessment.controller.js";

// Create Express router
const router = Router({ mergeParams: true });
router.use(authenticate, requirePasswordChangeComplete);

// Inline schema definitions
const idParam = z.string().min(1);
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.")
  .transform((val) => new Date(val + "T00:00:00.000Z"));

const schoolIdParamSchema = z.object({
  params: z.object({ schoolId: idParam }),
});
const schoolAndIdParamSchema = (idName) =>
  z.object({ params: z.object({ schoolId: idParam, [idName]: idParam }) });
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

const updateAssessmentSchema = z.object({
  params: z.object({ schoolId: idParam, assessmentId: idParam }),
  body: z
    .object({
      classId: idParam.optional(),
      title: z.string().min(1).max(120).optional(),
      description: z.string().max(500).optional().nullable(),
      date: dateString.optional(),
      maxScore: z.number().int().min(1).max(1000).optional(),
    })
    .refine((v) => Object.keys(v).length > 0, {
      message: "At least one field must be provided.",
    }),
});

const recordAssessmentResultSchema = z.object({
  params: z.object({ schoolId: idParam, assessmentId: idParam }),
  body: z.object({
    learnerId: idParam,
    score: z.number().int().min(0),
  }),
});

const updateAssessmentResultSchema = z.object({
  params: z.object({
    schoolId: idParam,
    assessmentId: idParam,
    resultId: idParam,
  }),
  body: z
    .object({
      score: z.number().int().min(0).optional(),
    })
    .refine((v) => Object.keys(v).length > 0, {
      message: "At least one field must be provided.",
    }),
});

const listAssessmentsQuerySchema = z.object({
  params: z.object({ schoolId: idParam }),
  query: z.object({
    classId: idParam.optional(),
  }),
});

const listAssessmentResultsQuerySchema = z.object({
  params: z.object({ schoolId: idParam, assessmentId: idParam }),
  query: z.object({
    learnerId: idParam.optional(),
  }),
});

const listLearnerAssessmentsQuerySchema = z.object({
  params: z.object({ schoolId: idParam, learnerId: idParam }),
  query: z.object({
    classId: idParam.optional(),
  }),
});

// Create assessment (admin or teacher with class access)
router.post(
  "/assessments",
  validate(createAssessmentSchema),
  requireSchoolMembership,
  requireClassAccess,
  assessmentCtrl.createAssessment,
);

// List assessments (optional classId filter)
router.get(
  "/assessments",
  validate(listAssessmentsQuerySchema),
  requireSchoolMembership,
  requireClassAccess,
  assessmentCtrl.listAssessments,
);

// Get assessment with results
router.get(
  "/assessments/:assessmentId",
  validate(schoolAndIdParamSchema("assessmentId")),
  requireSchoolMembership,
  requireClassAccess,
  assessmentCtrl.getAssessmentById,
);

// Update assessment (admin or teacher with class access)
router.patch(
  "/assessments/:assessmentId",
  validate(updateAssessmentSchema),
  requireSchoolMembership,
  requireClassAccess,
  assessmentCtrl.updateAssessment,
);

// Record learner result (admin or teacher with class access)
router.post(
  "/assessments/:assessmentId/results",
  validate(recordAssessmentResultSchema),
  requireSchoolMembership,
  requireClassAccess,
  assessmentCtrl.recordAssessmentResult,
);

// List results for an assessment
router.get(
  "/assessments/:assessmentId/results",
  validate(listAssessmentResultsQuerySchema),
  requireSchoolMembership,
  requireClassAccess,
  assessmentCtrl.listAssessmentResults,
);

// Get learner's assessment results
router.get(
  "/learners/:learnerId/assessments",
  validate(listLearnerAssessmentsQuerySchema),
  requireSchoolMembership,
  requireClassAccess,
  assessmentCtrl.getLearnerAssessments,
);

// Update/correct assessment result
router.patch(
  "/assessments/:assessmentId/results/:resultId",
  validate(updateAssessmentResultSchema),
  requireSchoolMembership,
  requireClassAccess,
  assessmentCtrl.updateAssessmentResult,
);

export default router;
