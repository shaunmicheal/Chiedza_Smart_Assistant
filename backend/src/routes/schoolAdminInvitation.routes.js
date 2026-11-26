import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { activateSchoolAdminInvitationSchema } from "../validators/schoolAdminInvitation.validators.js";
import * as controller from "../controllers/schoolAdminInvitation.controller.js";

const router = Router();

router.post(
  "/activate",
  validate(activateSchoolAdminInvitationSchema),
  controller.activateInvitation,
);

export default router;
