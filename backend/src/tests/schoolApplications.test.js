import request from "supertest";
import prisma from "../config/prisma.js";
import { hashPassword } from "../utils/password.js";
import app from "../server.js";

const PASSWORD = "ApplicationTestPassword123!";
const SCHOOL_SLUG = "school-applications-test-school";

const SUPER_ADMIN_EMAIL = "platform-admin@applications.test.chiedza.local";
const ADMIN_EMAIL = "school-admin@applications.test.chiedza.local";
const TEACHER_EMAIL = "teacher@applications.test.chiedza.local";

const APPLICANT_EMAIL = "applicant@applications.test.chiedza.local";
const SECOND_APPLICANT_EMAIL = "second@applications.test.chiedza.local";

const applicationPayload = (overrides = {}) => ({
  schoolName: "Bright Future Academy",
  applicantFirstName: "Tariro",
  applicantLastName: "Moyo",
  applicantEmail: APPLICANT_EMAIL,
  applicantPhone: "+263771234567",
  schoolEmail: "office@brightfuture.example",
  schoolPhone: "+263242123456",
  address: "12 Example Road, Harare",
  ...overrides,
});

let superAdminToken;
let adminToken;
let teacherToken;
let pendingApplicationId;
let secondApplicationId;

const login = async (email) => {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password: PASSWORD });

  expect(response.status).toBe(200);
  return response.body.data.token;
};

