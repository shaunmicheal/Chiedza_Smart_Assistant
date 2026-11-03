import { Router } from "express";
import prisma from "../config/prisma.js";

const router = Router();

router.get("/", async (req, res) => {
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

export default router;
