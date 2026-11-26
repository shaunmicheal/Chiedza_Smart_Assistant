import prisma from "../src/config/prisma.js";
import { hashPassword } from "../src/utils/password.js";

const requiredVariables = [
  "SUPER_ADMIN_FIRST_NAME",
  "SUPER_ADMIN_LAST_NAME",
  "SUPER_ADMIN_EMAIL",
  "SUPER_ADMIN_PASSWORD",
];

const missingVariables = requiredVariables.filter(
  (name) => !process.env[name]?.trim(),
);

function getDatabaseTarget(key) {
  try {
    const value = process.env[key];
    if (!value) return null;

    const parsed = new URL(value);

    if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
      return null;
    }

    const host = parsed.hostname.toLowerCase();

    return {
      host: host.replace(/-pooler(?=\.)/, ""),
      database: decodeURIComponent(parsed.pathname.slice(1)),
      port: parsed.port || "5432",
    };
  } catch {
    return null;
  }
}

const databaseTargets = [
  getDatabaseTarget("DATABASE_URL"),
  getDatabaseTarget("DIRECT_URL"),
];

const databaseTargetsAreSafe =
  databaseTargets.every(Boolean) &&
  databaseTargets[0].database === databaseTargets[1].database &&
  databaseTargets[0].host === databaseTargets[1].host &&
  databaseTargets[0].port === databaseTargets[1].port &&
  !/test|local|dev/i.test(databaseTargets[0].database) &&
  !["localhost", "127.0.0.1", "::1"].includes(databaseTargets[0].host);

const databaseConfirmationMatches =
  databaseTargetsAreSafe &&
  process.env.CONFIRM_SUPER_ADMIN_DATABASE === databaseTargets[0].database;

if (
  process.env.NODE_ENV !== "production" ||
  process.env.ALLOW_SUPER_ADMIN_PROVISIONING !== "true" ||
  !databaseTargetsAreSafe ||
  !databaseConfirmationMatches
) {
  console.error(
    "Provisioning blocked. Production mode, explicit permission, matching database URLs, and exact database-name confirmation are required."
  );
  process.exitCode = 1;
} else if (missingVariables.length > 0) {
  console.error(
    `Missing required environment variables: ${missingVariables.join(", ")}`,
  );
  process.exitCode = 1;
} else {
  const firstName = process.env.SUPER_ADMIN_FIRST_NAME.trim();
  const lastName = process.env.SUPER_ADMIN_LAST_NAME.trim();
  const email = process.env.SUPER_ADMIN_EMAIL.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!emailIsValid) {
    console.error("The supplied email address is invalid.");
    process.exitCode = 1;
  } else if (password.length < 12) {
    console.error("The Super Admin password must contain at least 12 characters.");
    process.exitCode = 1;
  } else {
    try {
      const passwordHash = await hashPassword(password);

      const createdUser = await prisma.$transaction(async (tx) => {
        // Serialise provisioning attempts so two processes cannot both
        // create the initial platform administrator.
        await tx.$queryRaw`
          SELECT pg_advisory_xact_lock(72420261125::bigint)
        `;

        const existingSuperAdmin = await tx.user.findFirst({
          where: { platformRole: "SUPER_ADMIN" },
          select: { id: true },
        });

        if (existingSuperAdmin) {
          const error = new Error(
            "A Super Admin already exists. Provisioning has been refused.",
          );
          error.code = "SUPER_ADMIN_EXISTS";
          throw error;
        }

        const existingUser = await tx.user.findUnique({
          where: { email },
          select: { id: true },
        });

        if (existingUser) {
          const error = new Error(
            "A user with this email already exists. Use a different email.",
          );
          error.code = "EMAIL_EXISTS";
          throw error;
        }

        return tx.user.create({
          data: {
            firstName,
            lastName,
            email,
            passwordHash,
            platformRole: "SUPER_ADMIN",
            isActive: true,
            mustChangePassword: false,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            platformRole: true,
            createdAt: true,
          },
        });
      });

      console.log("Super Admin account created successfully.");
      console.log(
        JSON.stringify(
          {
            id: createdUser.id,
            name: `${createdUser.firstName} ${createdUser.lastName}`,
            email: createdUser.email,
            platformRole: createdUser.platformRole,
            createdAt: createdUser.createdAt,
            schoolMemberships: 0,
          },
          null,
          2,
        ),
      );
    } catch (error) {
      console.error(error.message || "Super Admin provisioning failed.");
      process.exitCode = 1;
    } finally {
      await prisma.$disconnect();
    }
  }
}
