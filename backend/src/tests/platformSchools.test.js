import request from "supertest";
import prisma from "../config/prisma.js";
import { hashPassword } from "../utils/password.js";
import app from "../server.js";

const PASSWORD = "PlatformSchoolsTestPassword123!";

const SCHOOL_SLUG = "platform-schools-test-school";
const PENDING_SLUG = "platform-schools-pending-school";

const SUPER_ADMIN_EMAIL = "platform-admin@schools.test.chiedza.local";
const ADMIN_EMAIL = "school-admin@schools.test.chiedza.local";
const TEACHER_EMAIL = "teacher@schools.test.chiedza.local";

let school;
let pendingSchool;
let superAdminToken;
let adminToken;
let teacherToken;

const login = async (email) => {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password: PASSWORD });

  expect(response.status).toBe(200);
  return response.body.data.token;
};

const cleanup = async () => {
  const existingSchools = await prisma.school.findMany({
    where: {
      slug: { in: [SCHOOL_SLUG, PENDING_SLUG] },
    },
    select: { id: true },
  });

  const schoolIds = existingSchools.map((item) => item.id);

  if (schoolIds.length) {
    await prisma.schoolMembership.deleteMany({
      where: { schoolId: { in: schoolIds } },
    });

    await prisma.school.deleteMany({
      where: { id: { in: schoolIds } },
    });
  }

  await prisma.user.deleteMany({
    where: {
      email: {
        in: [SUPER_ADMIN_EMAIL, ADMIN_EMAIL, TEACHER_EMAIL],
      },
    },
  });
};

