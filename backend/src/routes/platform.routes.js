import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requirePasswordChangeComplete } from "../middleware/requirePasswordChangeComplete.js";
import { requirePlatformRole } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import * as applicationController from "../controllers/schoolApplication.controller.js";
import * as schoolController from "../controllers/platformSchool.controller.js";
import * as schoolAdminController from "../controllers/platformSchoolAdmin.controller.js";

import {
  listSchoolApplicationsSchema,
  schoolApplicationParamSchema,
  rejectSchoolApplicationSchema,
} from "../validators/schoolApplication.validators.js";

import {
  schoolAdminInvitationListSchema,
  createSchoolAdminInvitationSchema,
  revokeSchoolAdminInvitationSchema,
} from "../validators/schoolAdminInvitation.validators.js";

import {
  listPlatformSchoolsSchema,
  platformSchoolParamSchema,
  updatePlatformSchoolStatusSchema,
} from "../validators/platformSchool.validators.js";

const router = Router();

router.use(
  authenticate,
  requirePasswordChangeComplete,
  requirePlatformRole("SUPER_ADMIN"),
);

// Platform school directory and management.
router.get("/overview", schoolController.getOverview);

router.get(
  "/schools",
  validate(listPlatformSchoolsSchema),
  schoolController.listSchools,
);

router.get(
  "/schools/:schoolId",
  validate(platformSchoolParamSchema),
  schoolController.getSchool,
);

router.patch(
  "/schools/:schoolId/status",
  validate(updatePlatformSchoolStatusSchema),
  schoolController.updateSchoolStatus,
);

// School administrator management.
router.get(
  "/schools/:schoolId/administrators",
  validate(schoolAdminInvitationListSchema),
  schoolAdminController.listAdministrators,
);

router.post(
  "/schools/:schoolId/administrators/invitations",
  validate(createSchoolAdminInvitationSchema),
  schoolAdminController.createInvitation,
);

router.delete(
  "/schools/:schoolId/administrators/invitations/:invitationId",
  validate(revokeSchoolAdminInvitationSchema),
  schoolAdminController.revokeInvitation,
);

// School applications.
router.get(
  "/applications",
  validate(listSchoolApplicationsSchema),
  applicationController.listApplications,
);

router.get(
  "/applications/:applicationId",
  validate(schoolApplicationParamSchema),
  applicationController.getApplication,
);

router.post(
  "/applications/:applicationId/approve",
  validate(schoolApplicationParamSchema),
  applicationController.approveApplication,
);

router.post(
  "/applications/:applicationId/reject",
  validate(rejectSchoolApplicationSchema),
  applicationController.rejectApplication,
);

export default router;
