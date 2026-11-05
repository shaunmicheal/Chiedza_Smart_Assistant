import { z } from "zod";

const idParam = z.string().min(1);

const alertConfigSchema = z.object({
  periodType: z.enum(["schoolDays", "calendarDays"]).optional(),
  absenceThreshold: z.number().int().min(1).optional(),
  observationPeriodDays: z.number().int().min(1).optional(),
  minAssessments: z.number().int().min(1).optional(),
  declinePercentage: z.number().int().min(1).max(100).optional(),
});

const createAlertRuleSchema = z.object({
  params: z.object({
    schoolId: idParam,
  }),
  body: z.object({
    name: z.string().trim().min(1).max(100),
    alertType: z.enum(["REPEATED_ABSENCES", "ACADEMIC_DECLINE"]),
    config: alertConfigSchema.optional(),
  }),
});

const updateAlertRuleSchema = z.object({
  params: z.object({
    schoolId: idParam,
    ruleId: idParam,
  }),
  body: z
    .object({
      alertType: z.enum(["REPEATED_ABSENCES", "ACADEMIC_DECLINE"]).optional(),
      config: alertConfigSchema
        .refine((config) => Object.keys(config).length > 0, {
          message: "Configuration must contain at least one setting.",
        })
        .optional(),
      isActive: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field must be provided.",
    }),
});

const listAlertsQuerySchema = z.object({
  params: z.object({
    schoolId: idParam,
  }),
  query: z.object({
    alertType: z.enum(["REPEATED_ABSENCES", "ACADEMIC_DECLINE"]).optional(),
    learnerId: idParam.optional(),
    classId: idParam.optional(),
    status: z.enum(["ACTIVE", "ACKNOWLEDGED", "RESOLVED"]).optional(),
  }),
});

export { createAlertRuleSchema, updateAlertRuleSchema, listAlertsQuerySchema };
