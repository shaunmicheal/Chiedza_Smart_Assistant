import { Router } from "express";
import { validate } from "../middleware/validate.js";
import * as applicationController from "../controllers/schoolApplication.controller.js";
import {
  submitSchoolApplicationSchema,
} from "../validators/schoolApplication.validators.js";

const router = Router();

// Public route: submission creates an application only.
router.post(
  "/",
  validate(submitSchoolApplicationSchema),
  applicationController.submitApplication,
);

export default router;
