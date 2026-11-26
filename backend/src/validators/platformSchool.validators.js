import { z } from "zod";

const schoolId = z.string().trim().min(1);

export const listPlatformSchoolsSchema = z.object({
  query: z.object({
    search: z.string().trim().max(120).optional(),
    isActive: z.enum(["true", "false"]).optional(),
    approvalStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  }),
});

export const platformSchoolParamSchema = z.object({
  params: z.object({ schoolId }),
});

export const updatePlatformSchoolStatusSchema = z.object({
  params: z.object({ schoolId }),
  body: z.object({
    isActive: z.boolean(),
  }).strict(),
});
