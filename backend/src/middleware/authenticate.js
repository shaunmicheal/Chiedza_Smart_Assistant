import prisma from "../config/prisma.js";
import { verifyAccessToken } from "../utils/jwt.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const bearer = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    const cookieToken = req.cookies?.chiedza_token;
    const token = bearer || cookieToken;

    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      return res.status(401).json({ success: false, message: "Invalid or expired token." });
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
        memberships: {
          select: { id: true, schoolId: true, role: true, createdAt: true },
        },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "Account not found or inactive." });
    }

    req.user = user;
    req.memberships = user.memberships;
    next();
  } catch (error) {
    next(error);
  }
};
