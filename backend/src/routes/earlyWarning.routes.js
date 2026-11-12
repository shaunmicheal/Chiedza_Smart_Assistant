import { Router } from "express";

import { authenticate } from "../middleware/authenticate.js";
import { requirePasswordChangeComplete } from "../middleware/requirePasswordChangeComplete.js";
import {
  requireRole,
  requireSchoolMembership,
} from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";

import {
  createAlertRuleSchema,
  updateAlertRuleSchema,
  listAlertsQuerySchema,
} from "../validators/earlyWarning.validators.js";

import * as earlyWarningCtrl from "../controllers/earlyWarning.controller.js";

const router = Router({ mergeParams: true });
router.use(authenticate, requirePasswordChangeComplete);

// Alert rule management: school administrators only.
router.post(
  "/rules",
  requireSchoolMembership,
  requireRole("SCHOOL_ADMIN"),
  validate(createAlertRuleSchema),
  earlyWarningCtrl.createAlertRule,
);

router.get(
  "/rules",
  requireSchoolMembership,
  requireRole("SCHOOL_ADMIN"),
  earlyWarningCtrl.listAlertRules,
);

router.patch(
  "/rules/:ruleId",
  requireSchoolMembership,
  requireRole("SCHOOL_ADMIN"),
  validate(updateAlertRuleSchema),
  earlyWarningCtrl.updateAlertRule,
);

router.delete(
  "/rules/:ruleId",
  requireSchoolMembership,
  requireRole("SCHOOL_ADMIN"),
  earlyWarningCtrl.deleteAlertRule,
);

// Alert viewing: permissions are enforced by the controller.
router.get(
  "/alerts",
  requireSchoolMembership,
  validate(listAlertsQuerySchema),
  earlyWarningCtrl.listAlerts,
);

router.get(
  "/alerts/:alertId",
  requireSchoolMembership,
  earlyWarningCtrl.getAlertDetail,
);

// Class access is checked against the actual alert/class records.
router.get(
  "/class-alerts",
  requireSchoolMembership,
  earlyWarningCtrl.listClassAlerts,
);

router.patch(
  "/alerts/:alertId/acknowledge",
  requireSchoolMembership,
  earlyWarningCtrl.acknowledgeAlert,
);

router.patch(
  "/alerts/:alertId/resolve",
  requireSchoolMembership,
  earlyWarningCtrl.resolveAlert,
);

export default router;
