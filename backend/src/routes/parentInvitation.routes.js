import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { activateParentInvitationSchema } from "../validators/school.validators.js";
import * as parentCtrl from "../controllers/parent.controller.js";

const router = Router();

router.post(
  "/activate",
  validate(activateParentInvitationSchema),
  parentCtrl.activateParentInvitation
);

export default router;
