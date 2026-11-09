import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

// Load .env.test from the project root using an absolute path derived from this file.
// src/tests/setup.js -> /home/micheal/Chiedza_Smart_Assistant/backend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..", "..");
const envTestPath = path.join(backendDir, ".env.test");

try {
  const envContent = readFileSync(envTestPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (key && value) {
      process.env[key] = value.replace(/^"|"$/g, "");
    }
  }
} catch (error) {
  if (error.code === "ENOENT") {
    throw new Error(
      "Test database configuration missing. Copy .env.example to .env.test and set DATABASE_URL and DIRECT_URL to the chiedza_test database."
    );
  }
  throw error;
}

process.env.NODE_ENV = "test";

// Require DATABASE_URL and DIRECT_URL to be set explicitly.
for (const envVar of ["DATABASE_URL", "DIRECT_URL"]) {
  const value = process.env[envVar];
  if (!value || value.trim() === "") {
    throw new Error(
      `Test database configuration error: ${envVar} is not set. Copy .env.example to .env.test and configure it.`
    );
  }
}

const databaseUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;

// Validate that both database URLs target the dedicated chiedza_test database.
// They must not point to production or any other database.
// Note: Neon pooler hosts (ep-*.neon.tech) always contain "old-tree" as a host
// substring but connect to their own database. Only the database NAME matters,
// not the pooler hostname. We validate the final path segment.
const disallowedPathSegments = [
  "prod",
  "main",
  "mydb",
  "app",
];

const validateDatabaseUrl = (label, url) => {
  if (!url) {
    throw new Error(`Test database configuration error: ${label} is empty.`);
  }
  const pathname = new URL(url).pathname;

  // Check for a final path segment that clearly indicates production or another DB
  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  if (lastSegment !== "chiedza_test") {
    throw new Error(
      `Test database configuration error: ${label} path (${pathname}) does not target the dedicated chiedza_test database. Tests must use the chiedza_test database.`
    );
  }
};

validateDatabaseUrl("DATABASE_URL", databaseUrl);
validateDatabaseUrl("DIRECT_URL", directUrl);

// Set the Prisma DATABASE_URL to the intended test connection.
process.env.DATABASE_URL = databaseUrl;

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-not-for-production";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
process.env.BOOTSTRAP_SECRET = process.env.BOOTSTRAP_SECRET || "test-bootstrap-secret-not-for-production";
process.env.CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
