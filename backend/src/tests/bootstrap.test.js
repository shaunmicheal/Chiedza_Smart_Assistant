import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../server.js";

describe("Retired bootstrap endpoint", () => {
  it("does not expose the legacy school administrator creation endpoint", async () => {
    const response = await request(app)
      .post("/api/bootstrap")
      .send({
        schoolName: "Test School",
        schoolSlug: "test-school",
        adminFirstName: "Test",
        adminLastName: "Admin",
        adminEmail: "admin@example.com",
        adminPassword: "A-Strong-Test-Password-123",
      });

    expect(response.status).toBe(404);
  });
});