beforeAll(async () => {
  await cleanup();

  const passwordHash = await hashPassword(PASSWORD);

  school = await prisma.school.create({
    data: {
      name: "Platform Directory Test School",
      slug: SCHOOL_SLUG,
      email: "office@platform-directory.example",
      address: "Test Road, Harare",
      approvalStatus: "APPROVED",
      isActive: true,
    },
  });

  pendingSchool = await prisma.school.create({
    data: {
      name: "Pending Platform Test School",
      slug: PENDING_SLUG,
      approvalStatus: "PENDING",
      isActive: false,
    },
  });

  const superAdmin = await prisma.user.create({
    data: {
      firstName: "Platform",
      lastName: "Administrator",
      email: SUPER_ADMIN_EMAIL,
      passwordHash,
      platformRole: "SUPER_ADMIN",
    },
  });

  const admin = await prisma.user.create({
    data: {
      firstName: "School",
      lastName: "Administrator",
      email: ADMIN_EMAIL,
      passwordHash,
    },
  });

  const teacher = await prisma.user.create({
    data: {
      firstName: "School",
      lastName: "Teacher",
      email: TEACHER_EMAIL,
      passwordHash,
    },
  });

  await prisma.schoolMembership.create({
    data: {
      schoolId: school.id,
      userId: admin.id,
      role: "SCHOOL_ADMIN",
    },
  });

  await prisma.schoolMembership.create({
    data: {
      schoolId: school.id,
      userId: teacher.id,
      role: "TEACHER",
    },
  });

  superAdminToken = await login(SUPER_ADMIN_EMAIL);
  adminToken = await login(ADMIN_EMAIL);
  teacherToken = await login(TEACHER_EMAIL);
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("Platform school management", () => {
  it("requires authentication to access the school directory", async () => {
    const response = await request(app).get("/api/platform/schools");

    expect(response.status).toBe(401);
  });

  it("denies school administrators access to platform school management", async () => {
    const response = await request(app)
      .get("/api/platform/schools")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(403);
  });

  it("denies teachers access to platform school management", async () => {
    const response = await request(app)
      .get("/api/platform/schools")
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(response.status).toBe(403);
  });

  it("allows Super Admin to list schools and view their counts", async () => {
    const response = await request(app)
      .get("/api/platform/schools")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(response.status).toBe(200);

    const result = response.body.data.find(
      (item) => item.id === school.id,
    );

    expect(result).toBeDefined();
    expect(result.approvalStatus).toBe("APPROVED");
    expect(result.isActive).toBe(true);
    expect(result.counts).toMatchObject({
      administrators: 1,
      teachers: 1,
      activeMembers: 2,
    });
  });

  it("supports school directory search and status filters", async () => {
    const response = await request(app)
      .get("/api/platform/schools?search=Platform%20Directory&isActive=true&approvalStatus=APPROVED")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(school.id);
  });

  it("returns school details including recent memberships", async () => {
    const response = await request(app)
      .get(`/api/platform/schools/${school.id}`)
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(school.id);
    expect(response.body.data.recentMemberships).toHaveLength(2);
    expect(response.body.data.counts.activeMembers).toBe(2);
  });

  it("returns 404 when a school does not exist", async () => {
    const response = await request(app)
      .get("/api/platform/schools/nonexistent-school-id")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(response.status).toBe(404);
  });

  it("suspends an approved school and blocks existing school-user tokens", async () => {
    const suspension = await request(app)
      .patch(`/api/platform/schools/${school.id}/status`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ isActive: false });

    expect(suspension.status).toBe(200);
    expect(suspension.body.data.isActive).toBe(false);

    // The existing token must no longer grant access after suspension.
    const schoolAccess = await request(app)
      .get(`/api/schools/${school.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(schoolAccess.status).toBe(403);

    // A fresh login must not return a membership for the suspended school.
    const freshLogin = await request(app)
      .post("/api/auth/login")
      .send({
        email: ADMIN_EMAIL,
        password: PASSWORD,
      });

    expect(freshLogin.status).toBe(200);
    expect(freshLogin.body.data.memberships).toHaveLength(0);
  });

  it("reactivates a suspended school and restores existing user access", async () => {
    const reactivation = await request(app)
      .patch(`/api/platform/schools/${school.id}/status`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ isActive: true });

    expect(reactivation.status).toBe(200);
    expect(reactivation.body.data.isActive).toBe(true);

    const schoolAccess = await request(app)
      .get(`/api/schools/${school.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(schoolAccess.status).toBe(200);
  });

  it("does not allow a pending school to be activated", async () => {
    const response = await request(app)
      .patch(`/api/platform/schools/${pendingSchool.id}/status`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ isActive: true });

    expect(response.status).toBe(409);

    const unchanged = await prisma.school.findUnique({
      where: { id: pendingSchool.id },
      select: { isActive: true, approvalStatus: true },
    });

    expect(unchanged).toMatchObject({
      isActive: false,
      approvalStatus: "PENDING",
    });
  });

  it("rejects an invalid school status payload", async () => {
    const response = await request(app)
      .patch(`/api/platform/schools/${school.id}/status`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ isActive: "false" });

    expect(response.status).toBe(400);
  });
});

describe("Platform overview", () => {
  it("requires authentication", async () => {
    const response = await request(app).get("/api/platform/overview");

    expect(response.status).toBe(401);
  });

  it("denies school administrators access", async () => {
    const response = await request(app)
      .get("/api/platform/overview")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(403);
  });

  it("returns platform-wide counts and recent applications to Super Admin", async () => {
    const response = await request(app)
      .get("/api/platform/overview")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const { counts, recentApplications } = response.body.data;

    expect(counts).toEqual({
      schools: expect.any(Number),
      activeSchools: expect.any(Number),
      pendingApplications: expect.any(Number),
      approvedApplications: expect.any(Number),
      rejectedApplications: expect.any(Number),
      learners: expect.any(Number),
    });

    expect(counts.schools).toBeGreaterThanOrEqual(2);
    expect(counts.activeSchools).toBeGreaterThanOrEqual(1);
    expect(recentApplications).toEqual(expect.any(Array));
    expect(recentApplications.length).toBeLessThanOrEqual(5);

    for (const application of recentApplications) {
      expect(application).toHaveProperty("schoolName");
      expect(application).toHaveProperty("applicantEmail");
      expect(application).toHaveProperty("status");
      expect(application).toHaveProperty("createdAt");
    }
  });
});
