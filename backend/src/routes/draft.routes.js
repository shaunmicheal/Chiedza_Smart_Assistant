import { Router } from "express";

import { authenticate } from "../middleware/authenticate.js";
import {
  requireSchoolMembership,
  requireRole,
} from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";

import {
  generateDraftSchema,
  editDraftSchema,
  approveDraftSchema,
} from "../validators/draft.validators.js";

import {
  listDrafts,
  generateDraft,
  editDraft,
  approveDraft,
} from "../controllers/draft.controller.js";

const router = Router({ mergeParams: true });

// List drafts for school admins and teachers.
// The controller enforces school and assigned-class access.
router.get(
  "/",
  authenticate,
  requireSchoolMembership,
  requireRole("SCHOOL_ADMIN", "TEACHER"),
  listDrafts,
);

// Generate a draft from an alert
router.post(
  "/generate",
  authenticate,
  requireSchoolMembership,
  validate(generateDraftSchema),
  generateDraft,
);

// Edit an existing draft
router.patch(
  "/:draftId",
  authenticate,
  requireSchoolMembership,
  validate(editDraftSchema),
  editDraft,
);

// Approve a draft
router.patch(
  "/:draftId/approve",
  authenticate,
  requireSchoolMembership,
  validate(approveDraftSchema),
  approveDraft,
);

export default router;
