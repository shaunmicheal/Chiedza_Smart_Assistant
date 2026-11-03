import { z } from "zod";

const idParam = z.string().min(1);

export const schoolIdParamSchema = z.object({
  params: z.object({ schoolId: idParam }),
});

export const schoolAndIdParamSchema = (idName) =>
  z.object({
    params: z.object({ schoolId: idParam, [idName]: idParam }),
  });

export const listSchoolsSchema = z.object({});

export const updateSchoolSchema = z.object({
  params: z.object({ schoolId: idParam }),
  body: z
    .object({
      name: z.string().min(2).max(120).optional(),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().max(30).optional(),
      address: z.string().max(200).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, {
      message: "At least one field must be provided.",
    }),
});

export const createTeacherSchema = z.object({
  params: z.object({ schoolId: idParam }),
  body: z.object({
    firstName: z.string().min(1).max(60),
    lastName: z.string().min(1).max(60),
    email: z.string().email(),
    password: z.string().min(8).max(128),
  }),
});

export const updateTeacherSchema = z.object({
  params: z.object({ schoolId: idParam, membershipId: idParam }),
  body: z
    .object({
      firstName: z.string().min(1).max(60).optional(),
      lastName: z.string().min(1).max(60).optional(),
      role: z.enum(["TEACHER", "SCHOOL_ADMIN"]).optional(),
    })
    .refine((v) => Object.keys(v).length > 0, {
      message: "At least one field must be provided.",
    }),
});

export const createClassSchema = z.object({
  params: z.object({ schoolId: idParam }),
  body: z.object({
    name: z.string().min(1).max(80),
    academicYear: z.string().min(1).max(20),
    description: z.string().max(200).optional(),
  }),
});

export const updateClassSchema = z.object({
  params: z.object({ schoolId: idParam, classId: idParam }),
  body: z
    .object({
      name: z.string().min(1).max(80).optional(),
      academicYear: z.string().min(1).max(20).optional(),
      description: z.string().max(200).optional().nullable(),
    })
    .refine((v) => Object.keys(v).length > 0, {
      message: "At least one field must be provided.",
    }),
});

export const createLearnerSchema = z.object({
  params: z.object({ schoolId: idParam }),
  body: z.object({
    firstName: z.string().min(1).max(60),
    lastName: z.string().min(1).max(60),
    dateOfBirth: z.string().optional(),
    admissionNumber: z.string().min(1).max(40),
    classId: idParam,
  }),
});

export const updateLearnerSchema = z.object({
  params: z.object({ schoolId: idParam, learnerId: idParam }),
  body: z
    .object({
      firstName: z.string().min(1).max(60).optional(),
      lastName: z.string().min(1).max(60).optional(),
      dateOfBirth: z.string().optional().nullable(),
      admissionNumber: z.string().min(1).max(40).optional(),
      classId: idParam.optional(),
      isActive: z.boolean().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, {
      message: "At least one field must be provided.",
    }),
});

export const listLearnersQuerySchema = z.object({
  params: z.object({ schoolId: idParam }),
  query: z.object({
    classId: idParam.optional(),
  }),
});
