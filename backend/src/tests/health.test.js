import request from "supertest";
import app from "../server.js";

describe("Health", () => {
  it("GET /api/health returns 200 and database connected", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.database).toBe("Connected");
  });
});
