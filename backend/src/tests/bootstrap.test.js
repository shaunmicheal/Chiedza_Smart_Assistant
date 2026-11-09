
import request from "supertest";
import { vi } from "vitest";
import prisma from "../config/prisma.js";
import app from "../server.js";

const TEST_SCHOOL_SLUG = "test-school-stage1";
const TEST_ADMIN_EMAIL = "stage1-admin@test.chiedza.local";

const cleanup = async () => {
  const school = await prisma.school.findUnique({
    where: { slug: TEST_SCHOOL_SLUG },
  });

  if (school) {
    await prisma.schoolMembership.deleteMany({
      where: { schoolId: school.id },
    });
    await prisma.schoolClass.deleteMany({
      where: { schoolId: school.id },
    });
    await prisma.learner.deleteMany({
      where: { schoolId: school.id },
    });
    await prisma.parentInvitation.deleteMany({
      where: { schoolId: school.id },
    });
    await prisma.school.delete({
      where: { id: school.id },
    });
  }

  await prisma.user.deleteMany({
    where: { email: TEST_ADMIN_EMAIL },
  });
};

beforeAll(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("Bootstrap", () => {
  it("rejects bootstrap without secret", async () => {
    const res = await request(app)
      .post("/api/bootstrap")
      .send({
        schoolName: "Test School",
        schoolSlug: TEST_SCHOOL_SLUG,
        adminFirstName: "Admin",
        adminLastName: "User",
        adminEmail: TEST_ADMIN_EMAIL,
        adminPassword: "password123",
      });

    expect(res.status).toBe(403);
  });

  it("creates initial school administrator with valid secret", async () => {
    const countSpy = vi
      .spyOn(prisma.schoolMembership, "count")
      .mockResolvedValueOnce(0);

    let res;

    try {
      res = await request(app)
        .post("/api/bootstrap")
        .set("x-bootstrap-secret", process.env.BOOTSTRAP_SECRET)
        .send({
          schoolName: "Test School",
          schoolSlug: TEST_SCHOOL_SLUG,
          adminFirstName: "Admin",
          adminLastName: "User",
          adminEmail: TEST_ADMIN_EMAIL,
          adminPassword: "password123",
        });
    } finally {
      countSpy.mockRestore();
    }

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe(TEST_ADMIN_EMAIL);

    const createdSchool = await prisma.school.findUnique({
      where: { slug: TEST_SCHOOL_SLUG },
    });

    expect(createdSchool).toBeTruthy();

    const createdMembership = await prisma.schoolMembership.findFirst({
      where: {
        schoolId: createdSchool.id,
        role: "SCHOOL_ADMIN",
      },
    });

    expect(createdMembership).toBeTruthy();
  });

  it("refuses a second bootstrap attempt", async () => {
    const countSpy = vi
      .spyOn(prisma.schoolMembership, "count")
      .mockResolvedValueOnce(1);

    let res;

    try {
      res = await request(app)
        .post("/api/bootstrap")
        .set("x-bootstrap-secret", process.env.BOOTSTRAP_SECRET)
        .send({
          schoolName: "Another School",
          schoolSlug: "another-slug",
          adminFirstName: "Admin2",
          adminLastName: "User2",
          adminEmail: "admin2@test.chiedza.local",
          adminPassword: "password123",
        });
    } finally {
      countSpy.mockRestore();
    }

    expect(res.status).toBe(409);
  });
});