import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const bootstrapSchema = z.object({
  body: z.object({
    schoolName: z.string().min(2).max(120),
    schoolSlug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
    adminFirstName: z.string().min(1).max(60),
    adminLastName: z.string().min(1).max(60),
    adminEmail: z.string().email(),
    adminPassword: z.string().min(8).max(128),
  }),
});

export const schoolContextSchema = z.object({
  params: z.object({
    schoolId: z.string().min(1),
  }),
});
