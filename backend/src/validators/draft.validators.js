import { z } from "zod";

const draftIdParam = z.string().min(1);
const languageEnum = z.enum(["en", "sn"]);

// Schema for generating a new draft from an alert
// Both alertId and language are expected in the request body
const generateDraftSchema = z.object({
  body: z.object({
    alertId: draftIdParam,
    language: languageEnum,
  }),
});

// Schema for editing an existing draft
const editDraftSchema = z.object({
  params: z.object({
    draftId: draftIdParam,
  }),
  body: z.object({
    draftText: z.string().trim().min(1).optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  }),
});

// Schema for approving a draft
const approveDraftSchema = z.object({
  params: z.object({
    draftId: draftIdParam,
  }),
});

export { generateDraftSchema, editDraftSchema, approveDraftSchema };
