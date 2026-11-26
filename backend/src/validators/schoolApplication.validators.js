import { z } from "zod";

const idParam = z.string().trim().min(1);

const optionalEmail = z
  .string()
  .trim()
  .email()
  .max(254)
  .optional()
  .or(z.literal(""));

export const submitSchoolApplicationSchema = z.object({
  body: z.object({
    schoolName: z.string().trim().min(2).max(120),
    applicantFirstName: z.string().trim().min(1).max(60),
    applicantLastName: z.string().trim().min(1).max(60),
    applicantEmail: z.string().trim().email().max(254),
    applicantPhone: z.string().trim().max(30).optional(),
    schoolEmail: optionalEmail,
    schoolPhone: z.string().trim().max(30).optional(),
    address: z.string().trim().min(5).max(250),
  }).strict(),
});

export const listSchoolApplicationsSchema = z.object({
  query: z.object({
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  }),
});

export const schoolApplicationParamSchema = z.object({
  params: z.object({
    applicationId: idParam,
  }),
});

export const rejectSchoolApplicationSchema = z.object({
  params: z.object({
    applicationId: idParam,
  }),
  body: z.object({
    reason: z.string().trim().min(5).max(500),
  }).strict(),
});
