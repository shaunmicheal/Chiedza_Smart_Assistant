import { Router } from "express";
import { bootstrapController } from "../controllers/bootstrap.controller.js";
import { validate } from "../middleware/validate.js";
import { bootstrapSchema } from "../validators/auth.validators.js";

const router = Router();

router.post("/", validate(bootstrapSchema), bootstrapController);

export default router;
