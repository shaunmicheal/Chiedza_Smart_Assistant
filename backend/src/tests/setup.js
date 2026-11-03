import "dotenv/config";

// Provide safe fallbacks for tests if env vars are absent.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-not-for-production";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
process.env.BOOTSTRAP_SECRET =
  process.env.BOOTSTRAP_SECRET || "test-bootstrap-secret-not-for-production";
process.env.CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
