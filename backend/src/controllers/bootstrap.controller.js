import { bootstrapInitialAdmin } from "../services/auth.service.js";

export const bootstrapController = async (req, res, next) => {
  try {
    const provided = req.headers["x-bootstrap-secret"] || req.body?.bootstrapSecret;
    if (!process.env.BOOTSTRAP_SECRET || provided !== process.env.BOOTSTRAP_SECRET) {
      return res.status(403).json({
        success: false,
        message: "Invalid or missing bootstrap secret.",
      });
    }

    const result = await bootstrapInitialAdmin(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
