import { z } from "zod";

const idParam = z.string().trim().min(1);

export const schoolAdminInvitationListSchema = z.object({
  params: z.object({ schoolId: idParam }),
});

export const createSchoolAdminInvitationSchema = z.object({
  params: z.object({ schoolId: idParam }),
  body: z.object({
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().min(1).max(60),
    email: z.string().trim().email().max(254),
  }).strict(),
});

export const revokeSchoolAdminInvitationSchema = z.object({
  params: z.object({
    schoolId: idParam,
    invitationId: idParam,
  }),
});

export const activateSchoolAdminInvitationSchema = z.object({
  body: z.object({
    token: z.string().trim().min(20).max(200),
    firstName: z.string().trim().min(1).max(60).optional(),
    lastName: z.string().trim().min(1).max(60).optional(),
    password: z.string().min(8).max(128).optional(),
    existingPassword: z.string().min(1).max(128).optional(),
  }).strict(),
});
