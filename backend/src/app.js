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
import draftRoutes from "./routes/draft.routes.js";
import parentRoutes from "./routes/parent.routes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Render runs the application behind one trusted reverse proxy.
app.set("trust proxy", 1);

app.use(helmet());

const allowedOrigins = (
  process.env.CLIENT_URL || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header (e.g. server-to-server).
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

const createLimiter = (max) =>
  process.env.NODE_ENV === "test"
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max,
        standardHeaders: true,
        legacyHeaders: false,
      });

const authLimiter = createLimiter(100);
const apiLimiter = createLimiter(300);
const bootstrapLimiter = createLimiter(10);

app.use("/api/health", healthRoutes);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/bootstrap", bootstrapLimiter, bootstrapRoutes);
app.use("/api/schools", apiLimiter, schoolsRoutes);
app.use("/api/parent", apiLimiter, parentRoutes);
app.use("/api/schools/:schoolId", apiLimiter, attendanceRoutes);
app.use("/api/schools/:schoolId", apiLimiter, assessmentRoutes);
app.use("/api/schools/:schoolId/early-warning", apiLimiter, earlyWarningRoutes);
app.use("/api/schools/:schoolId/drafts", apiLimiter, draftRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
