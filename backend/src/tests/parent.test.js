import request from "supertest";
import prisma from "../config/prisma.js";
import { hashPassword } from "../utils/password.js";
import app from "../server.js";

const PASSWORD = "password123";
const SCHOOL_SLUG = "parent-feature-test-school";

const EMAILS = {
  admin: "parent-test-admin@test.chiedza.local",
  teacher: "parent-test-teacher@test.chiedza.local",
  parent1: "parent-one@test.chiedza.local",
  parent2: "parent-two@test.chiedza.local",
};

let school;
let admin;
let teacher;
let class1;
let learners;
let adminToken;
let teacherToken;
let parent1;
let parent2;
let parent1Token;
let parent2Token;
let assessment;

const cleanup = async () => {
  const existingSchool = await prisma.school.findUnique({
    where: { slug: SCHOOL_SLUG },
  });

  if (existingSchool) {
    await prisma.parentCommunicationDraft.deleteMany({
      where: { schoolId: existingSchool.id },
    });

    await prisma.earlyWarningAlert.deleteMany({
      where: { schoolId: existingSchool.id },
    });

    await prisma.attendance.deleteMany({
      where: { schoolId: existingSchool.id },
    });

    await prisma.assessmentResult.deleteMany({
      where: { schoolId: existingSchool.id },
    });

    await prisma.assessment.deleteMany({
      where: { schoolId: existingSchool.id },
    });

    await prisma.parentLearner.deleteMany({
      where: { learner: { schoolId: existingSchool.id } },
    });

    await prisma.classTeacher.deleteMany({
      where: { schoolId: existingSchool.id },
    });

    await prisma.schoolMembership.deleteMany({
      where: { schoolId: existingSchool.id },
    });

    await prisma.learner.deleteMany({
      where: { schoolId: existingSchool.id },
    });

    await prisma.schoolClass.deleteMany({
      where: { schoolId: existingSchool.id },
    });

    await prisma.parentInvitation.deleteMany({
      where: { schoolId: existingSchool.id },
    });

    await prisma.school.delete({
      where: { id: existingSchool.id },
    });
  }

  await prisma.user.deleteMany({
    where: {
      email: { in: Object.values(EMAILS) },
    },
  });
};

const login = async (email, password = PASSWORD) => {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password });

  expect(response.status).toBe(200);
  return response.body.data.token;
};

const createParent = async (token, details) =>
  request(app)
    .post(`/api/schools/${school.id}/parents`)
    .set("Authorization", `Bearer ${token}`)
    .send(details);

