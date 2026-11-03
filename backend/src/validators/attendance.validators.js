import { z } from "zod";

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


export const recordAssessmentResultSchema = z.object({
  params: z.object({ schoolId: idParam, assessmentId: idParam }),
  body: z.object({
    learnerId: idParam,
    score: z.number().int().min(0),
  }),
});

export const updateAssessmentResultSchema = z.object({
  params: z.object({ schoolId: idParam, assessmentId: idParam, resultId: idParam }),
  body: z.object({
    score: z.number().int().min(0).optional(),
  }).refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided.",
  }),
});

export const listAssessmentsQuerySchema = z.object({
  params: z.object({ schoolId: idParam }),
  query: z.object({
    classId: idParam.optional(),
  }),
});

export const listAssessmentResultsQuerySchema = z.object({
  params: z.object({ schoolId: idParam, assessmentId: idParam }),
  query: z.object({
    learnerId: idParam.optional(),
  }),
});

export const listLearnerAssessmentsQuerySchema = z.object({
  params: z.object({ schoolId: idParam, learnerId: idParam }),
  query: z.object({
    classId: idParam.optional(),
  }),
});

