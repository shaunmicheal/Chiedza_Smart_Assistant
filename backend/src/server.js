import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import prisma from "./config/prisma.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Security and middleware
app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(morgan("dev"));

// Health check
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: "Chiedza API is running.",
      database: "Connected",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(503).json({
      success: false,
      message: "API is running, but the database is unavailable.",
      database: "Disconnected",
    });
  }
});

// Start server after connecting to the database
const startServer = async () => {
  try {
    await prisma.$connect();

    console.log("Database connected successfully.");

    app.listen(PORT, () => {
      console.log(`Chiedza API running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  console.log("Shutting down Chiedza API...");

  await prisma.$disconnect();

  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer();