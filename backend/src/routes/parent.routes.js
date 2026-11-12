import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requirePasswordChangeComplete } from "../middleware/requirePasswordChangeComplete.js";
import * as parentCtrl from "../controllers/parent.controller.js";

const router = Router();

router.use(authenticate, requirePasswordChangeComplete);

router.use((req, res, next) => {
  const isParent = (req.memberships || []).some(
    (membership) => membership.role === "PARENT"
  );

  if (!isParent) {
    return res.status(403).json({
      success: false,
      message: "Parent account access is required.",
    });
  }

  next();
});

router.get("/children", parentCtrl.listMyChildren);
router.get("/attendance", parentCtrl.listMyAttendance);
router.get("/assessments", parentCtrl.listMyAssessments);
router.get("/messages", parentCtrl.listMyMessages);

export default router;