const cleanup = async () => {
  const applications = await prisma.schoolApplication.findMany({
    where: {
      applicantEmail: {
        endsWith: "@applications.test.chiedza.local",
      },
    },
    select: { schoolId: true },
  });

  const createdSchoolIds = applications
    .map((application) => application.schoolId)
    .filter(Boolean);

  await prisma.schoolApplication.deleteMany({
    where: {
      applicantEmail: {
        endsWith: "@applications.test.chiedza.local",
      },
    },
  });

  if (createdSchoolIds.length) {
    await prisma.school.deleteMany({
      where: { id: { in: createdSchoolIds } },
    });
  }

  const fixtureSchool = await prisma.school.findUnique({
    where: { slug: SCHOOL_SLUG },
  });

  if (fixtureSchool) {
    await prisma.schoolMembership.deleteMany({
      where: { schoolId: fixtureSchool.id },
    });

    await prisma.school.delete({
      where: { id: fixtureSchool.id },
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

  const fixtureSchool = await prisma.school.create({
    data: {
      name: "School Applications Test School",
      slug: SCHOOL_SLUG,
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

  const schoolAdmin = await prisma.user.create({
    data: {
      firstName: "School",
      lastName: "Administrator",
      email: ADMIN_EMAIL,
      passwordHash,
    },
  });

  const teacher = await prisma.user.create({
    data: {
      firstName: "Classroom",
      lastName: "Teacher",
      email: TEACHER_EMAIL,
      passwordHash,
    },
  });

  await prisma.schoolMembership.createMany({
    data: [
      {
        schoolId: fixtureSchool.id,
        userId: schoolAdmin.id,
        role: "SCHOOL_ADMIN",
      },
      {
        schoolId: fixtureSchool.id,
        userId: teacher.id,
        role: "TEACHER",
      },
    ],
  });

  // The Super Admin intentionally has no school membership.
  expect(superAdmin.platformRole).toBe("SUPER_ADMIN");

  superAdminToken = await login(SUPER_ADMIN_EMAIL);
  adminToken = await login(ADMIN_EMAIL);
  teacherToken = await login(TEACHER_EMAIL);
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("School applications", () => {
  it("allows the public to submit an application without creating a school", async () => {
    const schoolCountBefore = await prisma.school.count({
      where: { name: "Bright Future Academy" },
    });

    const response = await request(app)
      .post("/api/school-applications")
      .send(applicationPayload());

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("PENDING");
    expect(response.body.data.applicantEmail).toBe(APPLICANT_EMAIL);

    pendingApplicationId = response.body.data.id;

    const schoolCountAfter = await prisma.school.count({
      where: { name: "Bright Future Academy" },
    });

    expect(schoolCountAfter).toBe(schoolCountBefore);

    const savedApplication = await prisma.schoolApplication.findUnique({
      where: { id: pendingApplicationId },
    });

    expect(savedApplication).toBeTruthy();
    expect(savedApplication.schoolId).toBeNull();
    expect(savedApplication.reviewedByUserId).toBeNull();
  });

  it("rejects attempts to submit privileged or review-controlled fields", async () => {
    const response = await request(app)
      .post("/api/school-applications")
      .send(
        applicationPayload({
          status: "APPROVED",
          schoolId: "attacker-supplied-school",
          reviewedByUserId: "attacker-supplied-user",
        }),
      );

    expect(response.status).toBe(400);
  });

  it("requires authentication to list applications", async () => {
    const response = await request(app)
      .get("/api/platform/applications");

    expect(response.status).toBe(401);
  });

  it("forbids a school administrator from accessing platform applications", async () => {
    const response = await request(app)
      .get("/api/platform/applications")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(403);
  });

  it("forbids a teacher from accessing platform applications", async () => {
    const response = await request(app)
      .get("/api/platform/applications")
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(response.status).toBe(403);
  });

  it("allows a Super Admin without a school membership to list pending applications", async () => {
    const response = await request(app)
      .get("/api/platform/applications?status=PENDING")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(
      response.body.data.some(
        (application) => application.id === pendingApplicationId,
      ),
    ).toBe(true);
  });

  it("approves an application and creates its school", async () => {
    const response = await request(app)
      .post(`/api/platform/applications/${pendingApplicationId}/approve`)
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("APPROVED");
    expect(response.body.data.school).toBeTruthy();
    expect(response.body.data.school.name).toBe("Bright Future Academy");
    expect(response.body.data.school.approvalStatus).toBe("APPROVED");
    expect(response.body.data.school.isActive).toBe(false);
    expect(response.body.data.reviewedBy.email).toBe(SUPER_ADMIN_EMAIL);

    const savedApplication = await prisma.schoolApplication.findUnique({
      where: { id: pendingApplicationId },
    });

    expect(savedApplication.status).toBe("APPROVED");
    expect(savedApplication.schoolId).toBe(response.body.data.school.id);
    expect(savedApplication.reviewedAt).toBeTruthy();

    const schoolId = response.body.data.school.id;

    expect(
      await prisma.schoolMembership.count({ where: { schoolId } }),
    ).toBe(0);

    expect(
      await prisma.schoolAdminInvitation.count({ where: { schoolId } }),
    ).toBe(0);
  });

  it("prevents an already approved application from being approved again", async () => {
    const response = await request(app)
      .post(`/api/platform/applications/${pendingApplicationId}/approve`)
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(response.status).toBe(409);
  });

  it("allows only one of two simultaneous approval requests to create a school", async () => {
    const submission = await request(app)
      .post("/api/school-applications")
      .send(
        applicationPayload({
          schoolName: "Concurrent Approval Academy",
          applicantEmail: "concurrent@applications.test.chiedza.local",
        }),
      );

    expect(submission.status).toBe(201);

    const applicationId = submission.body.data.id;

    const responses = await Promise.all([
      request(app)
        .post(`/api/platform/applications/${applicationId}/approve`)
        .set("Authorization", `Bearer ${superAdminToken}`),
      request(app)
        .post(`/api/platform/applications/${applicationId}/approve`)
        .set("Authorization", `Bearer ${superAdminToken}`),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      200,
      409,
    ]);

    const savedApplication = await prisma.schoolApplication.findUnique({
      where: { id: applicationId },
    });

    expect(savedApplication.status).toBe("APPROVED");
    expect(savedApplication.schoolId).toBeTruthy();

    expect(
      await prisma.school.count({
        where: { id: savedApplication.schoolId },
      }),
    ).toBe(1);

    expect(
      await prisma.schoolMembership.count({
        where: { schoolId: savedApplication.schoolId },
      }),
    ).toBe(0);

    expect(
      await prisma.schoolAdminInvitation.count({
        where: { schoolId: savedApplication.schoolId },
      }),
    ).toBe(0);
  });

  it("rejects an application with an audit reason and does not create a school", async () => {
    const submission = await request(app)
      .post("/api/school-applications")
      .send(
        applicationPayload({
          schoolName: "Second Example Academy",
          applicantEmail: SECOND_APPLICANT_EMAIL,
        }),
      );

    expect(submission.status).toBe(201);
    secondApplicationId = submission.body.data.id;

    const response = await request(app)
      .post(`/api/platform/applications/${secondApplicationId}/reject`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        reason: "The application details could not be verified.",
      });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("REJECTED");
    expect(response.body.data.rejectionReason).toBe(
      "The application details could not be verified.",
    );
    expect(response.body.data.reviewedBy.email).toBe(SUPER_ADMIN_EMAIL);

    const savedApplication = await prisma.schoolApplication.findUnique({
      where: { id: secondApplicationId },
    });

    expect(savedApplication.schoolId).toBeNull();
    expect(savedApplication.reviewedAt).toBeTruthy();

    const school = await prisma.school.findFirst({
      where: { name: "Second Example Academy" },
    });

    expect(school).toBeNull();
  });

  it("requires a reason when rejecting an application", async () => {
    const response = await request(app)
      .post(`/api/platform/applications/${secondApplicationId}/reject`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ reason: "No" });

    expect(response.status).toBe(400);
  });

  it("returns not found for an unknown application", async () => {
    const response = await request(app)
      .get("/api/platform/applications/does-not-exist")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(response.status).toBe(404);
  });
});
