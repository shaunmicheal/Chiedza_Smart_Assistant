import { Router } from "express";

import { authenticate } from "../middleware/authenticate.js";
import { requirePasswordChangeComplete } from "../middleware/requirePasswordChangeComplete.js";
import {
  requireSchoolMembership,
  requireRole,
} from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";

import {
  createNotificationSchema,
  notificationIdParamSchema,
  notificationSchoolParamSchema,
} from "../validators/notification.validators.js";

import {
  getEligibleTeachers,
  sendNotification,
  getSchoolNotifications,
  getMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
} from "../controllers/notification.controller.js";

const router = Router({ mergeParams: true });

router.use(authenticate, requirePasswordChangeComplete);
router.use(requireSchoolMembership);

// Admin-only endpoints
router.get(
  "/recipients",
  requireRole("SCHOOL_ADMIN"),
  getEligibleTeachers
);

router.post(
  "/",
  requireRole("SCHOOL_ADMIN"),
  validate(createNotificationSchema),
  sendNotification
);

router.get(
  "/",
  requireRole("SCHOOL_ADMIN"),
  getSchoolNotifications
);

// Teacher-only endpoints
router.get(
  "/inbox",
  requireRole("TEACHER"),
  validate(notificationSchoolParamSchema),
  getMyNotifications
);

router.get(
  "/unread-count",
  requireRole("TEACHER"),
  validate(notificationSchoolParamSchema),
  getUnreadCount
);

router.patch(
  "/:notificationId/read",
  requireRole("TEACHER"),
  validate(notificationIdParamSchema),
  markNotificationAsRead
);

export default router;