beforeAll(async () => {
  await cleanup();

  const passwordHash = await hashPassword(PASSWORD);

  school = await prisma.school.create({
    data: {
      name: "Parent Feature Test School",
      slug: SCHOOL_SLUG,
    },
  });

  admin = await prisma.user.create({
    data: {
      firstName: "Test",
      lastName: "Admin",
      email: EMAILS.admin,
      passwordHash,
    },
  });

  teacher = await prisma.user.create({
    data: {
      firstName: "Test",
      lastName: "Teacher",
      email: EMAILS.teacher,
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

  class1 = await prisma.schoolClass.create({
    data: {
      schoolId: school.id,
      name: "ECD A",
      academicYear: "2026",
    },
  });

  learners = [];

  for (const [index, firstName] of ["Alice", "Brian", "Chipo"].entries()) {
    const learner = await prisma.learner.create({
      data: {
        schoolId: school.id,
        classId: class1.id,
        firstName,
        lastName: "Test",
        admissionNumber: `PARENT-${index + 1}`,
      },
    });

    learners.push(learner);
  }

  assessment = await prisma.assessment.create({
    data: {
      schoolId: school.id,
      classId: class1.id,
      title: "Numeracy Assessment",
      description: "Parent feature test",
      date: new Date("2026-10-15"),
      maxScore: 100,
    },
  });

  for (const [index, learner] of learners.entries()) {
    const date = new Date(`2026-10-${String(10 + index).padStart(2, "0")}T00:00:00.000Z`);

    await prisma.attendance.create({
      data: {
        schoolId: school.id,
        learnerId: learner.id,
        date,
        status: index === 1 ? "ABSENT" : "PRESENT",
        recordedById: admin.id,
      },
    });

    await prisma.assessmentResult.create({
      data: {
        schoolId: school.id,
        assessmentId: assessment.id,
        learnerId: learner.id,
        score: 70 + index * 5,
        recordedById: admin.id,
      },
    });

    const alert = await prisma.earlyWarningAlert.create({
      data: {
        schoolId: school.id,
        learnerId: learner.id,
        alertType: "REPEATED_ABSENCES",
        evidence: { source: "parent-test" },
      },
    });

    await prisma.parentCommunicationDraft.create({
      data: {
        schoolId: school.id,
        alertId: alert.id,
        userId: admin.id,
        language: "en",
        draftText: `Approved message for ${learner.firstName}`,
        evidenceSummary: "Test evidence",
        status: "APPROVED",
        approvedBy: admin.id,
        approvedAt: new Date(),
      },
    });
  }

  adminToken = await login(EMAILS.admin);
  teacherToken = await login(EMAILS.teacher);
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("Parent account management", () => {
  it("rejects unauthenticated parent creation", async () => {
    const response = await request(app)
      .post(`/api/schools/${school.id}/parents`)
      .send({
        firstName: "Alice",
        lastName: "Guardian",
        email: EMAILS.parent1,
        learnerId: learners[0].id,
        relationship: "Mother",
      });

    expect(response.status).toBe(401);
  });

  it("prevents a teacher from creating parent accounts", async () => {
    const response = await createParent(teacherToken, {
      firstName: "Alice",
      lastName: "Guardian",
      email: EMAILS.parent1,
      learnerId: learners[0].id,
      relationship: "Mother",
    });

    expect(response.status).toBe(403);
  });

  it("allows the school admin to create a parent and returns a temporary password once", async () => {
    const response = await createParent(adminToken, {
      firstName: "Alice",
      lastName: "Guardian",
      email: EMAILS.parent1,
      phone: "+263771000001",
      learnerId: learners[0].id,
      relationship: "Mother",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.accountCreated).toBe(true);
    expect(response.body.data.tempPassword).toBeTruthy();
    expect(response.body.data.parent.email).toBe(EMAILS.parent1);
    expect(response.body.data.parent.mustChangePassword).toBe(true);
    expect(response.body.data.parent.passwordHash).toBeUndefined();

    parent1 = response.body.data;

    parent1Token = await login(
      EMAILS.parent1,
      parent1.tempPassword
    );

    const blocked = await request(app)
      .get("/api/parent/children")
      .set("Authorization", `Bearer ${parent1Token}`);

    expect(blocked.status).toBe(403);
    expect(blocked.body.code || blocked.body.error?.code || blocked.body.message)
      .toBeTruthy();

    // Simulate the completed password change here. The password-change
    // endpoint itself is covered by the existing authentication test suite.
    await prisma.user.update({
      where: { email: EMAILS.parent1 },
      data: { mustChangePassword: false },
    });
  });

  it("links an additional child to an existing parent without issuing another password", async () => {
    const response = await createParent(adminToken, {
      firstName: "Alice",
      lastName: "Guardian",
      email: EMAILS.parent1,
      learnerId: learners[2].id,
      relationship: "Mother",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.accountCreated).toBe(false);
    expect(response.body.data.tempPassword).toBeNull();
    expect(response.body.data.parent.id).toBe(parent1.parent.id);
  });

  it("rejects a duplicate parent-child link", async () => {
    const response = await createParent(adminToken, {
      firstName: "Alice",
      lastName: "Guardian",
      email: EMAILS.parent1,
      learnerId: learners[0].id,
      relationship: "Mother",
    });

    expect(response.status).toBe(409);
  });

  it("rejects a learner from another school", async () => {
    const otherSchool = await prisma.school.create({
      data: {
        name: "Other Parent Test School",
        slug: "parent-feature-other-school",
      },
    });

    const otherClass = await prisma.schoolClass.create({
      data: {
        schoolId: otherSchool.id,
        name: "Grade 1",
        academicYear: "2026",
      },
    });

    const otherLearner = await prisma.learner.create({
      data: {
        schoolId: otherSchool.id,
        classId: otherClass.id,
        firstName: "Outside",
        lastName: "Learner",
        admissionNumber: "OUTSIDE-001",
      },
    });

    const response = await createParent(adminToken, {
      firstName: "Outside",
      lastName: "Guardian",
      email: "outside-parent@test.chiedza.local",
      learnerId: otherLearner.id,
      relationship: "Guardian",
    });

    expect(response.status).toBe(404);

    await prisma.learner.delete({ where: { id: otherLearner.id } });
    await prisma.schoolClass.delete({ where: { id: otherClass.id } });
    await prisma.school.delete({ where: { id: otherSchool.id } });
  });

  it("allows the admin to list parents and their linked children", async () => {
    const response = await request(app)
      .get(`/api/schools/${school.id}/parents`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].children).toHaveLength(2);
  });
});

describe("Parent portal data access", () => {
  it("creates a second parent account for another learner", async () => {
    const response = await createParent(adminToken, {
      firstName: "Brian",
      lastName: "Guardian",
      email: EMAILS.parent2,
      learnerId: learners[1].id,
      relationship: "Father",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.accountCreated).toBe(true);
    expect(response.body.data.tempPassword).toBeTruthy();

    parent2 = response.body.data;
    parent2Token = await login(EMAILS.parent2, parent2.tempPassword);

    await prisma.user.update({
      where: { email: EMAILS.parent2 },
      data: { mustChangePassword: false },
    });
  });

  it("returns only the authenticated parent's linked children", async () => {
    const firstParentResponse = await request(app)
      .get("/api/parent/children")
      .set("Authorization", `Bearer ${parent1Token}`);

    expect(firstParentResponse.status).toBe(200);
    expect(firstParentResponse.body.data).toHaveLength(2);

    const firstParentLearnerIds = firstParentResponse.body.data.map(
      (link) => link.learnerId
    );

    expect(firstParentLearnerIds).toContain(learners[0].id);
    expect(firstParentLearnerIds).toContain(learners[2].id);
    expect(firstParentLearnerIds).not.toContain(learners[1].id);

    const secondParentResponse = await request(app)
      .get("/api/parent/children")
      .set("Authorization", `Bearer ${parent2Token}`);

    expect(secondParentResponse.status).toBe(200);
    expect(secondParentResponse.body.data).toHaveLength(1);
    expect(secondParentResponse.body.data[0].learnerId).toBe(learners[1].id);
  });

  it("returns only attendance belonging to the parent's children", async () => {
    const response = await request(app)
      .get("/api/parent/attendance")
      .set("Authorization", `Bearer ${parent1Token}`);

    expect(response.status).toBe(200);

    const learnerIds = response.body.data.map((record) => record.learnerId);

    expect(learnerIds).toContain(learners[0].id);
    expect(learnerIds).toContain(learners[2].id);
    expect(learnerIds).not.toContain(learners[1].id);
  });

  it("returns only assessment results belonging to the parent's children", async () => {
    const response = await request(app)
      .get("/api/parent/assessments")
      .set("Authorization", `Bearer ${parent1Token}`);

    expect(response.status).toBe(200);

    const learnerIds = response.body.data.map((record) => record.learnerId);

    expect(learnerIds).toContain(learners[0].id);
    expect(learnerIds).toContain(learners[2].id);
    expect(learnerIds).not.toContain(learners[1].id);
  });

  it("returns only approved messages for the parent's children", async () => {
    const response = await request(app)
      .get("/api/parent/messages")
      .set("Authorization", `Bearer ${parent1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);

    const messageNames = response.body.data.map(
      (message) => message.alert.learner.firstName
    );

    expect(messageNames).toContain("Alice");
    expect(messageNames).toContain("Chipo");
    expect(messageNames).not.toContain("Brian");
    expect(response.body.data.every((message) => message.status === "APPROVED"))
      .toBe(true);
  });

  it("does not allow an admin or teacher to use parent portal endpoints", async () => {
    const adminResponse = await request(app)
      .get("/api/parent/children")
      .set("Authorization", `Bearer ${adminToken}`);

    const teacherResponse = await request(app)
      .get("/api/parent/children")
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(adminResponse.status).toBe(403);
    expect(teacherResponse.status).toBe(403);
  });
});
