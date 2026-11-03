import { Router } from "express";
import { loginController, meController, logoutController } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole, requireSchoolMembership } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { loginSchema, schoolContextSchema } from "../validators/auth.validators.js";

const router = Router();

router.post("/login", validate(loginSchema), loginController);

router.get("/me", authenticate, meController);

router.post("/logout", authenticate, logoutController);

// Foundation: verify school membership / isolation
router.get(
  "/schools/:schoolId/context",
  authenticate,
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
router.get("/admin-check", authenticate, requireRole("SCHOOL_ADMIN"), (req, res) => {
  res.status(200).json({ success: true, message: "Admin access granted." });
});

export default router;
