import prisma from "../config/prisma.js";
import { verifyAccessToken } from "../utils/jwt.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isActive: true,
        mustChangePassword: true,
        platformRole: true,
        memberships: {
          where: {
            isActive: true,
            school: {
              is: {
                isActive: true,
                approvalStatus: "APPROVED",
              },
            },
          },
          select: {
            id: true,
            schoolId: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account not found or inactive.",
      });
    }

    req.user = user;
    req.memberships = user.memberships;
    next();
  } catch (error) {
    next(error);
  }
};
