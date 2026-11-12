import { Router } from "express";
import rateLimit from "express-rate-limit";
import { loginController, meController, logoutController, passwordChangeController } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requirePasswordChangeComplete } from "../middleware/requirePasswordChangeComplete.js";
import { requireRole, requireSchoolMembership } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { loginSchema, schoolContextSchema, passwordChangeSchema } from "../validators/auth.validators.js";

const router = Router();

const loginLimiter =
  process.env.NODE_ENV === "test"
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
      });

router.post("/login", loginLimiter, validate(loginSchema), loginController);

router.get("/me", authenticate, meController);

router.post("/logout", authenticate, logoutController);

router.post(
  "/password-change",
  authenticate,
  validate(passwordChangeSchema),
  passwordChangeController
);

// Foundation: verify school membership / isolation
router.get(
  "/schools/:schoolId/context",
  authenticate,
  requirePasswordChangeComplete,
  validate(schoolContextSchema),
  requireSchoolMembership,
  (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        schoolId: req.schoolId,
        role: req.role,
        membershipId: req.membership.id,
      },
    });
  }
);

// Foundation: role-based access check (admin only)
router.get("/admin-check", authenticate, requirePasswordChangeComplete, requireRole("SCHOOL_ADMIN"), (req, res) => {
  res.status(200).json({ success: true, message: "Admin access granted." });
});

export default router;
