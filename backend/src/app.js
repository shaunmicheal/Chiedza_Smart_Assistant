import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import bootstrapRoutes from "./routes/bootstrap.routes.js";
import schoolsRoutes from "./routes/schools.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import assessmentRoutes from "./routes/assessment.routes.js";
import earlyWarningRoutes from "./routes/earlyWarning.routes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

const authLimiter =
  process.env.NODE_ENV === "test"
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 20,
        standardHeaders: true,
        legacyHeaders: false,
      });

app.use("/api/health", healthRoutes);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/bootstrap", authLimiter, bootstrapRoutes);
app.use("/api/schools", authLimiter, schoolsRoutes);
app.use("/api/schools", authLimiter, attendanceRoutes);
app.use("/api/schools", authLimiter, assessmentRoutes);
app.use("/api/schools/:schoolId/early-warning", authLimiter, earlyWarningRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
