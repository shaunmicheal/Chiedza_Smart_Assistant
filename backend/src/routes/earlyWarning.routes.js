import { Router } from "express";

import { authenticate } from "../middleware/authenticate.js";
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

const router = Router();

// Alert rule management: school administrators only.
router.post(
  "/rules",
  authenticate,
  requireSchoolMembership,
  requireRole("SCHOOL_ADMIN"),
  validate(createAlertRuleSchema),
  earlyWarningCtrl.createAlertRule,
);

router.get(
  "/rules",
  authenticate,
  requireSchoolMembership,
  requireRole("SCHOOL_ADMIN"),
  earlyWarningCtrl.listAlertRules,
);

router.patch(
  "/rules/:ruleId",
  authenticate,
  requireSchoolMembership,
  requireRole("SCHOOL_ADMIN"),
  validate(updateAlertRuleSchema),
  earlyWarningCtrl.updateAlertRule,
);

router.delete(
  "/rules/:ruleId",
  authenticate,
  requireSchoolMembership,
  requireRole("SCHOOL_ADMIN"),
  earlyWarningCtrl.deleteAlertRule,
);

// Alert viewing: permissions are enforced by the controller.
router.get(
  "/alerts",
  authenticate,
  requireSchoolMembership,
  validate(listAlertsQuerySchema),
  earlyWarningCtrl.listAlerts,
);

router.get(
  "/alerts/:alertId",
  authenticate,
  requireSchoolMembership,
  earlyWarningCtrl.getAlertDetail,
);

// Class access is checked against the actual alert/class records.
router.get(
  "/class-alerts",
  authenticate,
  requireSchoolMembership,
  earlyWarningCtrl.listClassAlerts,
);

router.patch(
  "/alerts/:alertId/acknowledge",
  authenticate,
  requireSchoolMembership,
  earlyWarningCtrl.acknowledgeAlert,
);

router.patch(
  "/alerts/:alertId/resolve",
  authenticate,
  requireSchoolMembership,
  earlyWarningCtrl.resolveAlert,
);

export default router;
