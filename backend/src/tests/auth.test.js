import request from "supertest";
import prisma from "../config/prisma.js";
import { hashPassword } from "../utils/password.js";
import app from "../server.js";

const SCHOOL_SLUG = "auth-test-school";
const ADMIN_EMAIL = "auth-admin@test.chiedza.local";
const TEACHER_EMAIL = "auth-teacher@test.chiedza.local";
const TEMP_TEACHER_EMAIL = "auth-temp-teacher@test.chiedza.local";
const PASSWORD = "password123";

let school;
let adminUser;
let teacherUser;

const cleanup = async () => {
  const s = await prisma.school.findUnique({ where: { slug: SCHOOL_SLUG } });
  if (s) {
    await prisma.schoolMembership.deleteMany({ where: { schoolId: s.id } });
    await prisma.schoolClass.deleteMany({ where: { schoolId: s.id } });
    await prisma.learner.deleteMany({ where: { schoolId: s.id } });
    await prisma.parentInvitation.deleteMany({ where: { schoolId: s.id } });
    await prisma.school.delete({ where: { id: s.id } });
  }
  await prisma.user.deleteMany({
    where: { email: { in: [ADMIN_EMAIL, TEACHER_EMAIL, TEMP_TEACHER_EMAIL] } },
  });
};

beforeAll(async () => {
  await cleanup();
  const passwordHash = await hashPassword(PASSWORD);
  school = await prisma.school.create({
    data: { name: "Auth Test School", slug: SCHOOL_SLUG },
  });
  adminUser = await prisma.user.create({
    data: {
      firstName: "Admin",
      lastName: "User",
      email: ADMIN_EMAIL,
      passwordHash,
    },
  });
  teacherUser = await prisma.user.create({
    data: {
      firstName: "Teacher",
      lastName: "User",
      email: TEACHER_EMAIL,
      passwordHash,
    },
  });
  await prisma.schoolMembership.create({
    data: { schoolId: school.id, userId: adminUser.id, role: "SCHOOL_ADMIN" },
  });
  await prisma.schoolMembership.create({
    data: { schoolId: school.id, userId: teacherUser.id, role: "TEACHER" },
  });

  const temporaryTeacher = await prisma.user.create({
    data: {
      firstName: "Temporary",
      lastName: "Teacher",
      email: TEMP_TEACHER_EMAIL,
      passwordHash,
      mustChangePassword: true,
    },
  });

  await prisma.schoolMembership.create({
    data: {
      schoolId: school.id,
      userId: temporaryTeacher.id,
      role: "TEACHER",
    },
  });
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("Auth", () => {
  it("login fails with wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: ADMIN_EMAIL,
      password: "wrong",
    });
    expect(res.status).toBe(401);
  });

  it("login succeeds with valid credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: ADMIN_EMAIL,
      password: PASSWORD,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
  });

  it("GET /api/auth/me requires authentication", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("GET /api/auth/me returns user with valid token", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: ADMIN_EMAIL,
      password: PASSWORD,
    });
    const token = loginRes.body.data.token;
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(ADMIN_EMAIL);
    expect(res.body.data.memberships.length).toBe(1);
  });

  it("admin-check allows school admin", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: ADMIN_EMAIL,
      password: PASSWORD,
    });
    const token = loginRes.body.data.token;
    const res = await request(app)
      .get("/api/auth/admin-check")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("admin-check forbids teacher", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: TEACHER_EMAIL,
      password: PASSWORD,
    });
    const token = loginRes.body.data.token;
    const res = await request(app)
      .get("/api/auth/admin-check")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("school context allows member", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: TEACHER_EMAIL,
      password: PASSWORD,
    });
    const token = loginRes.body.data.token;
    const res = await request(app)
      .get(`/api/auth/schools/${school.id}/context`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("TEACHER");
  });

  it("school context denies non-member", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: TEACHER_EMAIL,
      password: PASSWORD,
    });
    const token = loginRes.body.data.token;
    const res = await request(app)
      .get("/api/auth/schools/does-not-exist/context")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("temporary-password teacher must change password before accessing school context", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: TEMP_TEACHER_EMAIL,
      password: PASSWORD,
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.mustChangePassword).toBe(true);

    const token = loginRes.body.data.token;

    const meBeforeChange = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meBeforeChange.status).toBe(200);
    expect(meBeforeChange.body.data.mustChangePassword).toBe(true);

    const blockedRes = await request(app)
      .get(`/api/auth/schools/${school.id}/context`)
      .set("Authorization", `Bearer ${token}`);

    expect(blockedRes.status).toBe(403);
    expect(blockedRes.body.code).toBe("PASSWORD_CHANGE_REQUIRED");

    const changeRes = await request(app)
      .post("/api/auth/password-change")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: PASSWORD,
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body.data.mustChangePassword).toBe(false);

    const meAfterChange = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meAfterChange.status).toBe(200);
    expect(meAfterChange.body.data.mustChangePassword).toBe(false);

    const allowedRes = await request(app)
      .get(`/api/auth/schools/${school.id}/context`)
      .set("Authorization", `Bearer ${token}`);

    expect(allowedRes.status).toBe(200);
    expect(allowedRes.body.data.role).toBe("TEACHER");
  });

  it("authenticated user can update their own profile", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: TEACHER_EMAIL,
      password: PASSWORD,
    });

    const token = loginRes.body.data.token;

    const updateRes = await request(app)
      .patch("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Updated",
        lastName: "Teacher",
        phone: "+263771234567",
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.firstName).toBe("Updated");
    expect(updateRes.body.data.lastName).toBe("Teacher");
    expect(updateRes.body.data.phone).toBe("+263771234567");
    expect(updateRes.body.data.email).toBe(TEACHER_EMAIL);

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.firstName).toBe("Updated");
    expect(meRes.body.data.phone).toBe("+263771234567");
  });

  it("profile update does not allow changing email or account role", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: TEACHER_EMAIL,
      password: PASSWORD,
    });

    const token = loginRes.body.data.token;

    const updateRes = await request(app)
      .patch("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Safe",
        email: "changed@example.com",
        role: "SCHOOL_ADMIN",
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.email).toBe(TEACHER_EMAIL);

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.body.data.email).toBe(TEACHER_EMAIL);
  });

  it("profile update requires authentication", async () => {
    const response = await request(app)
      .patch("/api/auth/profile")
      .send({ firstName: "Unauthorised" });

    expect(response.status).toBe(401);
  });

  it("logout succeeds with an authenticated Bearer token", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: ADMIN_EMAIL,
      password: PASSWORD,
    });
    const token = loginRes.body.data.token;
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
