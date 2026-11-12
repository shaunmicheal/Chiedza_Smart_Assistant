
import { Router } from "express";

import { authenticate } from "../middleware/authenticate.js";
import { requirePasswordChangeComplete } from "../middleware/requirePasswordChangeComplete.js";
import { requireSchoolMembership, requireRole } from "../middleware/authorize.js";
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

const router = Router();
router.use(authenticate, requirePasswordChangeComplete);

// List drafts for school admins and teachers.
// The controller enforces school and assigned-class access.
router.get(
  "/",
  requireSchoolMembership,
  requireRole("SCHOOL_ADMIN", "TEACHER"),
  listDrafts,
);

// Generate a draft from an alert
router.post(
  "/generate",
  requireSchoolMembership,
  validate(generateDraftSchema),
  generateDraft,
);

// Edit an existing draft
router.patch(
  "/:draftId",
  requireSchoolMembership,
  validate(editDraftSchema),
  editDraft,
);

// Approve a draft
router.patch(
  "/:draftId/approve",
  requireSchoolMembership,
  validate(approveDraftSchema),
  approveDraft,
);

export default router;
