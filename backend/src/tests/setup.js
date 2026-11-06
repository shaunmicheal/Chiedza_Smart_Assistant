import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendDirectory = path.resolve(currentDirectory, "../..");

const testEnvPath = path.join(backendDirectory, ".env.test");

const loaded = dotenv.config({
  path: testEnvPath,
  override: true,
});

if (loaded.error) {
  throw new Error(
    "Test database configuration is missing. Create backend/.env.test before running tests."
  );
}

if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
  throw new Error(
    "Both DATABASE_URL and DIRECT_URL must be configured in backend/.env.test."
  );
}

const databaseUrls = [
  process.env.DATABASE_URL,
  process.env.DIRECT_URL,
];

for (const url of databaseUrls) {
  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("A test database connection URL is invalid.");
  }

  if (parsedUrl.protocol !== "postgresql:" && parsedUrl.protocol !== "postgres:") {
    throw new Error("Test database URLs must use PostgreSQL.");
  }

  if (!parsedUrl.pathname.includes("chiedza_test")) {
    throw new Error(
      "Safety check failed: both test database URLs must point to the chiedza_test database."
    );
  }
}

// Use the direct test database connection for Vitest.
const testDatabaseUrl = new URL(process.env.DIRECT_URL);
testDatabaseUrl.searchParams.set("pool_timeout", "30");
process.env.DATABASE_URL = testDatabaseUrl.toString();

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "chiedza-test-only-jwt-secret";
process.env.JWT_EXPIRES_IN = "1h";
process.env.BOOTSTRAP_SECRET = "chiedza-test-only-bootstrap-secret";
process.env.CLIENT_URL = "http://localhost:5173";
